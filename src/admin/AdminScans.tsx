import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ScreeningRecord } from './types';
import { getStatusBadge, getRiskClass, exportCSV } from './types';

const PAGE_SIZE = 15;

export default function AdminScans() {
  const [scans, setScans] = useState<ScreeningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Low' | 'Medium' | 'High'>('All');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('scans')
        .select('*, baby:babies(*), parent:profiles(*)')
        .order('scan_date', { ascending: false });
      setScans((data as ScreeningRecord[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return scans
      .filter(s => filter === 'All' || s.risk_level === filter)
      .filter(s => {
        if (!search) return true;
        const babyName = s.baby?.name || '';
        const parentName = s.parent?.full_name || '';
        return babyName.toLowerCase().includes(search.toLowerCase()) ||
               parentName.toLowerCase().includes(search.toLowerCase());
      });
  }, [scans, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    const headers = ['Baby Name', 'Parent', 'Risk Level', 'Confidence', 'Date', 'Offline'];
    const rows = scans.map(s => [
      s.baby?.name || 'Unknown',
      s.parent?.full_name || 'Unknown',
      s.risk_level,
      s.confidence_score,
      new Date(s.scan_date).toLocaleString(),
      s.is_offline ? 'Yes' : 'No',
    ]);
    exportCSV(headers, rows, `scans-${new Date().toISOString().split('T')[0]}.csv`);
  };

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
            placeholder="Search by baby or parent name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 border border-[#E5E3DC] rounded-xl text-sm text-[#1A1A1A] focus:outline-none focus:border-[#0F6E56] bg-white"
          />
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F6E56] hover:bg-[#0d5844] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['All', 'Low', 'Medium', 'High'] as const).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f
                ? 'bg-[#0F6E56] text-white'
                : 'bg-white border border-[#E5E3DC] text-[#5F5E5A] hover:border-[#0F6E56] hover:text-[#0F6E56]'
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-[#5F5E5A] self-center">{filtered.length} records</span>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E3DC] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F7F6F2] border-b border-[#E5E3DC]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Baby</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Parent</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Risk</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Confidence</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EFE9]">
              {paginated.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-[#5F5E5A] text-sm">No records found</td></tr>
              ) : (
                paginated.map(s => (
                  <tr key={s.id} className="hover:bg-[#F7F6F2] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#1A1A1A] whitespace-nowrap">{s.baby?.name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-[#1A1A1A]">{s.parent?.full_name || 'Unknown'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getStatusBadge(s.risk_level)}`}>
                        {s.risk_level}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${getRiskClass(s.risk_level)}`}>{s.confidence_score}%</td>
                    <td className="px-4 py-3 text-[#5F5E5A] text-xs whitespace-nowrap">
                      {new Date(s.scan_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E3DC] bg-[#F7F6F2]">
            <p className="text-xs text-[#5F5E5A]">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium border border-[#E5E3DC] rounded-lg disabled:opacity-40 hover:border-[#0F6E56] hover:text-[#0F6E56] bg-white transition-colors">Previous</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-medium border border-[#E5E3DC] rounded-lg disabled:opacity-40 hover:border-[#0F6E56] hover:text-[#0F6E56] bg-white transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
