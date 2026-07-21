import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

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
      <aside className="auth-aside">
        <div className="kicker">// stockroom ops console</div>
        <div>
          <h2>Set up your console.</h2>
          <p>Create an account to manage inventory, orders and shipping. Takes ten seconds.</p>
        </div>
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
      </aside>

      <div className="auth-form-side">
        <div className="auth-card">
          <h1>Create account</h1>
          <p className="lede">Your password is hashed with bcrypt before it is stored.</p>
          <form onSubmit={onSubmit}>
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
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={busy}>
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </form>
          <p className="muted" style={{ marginTop: 20, fontSize: 13 }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
