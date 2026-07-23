import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { motion, type Variants } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { MagneticButton } from './ui/MotionElements';
import { useTheme } from '../context/ThemeContext';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', ico: '▤', eyebrow: 'Overview', title: 'Dashboard' },
  { to: '/products', label: 'Inventory', ico: '▦', eyebrow: 'Catalogue', title: 'Inventory' },
  { to: '/orders', label: 'Orders', ico: '⊞', eyebrow: 'Fulfilment', title: 'Orders' },
  { to: '/shipping', label: 'Shipping', ico: '◈', eyebrow: 'Rate engine', title: 'Shipping Calculator' },
];

const sidebarVariants: Variants = {
  hidden: { x: -20, opacity: 0 },
  show: { x: 0, opacity: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

const navItemVariants: Variants = {
  hidden: { x: -12, opacity: 0 },
  show: (i: number) => ({
    x: 0,
    opacity: 1,
    transition: { delay: 0.1 + i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  }),
};

const topbarVariants: Variants = {
  hidden: { y: -10, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { delay: 0.15, duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const current = NAV.find((n) => location.pathname.startsWith(n.to)) ?? NAV[0];
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 8);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="shell">
      <motion.aside
        className="sidebar"
        role="navigation"
        aria-label="Main navigation"
        variants={sidebarVariants}
        initial="hidden"
        animate="show"
      >
        <div className="brand">
          <motion.div
            className="glyph"
            aria-hidden="true"
            whileHover={{ scale: 1.05, rotate: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            S
          </motion.div>
          <div>
            <div className="name">Stockroom</div>
            <div className="sub">OPS CONSOLE</div>
          </div>
        </div>
        {NAV.map((n, i) => (
          <motion.div
            key={n.to}
            custom={i}
            variants={navItemVariants}
            initial="hidden"
            animate="show"
          >
            <NavLink
              to={n.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <motion.span
                className="ico"
                aria-hidden="true"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                {n.ico}
              </motion.span>
              {n.label}
            </NavLink>
          </motion.div>
        ))}
        <div className="sidebar-foot">
          <div className="who">{user?.email}</div>
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <MagneticButton
              className="btn btn-ghost btn-sm"
              style={{ flex: 1 }}
              onClick={toggle}
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </MagneticButton>
            <MagneticButton
              className="btn btn-ghost btn-sm"
              style={{ flex: 1 }}
              onClick={logout}
            >
              Sign out
            </MagneticButton>
          </div>
        </div>
      </motion.aside>

      <div className="main" ref={mainRef}>
        <motion.header
          className={`topbar${scrolled ? ' scrolled' : ''}`}
          variants={topbarVariants}
          initial="hidden"
          animate="show"
        >
          <div className="topbar-left">
            <div className="eyebrow">{current.eyebrow}</div>
            <motion.h1
              key={location.pathname}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {current.title}
            </motion.h1>
          </div>
        </motion.header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
