import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession } from './types';

const DEFAULT_EMAIL = 'admin@jaundicecare.tz';
const DEFAULT_PASSWORD = 'JCAdmin2026';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      const creds = localStorage.getItem('jc_admin_credentials');
      let validEmail = DEFAULT_EMAIL;
      let validPassword = DEFAULT_PASSWORD;

      if (creds) {
        try {
          const parsed = JSON.parse(creds);
          validEmail = parsed.email || DEFAULT_EMAIL;
          validPassword = parsed.password || DEFAULT_PASSWORD;
        } catch {
          // use defaults
        }
      }

      if (email === validEmail && password === validPassword) {
        const session = localStorage.getItem('jc_admin_session');
        let name = 'Administrator';
        if (session) {
          try {
            const s = JSON.parse(session);
            name = s.name || 'Administrator';
          } catch {
            // use default
          }
        }
        localStorage.setItem('jc_admin_session', JSON.stringify({
          loggedIn: true,
          role: 'super_admin',
          name,
        }));
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError('Invalid email or password.');
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#0F6E56] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#0F6E56] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white text-3xl">☀</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">JaundiceCARE</h1>
          <p className="text-sm text-[#5F5E5A] mt-1">Admin Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@jaundicecare.tz"
              required
              className="w-full px-4 py-3 border border-[#E5E3DC] rounded-xl focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#E1F5EE] text-[#1A1A1A] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 border border-[#E5E3DC] rounded-xl focus:outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#E1F5EE] text-[#1A1A1A] transition-all"
            />
          </div>

          {error && (
            <div className="bg-[#FAECE7] border border-[#A32D2D] rounded-xl px-4 py-3">
              <p className="text-sm text-[#A32D2D] font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F6E56] hover:bg-[#0d5844] disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-colors mt-2"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-[#5F5E5A] mt-6">
          JaundiceCARE Tanzania &mdash; Admin v1.0.0
        </p>
      </div>
    </div>
  );
}
