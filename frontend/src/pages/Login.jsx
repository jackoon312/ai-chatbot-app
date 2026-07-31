import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] text-[var(--text-primary)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo size={40} className="mx-auto mb-4" />
          <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Log in to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white py-2.5 text-sm font-medium transition"
          >
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <p className="text-sm text-[var(--text-secondary)] mt-6 text-center">
          Don't have an account?{' '}
          <Link to="/register" className="text-[var(--accent)] font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
