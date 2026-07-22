import { useState, type FormEvent, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AnimatedText, MagneticButton } from '../components/ui/MotionElements';
import { AuthSlider } from '../components/ui/AuthSlider';

const ParticlesBg = lazy(() =>
  import('../components/ParticlesBg').then((m) => ({ default: m.ParticlesBg }))
);

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await register(email, password);
      toast.success('Account created');
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <aside className="auth-aside" style={{ position: 'relative' }}>
        <Suspense fallback={null}>
          <ParticlesBg />
        </Suspense>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="kicker">// stockroom ops console</div>
          <div>
            <h2>Set up your console.</h2>
            <p>Create an account to manage inventory, orders and shipping. Takes ten seconds.</p>
          </div>
          <AuthSlider mode="register" />
          <div className="auth-metrics">
            <div className="m">
              <div className="n">JWT</div>
              <div className="l">secured</div>
            </div>
            <div className="m">
              <div className="n">bcrypt</div>
              <div className="l">hashed</div>
            </div>
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
          <motion.h1 variants={fadeUpItem}>
            <AnimatedText text="Create account" />
          </motion.h1>
          <motion.p className="lede" variants={fadeUpItem}>
            Your password is hashed with bcrypt before it is stored.
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
                autoComplete="new-password"
                required
              />
            </label>
            <label className="field">
              <span>Confirm password</span>
              <input
                className="input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            {error && <div className="field-error">{error}</div>}
            <MagneticButton
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 12, padding: '11px 16px' }}
              disabled={busy}
            >
              {busy ? 'Creating…' : 'Create account'}
            </MagneticButton>
          </motion.form>
          <motion.p className="muted" style={{ marginTop: 20, fontSize: 13 }} variants={fadeUpItem}>
            Already have an account? <Link to="/login">Sign in</Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
