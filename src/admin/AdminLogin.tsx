import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { session, profile, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session && profile?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    }
    if (session && profile && profile.role !== 'admin') {
      setError('This account does not have admin access.');
    }
  }, [session, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }

    // Check if user is admin
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (profileData?.role !== 'admin') {
        setError('This account does not have admin access.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
    }

    navigate('/admin/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0F6E56] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#0F6E56] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white text-3xl font-bold">J</span>
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
            className="w-full bg-[#0F6E56] hover:bg-[#0d5844] disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-[#5F5E5A] mt-6">
          JaundiceCARE Tanzania — Admin Portal
        </p>
      </div>
    </div>
  );
}
