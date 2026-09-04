import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Baby as BabyIcon, Camera, AlertCircle, ChevronRight, Loader2, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Baby, Scan, Announcement } from '../types';

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [babies, setBabies] = useState<Baby[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBaby, setShowAddBaby] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [babiesRes, scansRes, announcementsRes] = await Promise.all([
      supabase.from('babies').select('*').eq('parent_id', user.id).order('created_at', { ascending: false }),
      supabase
        .from('scans')
        .select('*, baby:babies(*)')
        .eq('parent_id', user.id)
        .order('scan_date', { ascending: false })
        .limit(10),
      supabase.from('announcements').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(5),
    ]);

    setBabies(babiesRes.data as Baby[] || []);
    setScans(scansRes.data as Scan[] || []);
    setAnnouncements(announcementsRes.data as Announcement[] || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const criticalAnnouncements = announcements.filter((a) => a.priority === 'Critical');

  return (
    <div className="pb-28">
      {/* Critical banners */}
      {criticalAnnouncements.map((ann) => (
        <div key={ann.id} className="bg-[#A32D2D] text-white px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">{ann.title}</p>
            {ann.body && <p className="text-xs opacity-90 mt-0.5">{ann.body}</p>}
          </div>
        </div>
      ))}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0F6E56] text-white p-6 pt-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <span className="text-[#0F6E56] font-bold text-lg">J</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">JaundiceCARE</h1>
            <p className="text-sm opacity-90">Welcome, {profile?.full_name || 'Parent'}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#0F6E56]" />
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#E1F5EE] rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-[#0F6E56]">{babies.length}</p>
                <p className="text-xs text-[#5F5E5A] mt-1">Baby Profiles</p>
              </div>
              <div className="bg-[#E1F5EE] rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-[#0F6E56]">{scans.length}</p>
                <p className="text-xs text-[#5F5E5A] mt-1">Total Scans</p>
              </div>
            </div>

            {/* Scan Button */}
            <button
              onClick={() => navigate('/scan')}
              className="w-full bg-[#0F6E56] hover:bg-[#0d5844] text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" /> Start New Scan
            </button>

            {/* Baby Profiles */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[#1A1A1A]">Baby Profiles</h2>
                <button
                  onClick={() => setShowAddBaby(true)}
                  className="text-[#0F6E56] font-semibold text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Baby
                </button>
              </div>

              {babies.length === 0 ? (
                <div className="bg-[#E1F5EE] rounded-xl p-6 text-center">
                  <BabyIcon className="w-8 h-8 text-[#0F6E56] mx-auto mb-2" />
                  <p className="text-[#5F5E5A] text-sm">No baby profiles yet. Add your baby to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {babies.map((baby) => (
                    <div key={baby.id} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-[#1A1A1A]">{baby.name}</div>
                          <p className="text-xs text-[#5F5E5A]">
                            Born: {new Date(baby.date_of_birth).toLocaleDateString()} | {baby.birth_weight}g | {baby.gestational_age} weeks
                          </p>
                        </div>
                        <button
                          onClick={() => navigate(`/scan?baby=${baby.id}`)}
                          className="text-[#0F6E56] font-semibold text-sm flex items-center gap-1"
                        >
                          Scan <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Scans */}
            <div>
              <h2 className="font-bold text-[#1A1A1A] mb-3">Recent Scans</h2>
              {scans.length === 0 ? (
                <div className="bg-[#E1F5EE] rounded-xl p-6 text-center">
                  <p className="text-[#5F5E5A] text-sm">No scans yet. Start a new scan to see results here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scans.map((scan) => (
                    <ScanCard key={scan.id} scan={scan} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showAddBaby && <AddBabyModal onClose={() => { setShowAddBaby(false); loadData(); }} />}
    </div>
  );
}

function ScanCard({ scan }: { scan: Scan }) {
  const riskColors: Record<string, string> = {
    High: 'bg-[#A32D2D] text-white',
    Medium: 'bg-[#BA7517] text-white',
    Low: 'bg-[#27500A] text-white',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex justify-between items-start mb-2">
        <div className="font-bold text-[#1A1A1A]">{scan.baby?.name || 'Unknown baby'}</div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${riskColors[scan.risk_level]}`}>
          {scan.risk_level.toUpperCase()}
        </span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-[#5F5E5A]">Confidence: {scan.confidence_score}%</span>
        <span className="text-xs text-[#5F5E5A]">
          {new Date(scan.scan_date).toLocaleDateString()} {new Date(scan.scan_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

function AddBabyModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [weight, setWeight] = useState('');
  const [gestationalAge, setGestationalAge] = useState('40');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user || !name || !dob) return;
    setLoading(true);
    await supabase.from('babies').insert({
      parent_id: user.id,
      name,
      date_of_birth: dob,
      birth_weight: parseFloat(weight) || 0,
      gestational_age: parseInt(gestationalAge) || 40,
    });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 p-0 sm:p-4 sm:items-center">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h3 className="font-bold text-[#1A1A1A]">Add Baby Profile</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Baby's Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Date of Birth *</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Birth Weight (grams)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="3000"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Gestational Age (weeks)</label>
            <select
              value={gestationalAge}
              onChange={(e) => setGestationalAge(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
            >
              {['35', '36', '37', '38', '39', '40', '41'].map((w) => (
                <option key={w} value={w}>{w} weeks</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={loading || !name || !dob}
            className="w-full bg-[#0F6E56] hover:bg-[#0d5844] disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Baby Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
