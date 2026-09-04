import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }

    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate('/')}
          className="text-[#0F6E56] font-semibold text-sm flex items-center gap-1 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Welcome Back</h1>
        <p className="text-sm text-[#5F5E5A] mb-6">Sign in to your JaundiceCARE account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-[#A32D2D]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F6E56] hover:bg-[#0d5844] disabled:bg-gray-300 text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-[#5F5E5A] mt-4">
          Don't have an account?{' '}
          <button onClick={() => navigate('/register')} className="text-[#0F6E56] font-semibold underline">
            Register here
          </button>
        </p>
      </div>
    </div>
  );
}
