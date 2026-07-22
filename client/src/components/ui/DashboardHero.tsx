import { motion, type Variants } from 'motion/react';
import { ImageSlider, SlideContent, type Slide } from './ImageSlider';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/* ═══════════════════════════════════════════════════════
   DashboardHero — hero banner with feature slider
   ═══════════════════════════════════════════════════════ */

const heroSlides: Slide[] = [
  {
    id: 'inventory',
    content: (
      <SlideContent
        icon="▦"
        title="Real-time inventory"
        description="Track every SKU across locations with live stock health indicators and automatic low-stock alerts."
        stat={{ value: '100%', label: 'stock accuracy' }}
        gradient="linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.06) 100%)"
      />
    ),
  },
  {
    id: 'orders',
    content: (
      <SlideContent
        icon="⊞"
        title="Atomic order fulfilment"
        description="Stock is deducted atomically — overselling is impossible. Partial fills backorder the remainder."
        stat={{ value: '0', label: 'oversells ever' }}
        gradient="linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(59,130,246,0.06) 100%)"
      />
    ),
  },
  {
    id: 'shipping',
    content: (
      <SlideContent
        icon="◈"
        title="Zone-based shipping"
        description="Calculate per-shipment costs using volumetric weight, vehicle capacity, and destination pincode zones."
        stat={{ value: '4', label: 'zones priced' }}
        gradient="linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(239,68,68,0.06) 100%)"
      />
    ),
  },
  {
    id: 'analytics',
    content: (
      <SlideContent
        icon="▤"
        title="Ops dashboard"
        description="At-a-glance metrics for SKU count, stock levels, and items needing attention — updated in real time."
        stat={{ value: '3', label: 'tiers of logic' }}
        gradient="linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(236,72,153,0.06) 100%)"
      />
    ),
  },
];

const heroContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export function DashboardHero() {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="dashboard-hero"
      variants={heroContainer}
      initial="hidden"
      animate="show"
    >
      <div className="dashboard-hero__content">
        <motion.div className="dashboard-hero__text" variants={heroItem}>
          <div className="kicker">// ops overview</div>
          <h2 className="dashboard-hero__title">Stockroom at a glance</h2>
          <p className="dashboard-hero__subtitle">
            Your inventory, orders, and shipping — all in one place.
          </p>
        </motion.div>
        <motion.div className="dashboard-hero__slider" variants={heroItem}>
          <ImageSlider
            slides={heroSlides}
            interval={reduced ? 999999 : 6000}
            mode="zoom"
            showDots
            className="dashboard-hero__carousel"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
