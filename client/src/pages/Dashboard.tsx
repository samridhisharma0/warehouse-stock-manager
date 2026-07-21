import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import type { Product } from '@shared/types';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { stockLevel, stockLabel, stockPct } from '../lib/stock';
import { useAnimatedValue } from '../hooks/useAnimatedValue';

function AnimatedMetric({ value, className }: { value: number; className?: string }) {
  const animated = useAnimatedValue(value, 800);
  return <div className={`value ${className ?? ''}`}>{animated}</div>;
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const tableRowVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.3 + i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  }),
};

export function Dashboard() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ products: Product[] }>('/products')
      .then((res) => setProducts(res.products))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  const stats = useMemo(() => {
    const totalUnits = products.reduce((s, p) => s + p.quantity, 0);
    const lowStock = products.filter((p) => stockLevel(p) === 'warn');
    const outOfStock = products.filter((p) => stockLevel(p) === 'danger');
    return { skuCount: products.length, totalUnits, lowStock, outOfStock };
  }, [products]);

  const attention = [...stats.outOfStock, ...stats.lowStock];

  if (loading) {
    return (
      <div>
        <div className="grid-metrics">
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="card metric"
              style={{ overflow: 'hidden' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <div className="skeleton" style={{ height: 12, width: 80, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 32, width: 60 }} />
            </motion.div>
          ))}
        </div>
        <motion.div
          className="card"
          style={{ padding: 24 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <div className="skeleton" style={{ height: 20, width: 150, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 40, width: '100%', marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 40, width: '100%', marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 40, width: '80%' }} />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <div className="grid-metrics">
        <motion.div className="card metric" variants={fadeUpItem} whileHover={{ scale: 1.02 }}>
          <div className="label">Distinct SKUs</div>
          <AnimatedMetric value={stats.skuCount} />
        </motion.div>
        <motion.div className="card metric" variants={fadeUpItem} whileHover={{ scale: 1.02 }}>
          <div className="label">Units on hand</div>
          <AnimatedMetric value={stats.totalUnits} />
        </motion.div>
        <motion.div className={`card metric${stats.lowStock.length ? ' warn' : ''}`} variants={fadeUpItem} whileHover={{ scale: 1.02 }}>
          <div className="label">Low stock</div>
          <AnimatedMetric value={stats.lowStock.length} className={stats.lowStock.length ? 'warn' : ''} />
        </motion.div>
        <motion.div className={`card metric${stats.outOfStock.length ? ' danger' : ''}`} variants={fadeUpItem} whileHover={{ scale: 1.02 }}>
          <div className="label">Out of stock</div>
          <AnimatedMetric value={stats.outOfStock.length} className={stats.outOfStock.length ? 'danger' : ''} />
        </motion.div>
      </div>

      <motion.div className="card" variants={fadeUpItem}>
        <div className="section-head" style={{ padding: '20px 24px 0' }}>
          <h2>Needs attention</h2>
          <Link to="/products" className="btn btn-ghost btn-sm">
            Manage inventory →
          </Link>
        </div>

        {attention.length === 0 ? (
          <div className="empty">
            <div className="big">Everything is well stocked</div>
            Nothing is at or below its low-stock threshold right now.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>On hand</th>
                  <th>Threshold</th>
                  <th>Health</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attention.map((p, i) => {
                  const level = stockLevel(p);
                  return (
                    <motion.tr
                      key={p.id}
                      custom={i}
                      variants={tableRowVariants}
                      initial="hidden"
                      animate="show"
                      whileHover={{ backgroundColor: 'var(--surface-hover)' }}
                    >
                      <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.name}</td>
                      <td className="mono muted">{p.sku}</td>
                      <td className="mono">{p.quantity}</td>
                      <td className="mono muted">{p.lowStockThreshold}</td>
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
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
