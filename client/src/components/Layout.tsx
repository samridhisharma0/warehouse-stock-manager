import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', ico: '▤', eyebrow: 'Overview', title: 'Dashboard' },
  { to: '/products', label: 'Inventory', ico: '▦', eyebrow: 'Catalogue', title: 'Inventory' },
  { to: '/orders', label: 'Orders', ico: '⊞', eyebrow: 'Fulfilment', title: 'Orders' },
  { to: '/shipping', label: 'Shipping', ico: '◈', eyebrow: 'Rate engine', title: 'Shipping calculator' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const current = NAV.find((n) => location.pathname.startsWith(n.to)) ?? NAV[0];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="glyph">S</div>
          <div>
            <div className="name">Stockroom</div>
            <div className="sub">OPS CONSOLE</div>
          </div>
        </div>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="ico">{n.ico}</span>
            {n.label}
          </NavLink>
        ))}
        <div className="sidebar-foot">
          <div className="who">{user?.email}</div>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">{current.eyebrow}</div>
            <h1>{current.title}</h1>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
