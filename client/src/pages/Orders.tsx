import { useEffect, useState } from 'react';
import type { Order, Product } from '@shared/types';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

interface Line {
  sku: string;
  quantity: string;
}

function statusPill(status: Order['status']) {
  const map = { Fulfilled: 'ok', 'Partially Fulfilled': 'warn', Pending: 'danger' } as const;
  return map[status];
}

export function Orders() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<Line[]>([{ sku: '', quantity: '1' }]);
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, o] = await Promise.all([
        api.get<{ products: Product[] }>('/products'),
        api.get<{ orders: Order[] }>('/orders'),
      ]);
      setProducts(p.products);
      setOrders(o.orders);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((ls) => [...ls, { sku: '', quantity: '1' }]);
  }
  function removeLine(i: number) {
    setLines((ls) => (ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i)));
  }

  async function submit() {
    const items = lines
      .filter((l) => l.sku)
      .map((l) => ({ sku: l.sku, quantity: Number(l.quantity) }))
      .filter((l) => l.quantity > 0);

    if (items.length === 0) return toast.error('Add at least one product with a positive quantity.');

    setSubmitting(true);
    try {
      const res = await api.post<{ order: Order }>('/orders', { items });
      const o = res.order;
      if (o.status === 'Fulfilled') toast.success(`Order ${o.reference} fulfilled`);
      else if (o.status === 'Partially Fulfilled') toast.success(`Order ${o.reference} partially fulfilled — some items backordered`);
      else toast.error(`Order ${o.reference} could not be fulfilled — all items backordered`);
      setLines([{ sku: '', quantity: '1' }]);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Order failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="card" style={{ padding: 22, marginBottom: 22 }}>
        <div className="section-head">
          <h2>Create order</h2>
        </div>
        <p className="muted" style={{ marginTop: -6, marginBottom: 16 }}>
          Stock is deducted atomically. If you request more than is available, the rest is
          backordered rather than oversold.
        </p>

        {lines.map((line, i) => (
          <div className="line-item-row" key={i}>
            <select
              className="input"
              value={line.sku}
              onChange={(e) => updateLine(i, { sku: e.target.value })}
            >
              <option value="">Select a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.sku}>
                  {p.name} ({p.sku}) — {p.quantity} in stock
                </option>
              ))}
            </select>
            <input
              className="input mono"
              type="number"
              min={1}
              value={line.quantity}
              onChange={(e) => updateLine(i, { quantity: e.target.value })}
            />
            <button className="btn btn-ghost btn-sm" onClick={() => removeLine(i)} aria-label="Remove line" disabled={lines.length === 1}>
              ✕
            </button>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={addLine}>
            + Add line
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Placing…' : 'Place order'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-head" style={{ padding: '16px 20px 0' }}>
          <h2>Order history</h2>
        </div>
        {loading ? (
          <div className="spinner" style={{ margin: '40px auto' }} />
        ) : orders.length === 0 ? (
          <div className="empty">
            <div className="big">No orders yet</div>
            Placed orders and their fulfillment breakdown will appear here.
          </div>
        ) : (
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Items (requested → fulfilled / backordered)</th>
                <th>Status</th>
                <th>Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.reference}</td>
                  <td>
                    {o.items.map((it) => (
                      <div key={it.sku} className="mono" style={{ fontSize: 12.5 }}>
                        <span className="muted">{it.sku}</span> {it.requestedQty} →{' '}
                        <span style={{ color: 'var(--ok)' }}>{it.fulfilledQty}</span>
                        {it.backorderedQty > 0 && (
                          <>
                            {' '}
                            / <span style={{ color: 'var(--warn)' }}>{it.backorderedQty} bo</span>
                          </>
                        )}
                      </div>
                    ))}
                  </td>
                  <td>
                    <span className={`pill ${statusPill(o.status)}`}>
                      <span className="dot" />
                      {o.status}
                    </span>
                  </td>
                  <td className="muted mono" style={{ fontSize: 12.5 }}>
                    {new Date(o.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
