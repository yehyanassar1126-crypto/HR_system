import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isDemoMode } from '../../supabaseClient';
import { Lock, User, Factory } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError('Please fill in all fields'); return; }
    setError('');
    setLoading(true);
    const result = await login(username, password);
    if (!result.success) setError(result.error);
    setLoading(false);
  };

  return (
    <div className="login-wrapper">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <Factory size={30} color="white" />
          </div>
          <h1>Smart Factory</h1>
          <p>HR & Workforce Management System</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="form-input-wrapper">
              <input
                type="text"
                className="form-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                id="login-username"
              />
              <User size={18} className="form-input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="form-input-wrapper">
              <input
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                id="login-password"
              />
              <Lock size={18} className="form-input-icon" />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading} id="login-submit">
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        {isDemoMode && (
          <div className="login-demo-info">
            <strong>🔧 Demo Mode Active</strong><br />
            HR Login: <strong>hr</strong> / <strong>hr123</strong><br />
            Employee Login: <strong>ahmed</strong> / <strong>emp123</strong><br />
            <em>(Any employee username with password emp123)</em>
          </div>
        )}
      </div>
    </div>
  );
}
