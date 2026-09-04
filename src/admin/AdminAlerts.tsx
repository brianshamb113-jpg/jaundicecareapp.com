import React, { useState, useEffect } from 'react';
import { Loader2, Clock, MapPin, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Alert, Profile } from './types';

const RESPONSE_LABELS: Record<string, string> = {
  pending: 'Pending',
  received: 'Received',
  transit: 'In Transit',
  treatment_started: 'Treatment Started',
  resolved: 'Resolved',
};

const RESPONSE_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  received: 'bg-blue-100 text-blue-700',
  transit: 'bg-amber-100 text-amber-700',
  treatment_started: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
};

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'pending' | 'active' | 'resolved'>('All');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('alerts')
        .select('*, scan:scans(*), parent:profiles(*)')
        .order('created_at', { ascending: false });
      const alertData = (data as Alert[]) || [];
      setAlerts(alertData);

      const parentIds = [...new Set(alertData.map(a => a.parent_id))];
      if (parentIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', parentIds);
        const map: Record<string, Profile> = {};
        (profileData as Profile[] || []).forEach(p => { map[p.id] = p; });
        setProfiles(map);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = alerts.filter(a => {
    if (filter === 'All') return true;
    if (filter === 'pending') return a.hospital_response === 'pending';
    if (filter === 'resolved') return a.hospital_response === 'resolved';
    return a.hospital_response !== 'pending' && a.hospital_response !== 'resolved';
  });

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0F6E56]" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(['All', 'pending', 'active', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
              filter === f
                ? 'bg-[#0F6E56] text-white'
                : 'bg-white border border-[#E5E3DC] text-[#5F5E5A] hover:border-[#0F6E56] hover:text-[#0F6E56]'
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-[#5F5E5A] self-center">{filtered.length} alerts</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E3DC] p-10 text-center text-sm text-[#5F5E5A]">
          No alerts found
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(alert => {
            const parent = profiles[alert.parent_id] || alert.parent as Profile;
            return (
              <div key={alert.id} className="bg-white rounded-xl border border-[#E5E3DC] shadow-sm p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">{parent?.full_name || 'Unknown parent'}</p>
                    {parent?.phone && <p className="text-xs text-[#5F5E5A] flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {parent.phone}</p>}
                    {parent?.city && <p className="text-xs text-[#5F5E5A] flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {parent.city}, {parent.district}</p>}
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${RESPONSE_COLORS[alert.hospital_response]}`}>
                    {RESPONSE_LABELS[alert.hospital_response]}
                  </span>
                </div>
                {alert.scan && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-[#A32D2D] font-bold">{alert.scan.risk_level} Risk</span>
                    <span className="text-[#5F5E5A]">Confidence: {alert.scan.confidence_score}%</span>
                    <span className="text-xs text-[#5F5E5A] flex items-center gap-1 ml-auto">
                      <Clock className="w-3 h-3" />
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>
                )}
                {alert.response_time && (
                  <div className="mt-2 text-xs text-[#185FA5]">
                    Response time: {alert.response_time} minutes
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
