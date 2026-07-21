import { useEffect, useState } from 'react';
import type { Product, ShippingResponse } from '@shared/types';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

interface ItemRow {
  sku: string;
  quantity: string;
  weightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
}

const blankRow: ItemRow = { sku: '', quantity: '1', weightKg: '', lengthCm: '', widthCm: '', heightCm: '' };

export function Shipping() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [pincode, setPincode] = useState('110001');
  const [rows, setRows] = useState<ItemRow[]>([{ ...blankRow }]);
  const [result, setResult] = useState<ShippingResponse | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<{ products: Product[] }>('/products')
      .then((r) => setProducts(r.products))
      .catch(() => {});
  }, []);

  function update(i: number, patch: Partial<ItemRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  // Selecting a known product prefills its stored dimensions.
  function pick(i: number, sku: string) {
    const p = products.find((x) => x.sku === sku);
    if (!p) return update(i, { sku: '' });
    update(i, {
      sku,
      weightKg: p.weightKg?.toString() ?? '',
      lengthCm: p.lengthCm?.toString() ?? '',
      widthCm: p.widthCm?.toString() ?? '',
      heightCm: p.heightCm?.toString() ?? '',
    });
  }

  function addRow() {
    setRows((rs) => [...rs, { ...blankRow }]);
  }
  function removeRow(i: number) {
    setRows((rs) => (rs.length === 1 ? rs : rs.filter((_, idx) => idx !== i)));
  }

  async function calculate() {
    if (!/^\d{6}$/.test(pincode.trim())) return toast.error('Enter a valid 6-digit pincode.');
    const items = rows
      .map((r) => ({
        quantity: Number(r.quantity),
        weightKg: Number(r.weightKg),
        lengthCm: Number(r.lengthCm),
        widthCm: Number(r.widthCm),
        heightCm: Number(r.heightCm),
      }))
      .filter((r) => r.quantity > 0);

    if (items.length === 0) return toast.error('Add at least one item.');
    const bad = items.some(
      (r) => ![r.weightKg, r.lengthCm, r.widthCm, r.heightCm].every((n) => Number.isFinite(n) && n > 0),
    );
    if (bad) return toast.error('Each item needs a positive weight and L/W/H.');

    setBusy(true);
    try {
      const res = await api.post<ShippingResponse>('/calculate-shipping', {
        destinationPincode: pincode.trim(),
        items,
      });
      setResult(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Calculation failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 22, alignItems: 'start' }}>
      <div className="card" style={{ padding: 22 }}>
        <div className="section-head">
          <h2>Shipment</h2>
        </div>

        <label className="field" style={{ maxWidth: 220 }}>
          <span>Destination pincode</span>
          <input
            className="input mono"
            value={pincode}
            maxLength={6}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
            placeholder="110001"
          />
        </label>

        <p className="form-note" style={{ marginTop: 4 }}>
          Pick a product to prefill its dimensions, or enter them manually. Chargeable weight is the
          greater of actual and volumetric (L×W×H ÷ 5000).
        </p>

        {rows.map((row, i) => (
          <div key={i} className="card" style={{ padding: 14, marginBottom: 12, background: 'var(--surface-2)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <select className="input" value={row.sku} onChange={(e) => pick(i, e.target.value)}>
                <option value="">Custom item…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.sku}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
              <button className="btn btn-ghost btn-sm" onClick={() => removeRow(i)} disabled={rows.length === 1} aria-label="Remove item">
                ✕
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              <label className="field" style={{ margin: 0 }}>
                <span>Qty</span>
                <input className="input mono" type="number" min={1} value={row.quantity} onChange={(e) => update(i, { quantity: e.target.value })} />
              </label>
              <label className="field" style={{ margin: 0 }}>
                <span>kg</span>
                <input className="input mono" type="number" min={0} step="0.01" value={row.weightKg} onChange={(e) => update(i, { weightKg: e.target.value })} />
              </label>
              <label className="field" style={{ margin: 0 }}>
                <span>L cm</span>
                <input className="input mono" type="number" min={0} value={row.lengthCm} onChange={(e) => update(i, { lengthCm: e.target.value })} />
              </label>
              <label className="field" style={{ margin: 0 }}>
                <span>W cm</span>
                <input className="input mono" type="number" min={0} value={row.widthCm} onChange={(e) => update(i, { widthCm: e.target.value })} />
              </label>
              <label className="field" style={{ margin: 0 }}>
                <span>H cm</span>
                <input className="input mono" type="number" min={0} value={row.heightCm} onChange={(e) => update(i, { heightCm: e.target.value })} />
              </label>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn btn-ghost btn-sm" onClick={addRow}>
            + Add item
          </button>
          <button className="btn btn-primary" onClick={calculate} disabled={busy}>
            {busy ? 'Calculating…' : 'Calculate shipping'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div className="section-head">
          <h2>Quote</h2>
        </div>
        {!result ? (
          <div className="empty" style={{ padding: '32px 10px' }}>
            <div className="big">No quote yet</div>
            Enter a shipment and calculate to see the routing and cost.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
              <div className="mono" style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em' }}>
                {result.currency} {result.totalCost.toLocaleString()}
              </div>
              <span className="pill neutral">Zone {result.zone}</span>
            </div>

            <table className="table" style={{ marginBottom: 16 }}>
              <tbody>
                <tr>
                  <td className="muted">Actual weight</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{result.totalActualWeightKg} kg</td>
                </tr>
                <tr>
                  <td className="muted">Volumetric weight</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{result.totalVolumetricWeightKg} kg</td>
                </tr>
                <tr>
                  <td className="muted">Chargeable weight</td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{result.totalChargeableWeightKg} kg</td>
                </tr>
                <tr>
                  <td className="muted">Vehicle</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {result.vehicleCount} × {result.vehicle}
                  </td>
                </tr>
                <tr>
                  <td className="muted">Dispatch cost</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{result.currency} {result.vehicleDispatchCost}</td>
                </tr>
                <tr>
                  <td className="muted">Weight cost</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{result.currency} {result.weightCost}</td>
                </tr>
              </tbody>
            </table>

            <div className="callout accent">
              <strong>How this was calculated</strong>
              <p style={{ margin: '8px 0 0' }}>{result.justification}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
