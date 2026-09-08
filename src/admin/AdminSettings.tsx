import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Trash2, LogOut, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { exportCSV } from './types';

export default function AdminSettings() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.full_name || 'Administrator');
  const [nameSaved, setNameSaved] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSaved, setPassSaved] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const handleSaveName = async () => {
    setSavingName(true);
    await supabase.from('profiles').update({ full_name: displayName }).eq('id', profile?.id);
    setSavingName(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2500);
  };

  const handleSavePassword = async () => {
    setPassError('');
    if (newPass.length < 6) {
      setPassError('Password must be at least 6 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('Passwords do not match.');
      return;
    }
    setSavingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setSavingPass(false);
    if (error) {
      setPassError(error.message);
      return;
    }
    setNewPass('');
    setConfirmPass('');
    setPassSaved(true);
    setTimeout(() => setPassSaved(false), 2500);
  };

  const handleExportScans = async () => {
    const { data } = await supabase
      .from('scans')
      .select('*, baby:babies(*), parent:profiles(*)')
      .order('scan_date', { ascending: false });
    const headers = ['Baby Name', 'Parent', 'Risk Level', 'Confidence', 'Date', 'Offline'];
    const rows = (data || []).map((s: any) => [
      s.baby?.name || 'Unknown',
      s.parent?.full_name || 'Unknown',
      s.risk_level,
      s.confidence_score,
      new Date(s.scan_date).toLocaleString(),
      s.is_offline ? 'Yes' : 'No',
    ]);
    exportCSV(headers, rows, `scans-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportAlerts = async () => {
    const { data } = await supabase
      .from('alerts')
      .select('*, scan:scans(*), parent:profiles(*)')
      .order('created_at', { ascending: false });
    const headers = ['Parent', 'Phone', 'Risk Level', 'Status', 'Response Time', 'Created'];
    const rows = (data || []).map((a: any) => [
      a.parent?.full_name || 'Unknown',
      a.parent?.phone || '',
      a.scan?.risk_level || '',
      a.hospital_response,
      a.response_time ?? '',
      new Date(a.created_at).toLocaleString(),
    ]);
    exportCSV(headers, rows, `alerts-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin', { replace: true });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Section title="Profile">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">Display Name</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-[#E5E3DC] rounded-xl text-sm focus:outline-none focus:border-[#0F6E56]"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="px-4 py-2.5 bg-[#0F6E56] hover:bg-[#0d5844] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingName ? <Loader2 size={14} className="animate-spin" /> : null}
                Save
              </button>
            </div>
            {nameSaved && (
              <p className="text-xs text-[#27500A] flex items-center gap-1 mt-1.5">
                <CheckCircle size={12} /> Name updated
              </p>
            )}
          </div>
        </div>
      </Section>

      <Section title="Change Password">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">New Password</label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-4 py-2.5 border border-[#E5E3DC] rounded-xl text-sm focus:outline-none focus:border-[#0F6E56]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Repeat new password"
              className="w-full px-4 py-2.5 border border-[#E5E3DC] rounded-xl text-sm focus:outline-none focus:border-[#0F6E56]"
            />
          </div>
          {passError && (
            <p className="text-xs text-[#A32D2D] bg-[#FAECE7] px-3 py-2 rounded-lg">{passError}</p>
          )}
          {passSaved && (
            <p className="text-xs text-[#27500A] flex items-center gap-1">
              <CheckCircle size={12} /> Password updated successfully
            </p>
          )}
          <button
            onClick={handleSavePassword}
            disabled={!newPass || !confirmPass || savingPass}
            className="px-4 py-2.5 bg-[#0F6E56] hover:bg-[#0d5844] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {savingPass ? <Loader2 size={14} className="animate-spin" /> : null}
            Update Password
          </button>
        </div>
      </Section>

      <Section title="App Information">
        <div className="space-y-2 text-sm text-[#1A1A1A]">
          <InfoRow label="App Version" value="v1.0.0" />
          <InfoRow label="Project" value="JaundiceCARE Tanzania" />
          <InfoRow label="Admin" value={profile?.full_name || 'Administrator'} />
        </div>
      </Section>

      <Section title="Data Export">
        <div className="space-y-3">
          <button
            onClick={handleExportScans}
            className="w-full flex items-center gap-3 px-4 py-3 border border-[#E5E3DC] rounded-xl text-sm font-medium text-[#1A1A1A] hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors bg-white"
          >
            <Download size={16} className="text-[#0F6E56]" />
            Export all scans as CSV
          </button>
          <button
            onClick={handleExportAlerts}
            className="w-full flex items-center gap-3 px-4 py-3 border border-[#E5E3DC] rounded-xl text-sm font-medium text-[#1A1A1A] hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors bg-white"
          >
            <Download size={16} className="text-[#0F6E56]" />
            Export all alerts as CSV
          </button>
        </div>
      </Section>

      <div className="pt-2">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-5 py-3 bg-[#A32D2D] hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E3DC] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E3DC]">
        <h2 className="font-semibold text-[#1A1A1A] text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-[#F0EFE9] last:border-0">
      <span className="text-[#5F5E5A] text-sm">{label}</span>
      <span className="font-medium text-sm text-right max-w-48">{value}</span>
    </div>
  );
}
