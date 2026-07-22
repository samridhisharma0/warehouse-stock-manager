import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import type { Order, Product } from '@shared/types';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { EmptyState } from '../components/EmptyState';
import { MagneticButton, RippleButton } from '../components/ui/MotionElements';

interface Line {
  sku: string;
  quantity: string;
}

function statusPill(status: Order['status']) {
  const map = { Fulfilled: 'ok', 'Partially Fulfilled': 'warn', Pending: 'danger' } as const;
  return map[status];
}

const lineItemVariants = {
  initial: { opacity: 0, height: 0, y: -10 },
  animate: { opacity: 1, height: 'auto', y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, height: 0, y: -10, transition: { duration: 0.2 } },
};

const tableRowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.15 + i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function Orders() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<Line[]>([{ sku: '', quantity: '1' }]);
  const [submitting, setSubmitting] = useState(false);
  const [historyRef] = useAutoAnimate();

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div className="section-head">
          <h2>Create order</h2>
        </div>
        <p className="muted" style={{ marginTop: -6, marginBottom: 16 }}>
          Stock is deducted atomically. If you request more than is available, the rest is
          backordered rather than oversold.
        </p>

        <AnimatePresence mode="popLayout">
          {lines.map((line, i) => (
            <motion.div
              className="line-item-row"
              key={`line-${i}-${line.sku}`}
              variants={lineItemVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
            >
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
              <motion.button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => removeLine(i)}
                aria-label="Remove line"
                disabled={lines.length === 1}
                style={{ opacity: lines.length === 1 ? 0.3 : 1 }}
                whileHover={{ scale: lines.length === 1 ? 1 : 1.1 }}
                whileTap={{ scale: lines.length === 1 ? 1 : 0.9 }}
              >
                ✕
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
          <MagneticButton className="btn btn-ghost btn-sm" onClick={addLine}>
            + Add line
          </MagneticButton>
          <RippleButton
            className="btn btn-primary"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? 'Placing…' : 'Place order'}
          </RippleButton>
        </div>
      </div>

      <div className="card">
        <div className="section-head" style={{ padding: '20px 24px 0' }}>
          <h2>Order history</h2>
        </div>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8, width: i === 3 ? '60%' : '100%' }} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            subtitle="Placed orders and their fulfillment breakdown will appear here."
          />
        ) : (
          <div className="table-wrap">
            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Items (requested → fulfilled / backordered)</th>
                  <th>Status</th>
                  <th>Placed</th>
                </tr>
              </thead>
              <tbody ref={historyRef}>
                {orders.map((o, i) => (
                  <motion.tr
                    key={o.id}
                    custom={i}
                    variants={tableRowVariants}
                    initial="hidden"
                    animate="show"
                    whileHover={{ backgroundColor: 'var(--surface-hover)' }}
                  >
                    <td className="mono" style={{ fontWeight: 500, color: 'var(--ink)' }}>{o.reference}</td>
                    <td>
                      {o.items.map((it) => (
                        <div key={it.sku} className="mono" style={{ fontSize: 12.5, marginBottom: 2 }}>
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
                    <td className="muted mono" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
