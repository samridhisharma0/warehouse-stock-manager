import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'motion/react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import type { Product } from '@shared/types';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { EmptyState } from '../components/EmptyState';
import { stockLevel, stockLabel, stockPct } from '../lib/stock';
import { AnimatedCounter } from '../components/ui/MotionElements';
import { TiltCard, GlowCard, MagneticButton } from '../components/ui/MotionElements';
import { DashboardHero } from '../components/ui/DashboardHero';
import { useGsapParallax } from '../hooks/useReducedMotion';

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
  const [attentionRef] = useAutoAnimate();
  useGsapParallax('.metric', 0.08);

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
      <DashboardHero />

      <div className="grid-metrics">
        <TiltCard>
          <GlowCard className="card metric" glowColor="var(--accent)">
            <div className="label">Distinct SKUs</div>
            <AnimatedCounter value={stats.skuCount} className="value" />
          </GlowCard>
        </TiltCard>
        <TiltCard>
          <GlowCard className="card metric" glowColor="var(--ok)">
            <div className="label">Units on hand</div>
            <AnimatedCounter value={stats.totalUnits} className="value" />
          </GlowCard>
        </TiltCard>
        <TiltCard>
          <GlowCard className={`card metric${stats.lowStock.length ? ' warn' : ''}`} glowColor="var(--warn)">
            <div className="label">Low stock</div>
            <AnimatedCounter value={stats.lowStock.length} className={`value${stats.lowStock.length ? ' warn' : ''}`} />
          </GlowCard>
        </TiltCard>
        <TiltCard>
          <GlowCard className={`card metric${stats.outOfStock.length ? ' danger' : ''}`} glowColor="var(--danger)">
            <div className="label">Out of stock</div>
            <AnimatedCounter value={stats.outOfStock.length} className={`value${stats.outOfStock.length ? ' danger' : ''}`} />
          </GlowCard>
        </TiltCard>
      </div>

      <motion.div className="card" variants={fadeUpItem}>
        <div className="section-head" style={{ padding: '20px 24px 0' }}>
          <h2>Needs attention</h2>
          <Link to="/products" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
            <MagneticButton className="btn-ghost btn-sm">Manage inventory →</MagneticButton>
          </Link>
        </div>

        {attention.length === 0 ? (
          <EmptyState
            title="Everything is well stocked"
            subtitle="Nothing is at or below its low-stock threshold right now."
          />
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
              <tbody ref={attentionRef}>
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
