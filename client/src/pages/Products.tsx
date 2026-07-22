import { useEffect, useState, type FormEvent, useRef } from 'react';
import { motion } from 'motion/react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import type { Product } from '@shared/types';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { stockLevel, stockLabel, stockPct } from '../lib/stock';
import { MagneticButton, RippleButton } from '../components/ui/MotionElements';

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
  const searchRef = useRef<HTMLInputElement>(null);
  const [tbodyRef] = useAutoAnimate();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Keyboard shortcut: Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="section-head">
        <div style={{ position: 'relative', flex: '0 0 auto' }}>
          <input
            ref={searchRef}
            className="input"
            style={{ maxWidth: 360, paddingLeft: 36 }}
            placeholder="Search products… (⌘K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search products by name, SKU or category"
          />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--faint)',
              fontSize: 13,
              pointerEvents: 'none',
            }}
          >⌕</span>
        </div>
        <MagneticButton className="btn btn-primary" onClick={openCreate}>
          + New product
        </MagneticButton>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 24 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8, width: i === 5 ? '70%' : '100%' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query ? 'No results found' : 'No products yet'}
            subtitle={query ? 'Try a different search term.' : 'Create your first product to start tracking stock.'}
          />
        ) : (
          <div className="table-wrap">
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
              <tbody ref={tbodyRef}>
                {filtered.map((p, i) => {
                  const level = stockLevel(p);
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.03, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ backgroundColor: 'var(--surface-hover)' }}
                    >
                      <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.name}</td>
                      <td className="mono muted">{p.sku}</td>
                      <td>
                        <span className="pill neutral">{p.category || '—'}</span>
                      </td>
                      <td className="mono">
                        {p.quantity}
                        <span className="faint"> / {p.lowStockThreshold}</span>
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
                          <motion.button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEdit(p)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Edit
                          </motion.button>
                          <motion.button
                            className="btn btn-danger btn-sm"
                            onClick={() => onDelete(p)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Delete
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={editing ? `Edit ${editing.sku}` : 'New product'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <RippleButton
                className="btn btn-ghost"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </RippleButton>
              <RippleButton
                className="btn btn-primary"
                onClick={onSubmit}
                disabled={saving}
                type="submit"
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
              </RippleButton>
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
              Optional — physical attributes feed the shipping calculator.
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
    </motion.div>
  );
}
