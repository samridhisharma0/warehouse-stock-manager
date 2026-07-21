import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      toast.success('Signed in');
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <div className="kicker">// stockroom ops console</div>
        <div>
          <h2>Every unit accounted for.</h2>
          <p>
            Track inventory, fulfil orders without overselling, and quote shipping across zones —
            all from one console.
          </p>
        </div>
        <div className="auth-metrics">
          <div className="m">
            <div className="n">3</div>
            <div className="l">tiers of logic</div>
          </div>
          <div className="m">
            <div className="n">0</div>
            <div className="l">oversells</div>
          </div>
          <div className="m">
            <div className="n">4</div>
            <div className="l">zones priced</div>
          </div>
        </div>
      </aside>

      <div className="auth-form-side">
        <motion.div
          className="auth-card"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.h1 variants={fadeUpItem}>Sign in</motion.h1>
          <motion.p className="lede" variants={fadeUpItem}>
            Welcome back. Use the demo account below or your own.
          </motion.p>
          <motion.form onSubmit={onSubmit} variants={fadeUpItem}>
            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error && <div className="field-error">{error}</div>}
            <motion.button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 12, padding: '11px 16px' }}
              disabled={busy}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </motion.button>
          </motion.form>
          <motion.p className="muted" style={{ marginTop: 20, fontSize: 13 }} variants={fadeUpItem}>
            No account? <Link to="/register">Create one</Link>
          </motion.p>
          <motion.div className="callout" style={{ marginTop: 18 }} variants={fadeUpItem}>
            <strong>Demo login</strong>
            <div className="mono" style={{ marginTop: 4 }}>
              demo@example.com / password123
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
