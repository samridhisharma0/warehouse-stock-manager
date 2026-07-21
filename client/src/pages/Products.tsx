import { useEffect, useState, type FormEvent } from 'react';
import type { Product } from '@shared/types';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal';
import { stockLevel, stockLabel, stockPct } from '../lib/stock';

type Draft = {
  sku: string;
  name: string;
  category: string;
  quantity: string;
  lowStockThreshold: string;
  weightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
};

const emptyDraft: Draft = {
  sku: '',
  name: '',
  category: '',
  quantity: '0',
  lowStockThreshold: '0',
  weightKg: '',
  lengthCm: '',
  widthCm: '',
  heightCm: '',
};

function toDraft(p: Product): Draft {
  return {
    sku: p.sku,
    name: p.name,
    category: p.category,
    quantity: String(p.quantity),
    lowStockThreshold: String(p.lowStockThreshold),
    weightKg: p.weightKg?.toString() ?? '',
    lengthCm: p.lengthCm?.toString() ?? '',
    widthCm: p.widthCm?.toString() ?? '',
    heightCm: p.heightCm?.toString() ?? '',
  };
}

export function Products() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ products: Product[] }>('/products');
      setProducts(res.products);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setDraft(toDraft(p));
    setFormError('');
    setModalOpen(true);
  }

  function set<K extends keyof Draft>(key: K, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function validate(): string | null {
    if (!editing && !draft.sku.trim()) return 'SKU is required.';
    if (!draft.name.trim()) return 'Name is required.';
    const qty = Number(draft.quantity);
    if (!Number.isFinite(qty) || qty < 0) return 'Quantity must be zero or more.';
    const thr = Number(draft.lowStockThreshold);
    if (!Number.isFinite(thr) || thr < 0) return 'Low-stock threshold must be zero or more.';
    for (const [k, label] of [
      ['weightKg', 'Weight'],
      ['lengthCm', 'Length'],
      ['widthCm', 'Width'],
      ['heightCm', 'Height'],
    ] as const) {
      const v = draft[k];
      if (v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0)) {
        return `${label} must be a positive number.`;
      }
    }
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) return setFormError(err);
    setSaving(true);
    setFormError('');

    const payload: Record<string, unknown> = {
      name: draft.name.trim(),
      category: draft.category.trim(),
      quantity: Number(draft.quantity),
      lowStockThreshold: Number(draft.lowStockThreshold),
    };
    for (const k of ['weightKg', 'lengthCm', 'widthCm', 'heightCm'] as const) {
      if (draft[k] !== '') payload[k] = Number(draft[k]);
    }

    try {
      if (editing) {
        await api.put(`/products/${encodeURIComponent(editing.sku)}`, payload);
        toast.success(`Updated ${editing.sku}`);
      } else {
        await api.post('/products', { sku: draft.sku.trim(), ...payload });
        toast.success(`Created ${draft.sku.trim()}`);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(p: Product) {
    if (!confirm(`Delete ${p.name} (${p.sku})? This cannot be undone.`)) return;
    try {
      await api.del(`/products/${encodeURIComponent(p.sku)}`);
      toast.success(`Deleted ${p.sku}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const filtered = products.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="section-head">
        <input
          className="input"
          style={{ maxWidth: 300 }}
          placeholder="Search by name, SKU or category"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn btn-primary" onClick={openCreate}>
          + New product
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="spinner" style={{ margin: '40px auto' }} />
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="big">No products yet</div>
            Create your first product to start tracking stock.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>On hand</th>
                <th>Health</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const level = stockLevel(p);
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="mono muted">{p.sku}</td>
                    <td>
                      <span className="pill neutral">{p.category}</span>
                    </td>
                    <td className="mono">
                      {p.quantity}
                      <span className="muted"> / {p.lowStockThreshold}</span>
                    </td>
                    <td>
                      <div className={`stockbar ${level}`} style={{ ['--pct' as any]: `${stockPct(p)}%` }}>
                        <span />
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${level}`}>
                        <span className="dot" />
                        {stockLabel(level)}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => onDelete(p)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={editing ? `Edit ${editing.sku}` : 'New product'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={onSubmit} disabled={saving} type="submit">
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
              </button>
            </>
          }
        >
          <form onSubmit={onSubmit}>
            <div className="form-grid">
              <label className="field">
                <span>SKU</span>
                <input
                  className="input mono"
                  value={draft.sku}
                  onChange={(e) => set('sku', e.target.value)}
                  disabled={!!editing}
                  placeholder="KEYB-01"
                />
              </label>
              <label className="field">
                <span>Category</span>
                <input
                  className="input"
                  value={draft.category}
                  onChange={(e) => set('category', e.target.value)}
                  placeholder="Peripherals"
                />
              </label>
              <label className="field full">
                <span>Name</span>
                <input
                  className="input"
                  value={draft.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Mechanical Keyboard"
                />
              </label>
              <label className="field">
                <span>Quantity on hand</span>
                <input
                  className="input mono"
                  type="number"
                  min={0}
                  value={draft.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                />
              </label>
              <label className="field">
                <span>Low-stock threshold</span>
                <input
                  className="input mono"
                  type="number"
                  min={0}
                  value={draft.lowStockThreshold}
                  onChange={(e) => set('lowStockThreshold', e.target.value)}
                />
              </label>
            </div>

            <p className="form-note">
              Optional — physical attributes feed the shipping calculator (Tier 3).
            </p>
            <div className="form-grid">
              <label className="field">
                <span>Weight (kg)</span>
                <input className="input mono" type="number" min={0} step="0.01" value={draft.weightKg} onChange={(e) => set('weightKg', e.target.value)} />
              </label>
              <label className="field">
                <span>Length (cm)</span>
                <input className="input mono" type="number" min={0} value={draft.lengthCm} onChange={(e) => set('lengthCm', e.target.value)} />
              </label>
              <label className="field">
                <span>Width (cm)</span>
                <input className="input mono" type="number" min={0} value={draft.widthCm} onChange={(e) => set('widthCm', e.target.value)} />
              </label>
              <label className="field">
                <span>Height (cm)</span>
                <input className="input mono" type="number" min={0} value={draft.heightCm} onChange={(e) => set('heightCm', e.target.value)} />
              </label>
            </div>
            {formError && <div className="field-error">{formError}</div>}
          </form>
        </Modal>
      )}
    </>
  );
}
