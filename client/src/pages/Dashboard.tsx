import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '@shared/types';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { stockLevel, stockLabel, stockPct } from '../lib/stock';

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

  if (loading) return <div className="spinner" style={{ margin: '40px auto' }} />;

  return (
    <>
      <div className="grid-metrics">
        <div className="card metric">
          <div className="label">Distinct SKUs</div>
          <div className="value">{stats.skuCount}</div>
        </div>
        <div className="card metric">
          <div className="label">Units on hand</div>
          <div className="value">{stats.totalUnits.toLocaleString()}</div>
        </div>
        <div className="card metric">
          <div className="label">Low stock</div>
          <div className={`value ${stats.lowStock.length ? 'warn' : ''}`}>{stats.lowStock.length}</div>
        </div>
        <div className="card metric">
          <div className="label">Out of stock</div>
          <div className={`value ${stats.outOfStock.length ? 'danger' : ''}`}>
            {stats.outOfStock.length}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-head" style={{ padding: '16px 20px 0' }}>
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
              {attention.map((p) => {
                const level = stockLevel(p);
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
