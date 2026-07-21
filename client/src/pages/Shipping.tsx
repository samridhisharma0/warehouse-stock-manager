import { useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
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

const itemVariants: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.2 } },
};

const quoteRowVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.2 + i * 0.08, duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  }),
};

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
    setResult(null);
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

  const quoteRows = result
    ? [
        { label: 'Actual weight', value: `${result.totalActualWeightKg} kg` },
        { label: 'Volumetric weight', value: `${result.totalVolumetricWeightKg} kg` },
        { label: 'Chargeable weight', value: `${result.totalChargeableWeightKg} kg`, bold: true },
        { label: 'Vehicle', value: `${result.vehicleCount} × ${result.vehicle}` },
        { label: 'Dispatch cost', value: `${result.currency} ${result.vehicleDispatchCost}` },
        { label: 'Weight cost', value: `${result.currency} ${result.weightCost}` },
      ]
    : [];

  return (
    <motion.div
      style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="card" style={{ padding: 24 }}>
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

        <AnimatePresence mode="popLayout">
          {rows.map((row, i) => (
            <motion.div
              key={`row-${i}`}
              variants={itemVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
              className="card"
              style={{
                padding: 16,
                marginBottom: 12,
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <select className="input" value={row.sku} onChange={(e) => pick(i, e.target.value)}>
                  <option value="">Custom item…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.sku}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
                <motion.button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                  aria-label="Remove item"
                  whileHover={{ scale: rows.length === 1 ? 1 : 1.1 }}
                  whileTap={{ scale: rows.length === 1 ? 1 : 0.9 }}
                >
                  ✕
                </motion.button>
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
            </motion.div>
          ))}
        </AnimatePresence>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <motion.button
            className="btn btn-ghost btn-sm"
            onClick={addRow}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            + Add item
          </motion.button>
          <motion.button
            className="btn btn-primary"
            onClick={calculate}
            disabled={busy}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {busy ? 'Calculating…' : 'Calculate shipping'}
          </motion.button>
        </div>
      </div>

      <div className="card" style={{ padding: 24, position: 'sticky', top: 80 }}>
        <div className="section-head">
          <h2>Quote</h2>
        </div>
        <AnimatePresence mode="wait">
          {busy ? (
            <motion.div
              key="loading"
              style={{ padding: '32px 0', textAlign: 'center' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="spinner spinner-lg" style={{ margin: '0 auto 12px' }} />
              <div className="muted" style={{ fontSize: 'var(--fs-sm)' }}>Calculating optimal route…</div>
            </motion.div>
          ) : !result ? (
            <motion.div
              key="empty"
              className="empty"
              style={{ padding: '32px 10px' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="big">No quote yet</div>
              Enter a shipment and calculate to see the routing and cost.
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <div className="mono" style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ink)' }}>
                  {result.currency} {result.totalCost.toLocaleString()}
                </div>
                <span className="pill neutral">Zone {result.zone}</span>
              </motion.div>

              <div className="table-wrap">
                <table className="table" style={{ marginBottom: 16 }}>
                  <tbody>
                    {quoteRows.map((row, i) => (
                      <motion.tr
                        key={row.label}
                        custom={i}
                        variants={quoteRowVariants}
                        initial="hidden"
                        animate="show"
                        whileHover={{ backgroundColor: 'var(--surface-hover)' }}
                      >
                        <td className="muted">{row.label}</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: row.bold ? 600 : 400, color: row.bold ? 'var(--ink)' : undefined }}>
                          {row.value}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <motion.div
                className="callout accent"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <strong>How this was calculated</strong>
                <p style={{ margin: '8px 0 0', lineHeight: 1.6 }}>{result.justification}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
