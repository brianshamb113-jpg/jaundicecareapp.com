import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Building2, Search, Phone, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Hospital, Profile } from './types';

export default function AdminHospitals() {
  const [hospitals, setHospitals] = useState<(Hospital & { profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'approved' | 'pending'>('All');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadHospitals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hospitals')
      .select('*, profile:profiles(*)')
      .order('created_at', { ascending: false });
    setHospitals((data as (Hospital & { profile?: Profile })[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadHospitals();
  }, []);

  const toggleApproval = async (hospital: Hospital) => {
    setUpdatingId(hospital.id);
    await supabase
      .from('hospitals')
      .update({ is_approved: !hospital.is_approved })
      .eq('id', hospital.id);
    setUpdatingId(null);
    loadHospitals();
  };

  const filtered = hospitals.filter((h) => {
    if (filter === 'approved' && !h.is_approved) return false;
    if (filter === 'pending' && h.is_approved) return false;
    if (search) {
      const name = h.facility_name.toLowerCase();
      const license = h.license_number.toLowerCase();
      return name.includes(search.toLowerCase()) || license.includes(search.toLowerCase());
    }
    return true;
  });

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0F6E56]" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5F5E5A]" />
          <input
            type="text"
            placeholder="Search by facility name or license..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[#E5E3DC] rounded-xl text-sm text-[#1A1A1A] focus:outline-none focus:border-[#0F6E56] bg-white"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['All', 'approved', 'pending'] as const).map((f) => (
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
        <span className="ml-auto text-xs text-[#5F5E5A] self-center">{filtered.length} hospitals</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E3DC] p-10 text-center text-sm text-[#5F5E5A]">
          No hospitals found
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((h) => (
            <div key={h.id} className="bg-white rounded-xl border border-[#E5E3DC] shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#E1F5EE] text-[#0F6E56] flex items-center justify-center flex-shrink-0">
                    <Building2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1A1A1A] truncate">{h.facility_name || 'Unnamed Facility'}</p>
                    {h.profile?.phone && (
                      <p className="text-xs text-[#5F5E5A] flex items-center gap-1 mt-0.5">
                        <Phone size={12} /> {h.profile.phone}
                      </p>
                    )}
                    {h.profile?.city && (
                      <p className="text-xs text-[#5F5E5A] flex items-center gap-1 mt-0.5">
                        <MapPin size={12} /> {h.profile.city}, {h.profile.district}
                      </p>
                    )}
                    {h.license_number && (
                      <p className="text-xs text-[#5F5E5A] mt-0.5">License: {h.license_number}</p>
                    )}
                    <p className="text-xs text-[#5F5E5A] mt-0.5">Capacity: {h.capacity} beds</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      h.is_approved
                        ? 'bg-[#EAF3DE] text-[#27500A]'
                        : 'bg-[#FAEEDA] text-[#BA7517]'
                    }`}
                  >
                    {h.is_approved ? 'Approved' : 'Pending'}
                  </span>
                  <button
                    onClick={() => toggleApproval(h)}
                    disabled={updatingId === h.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                      h.is_approved
                        ? 'bg-[#FAECE7] text-[#A32D2D] hover:bg-[#A32D2D] hover:text-white'
                        : 'bg-[#E1F5EE] text-[#0F6E56] hover:bg-[#0F6E56] hover:text-white'
                    }`}
                  >
                    {updatingId === h.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : h.is_approved ? (
                      <XCircle size={14} />
                    ) : (
                      <CheckCircle size={14} />
                    )}
                    {h.is_approved ? 'Disable' : 'Approve'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
