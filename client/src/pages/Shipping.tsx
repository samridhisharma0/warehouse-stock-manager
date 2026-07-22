import { useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import type { Product, ShippingResponse } from '@shared/types';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { MagneticButton, RippleButton, PulseRingLoader } from '../components/ui/MotionElements';

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

const ZONE_MATRIX = [
  { id: 'A', name: 'Metro / Local', rate: 30, pincodes: '11, 20, 40, 50, 56, 60, 70' },
  { id: 'B', name: 'Regional', rate: 50, pincodes: '30, 38, 39, 44, 62, 68, 74, 76, 78' },
  { id: 'C', name: 'National', rate: 80, pincodes: '13, 14, 15, 17–19, 24–26, 36–37, 80, 82, 84, 85' },
  { id: 'D', name: 'Remote', rate: 120, pincodes: 'All other pincodes' },
];

export function Shipping() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [originPincode, setOriginPincode] = useState('110001');
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
    if (!/^\d{6}$/.test(originPincode.trim())) return toast.error('Enter a valid 6-digit origin pincode.');
    if (!/^\d{6}$/.test(pincode.trim())) return toast.error('Enter a valid 6-digit destination pincode.');
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
        originPincode: originPincode.trim(),
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
        { label: 'Zone', value: `${result.zone}` },
        { label: 'Rate per kg', value: `${result.currency} ${result.zoneRatePerKg}` },
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
          <span>Origin pincode</span>
          <input
            className="input mono"
            value={originPincode}
            maxLength={6}
            onChange={(e) => setOriginPincode(e.target.value.replace(/\D/g, ''))}
            placeholder="110001"
          />
        </label>

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
          <MagneticButton className="btn btn-ghost btn-sm" onClick={addRow}>
            + Add item
          </MagneticButton>
          <RippleButton
            className="btn btn-primary"
            onClick={calculate}
            disabled={busy}
          >
            {busy ? 'Calculating…' : 'Calculate shipping'}
          </RippleButton>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Zone Rate Matrix */}
        <div className="card" style={{ padding: 24 }}>
          <div className="section-head">
            <h2>Zone rate matrix</h2>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Name</th>
                  <th>Rate/kg</th>
                  <th>Pincode prefixes</th>
                </tr>
              </thead>
              <tbody>
                {ZONE_MATRIX.map((z, i) => (
                  <motion.tr
                    key={z.id}
                    custom={i}
                    variants={quoteRowVariants}
                    initial="hidden"
                    animate="show"
                    whileHover={{ backgroundColor: 'var(--surface-hover)' }}
                    className={result?.zoneInfo.id === z.id ? 'zone-active' : ''}
                  >
                    <td>
                      <span className={`pill ${z.id === 'A' ? 'ok' : z.id === 'D' ? 'danger' : z.id === 'C' ? 'warn' : 'neutral'}`}>
                        {z.id}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{z.name}</td>
                    <td className="mono">₹{z.rate}</td>
                    <td className="mono muted" style={{ fontSize: 12 }}>{z.pincodes}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quote Result */}
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
                <PulseRingLoader size={56} />
                <div className="muted" style={{ fontSize: 'var(--fs-sm)', marginTop: 12 }}>Calculating optimal route…</div>
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

                {/* Alternatives */}
                {result.alternatives.length > 0 && (
                  <motion.div
                    style={{ marginBottom: 16 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  >
                    <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
                      Vehicle alternatives considered
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {/* Cheapest option */}
                      <div className="vehicle-option vehicle-option--best">
                        <span className="pill ok" style={{ fontSize: 10 }}>Best</span>
                        <span className="mono" style={{ fontWeight: 600 }}>{result.cheapestOption.vehicleCount} × {result.cheapestOption.vehicle}</span>
                        <span className="mono" style={{ marginLeft: 'auto', color: 'var(--ok)' }}>
                          {result.currency} {result.cheapestOption.totalCost.toLocaleString()}
                        </span>
                      </div>
                      {/* Other options */}
                      {result.alternatives.map((alt) => (
                        <div key={`${alt.vehicle}-${alt.vehicleCount}`} className="vehicle-option">
                          <span style={{ width: 36 }} />
                          <span className="mono">{alt.vehicleCount} × {alt.vehicle}</span>
                          <span className="mono muted" style={{ marginLeft: 'auto' }}>
                            {result.currency} {alt.totalCost.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

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
      </div>
    </motion.div>
  );
}
