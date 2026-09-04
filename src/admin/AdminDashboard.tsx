import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Users, Activity, AlertTriangle, Building2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ScreeningRecord, Alert, Hospital, Profile } from './types';

const PIE_COLORS = ['#27500A', '#BA7517', '#A32D2D'];

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E3DC] p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#5F5E5A] font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '22' }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [scans, setScans] = useState<ScreeningRecord[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [scansRes, alertsRes, hospitalsRes, profilesRes] = await Promise.all([
        supabase.from('scans').select('*, baby:babies(*)').order('scan_date', { ascending: false }),
        supabase.from('alerts').select('*, scan:scans(*)').order('created_at', { ascending: false }),
        supabase.from('hospitals').select('*'),
        supabase.from('profiles').select('*'),
      ]);

      setScans((scansRes.data as ScreeningRecord[]) || []);
      setAlerts((alertsRes.data as Alert[]) || []);
      setHospitals((hospitalsRes.data as Hospital[]) || []);
      setProfiles((profilesRes.data as Profile[]) || []);
      setLoading(false);
    };
    loadData();
  }, []);

  const stats = useMemo(() => {
    const totalScans = scans.length;
    const highRisk = scans.filter(s => s.risk_level === 'High').length;
    const pendingAlerts = alerts.filter(a => a.hospital_response === 'pending').length;
    const approvedHospitals = hospitals.filter(h => h.is_approved).length;
    return { totalScans, highRisk, pendingAlerts, approvedHospitals, totalUsers: profiles.length };
  }, [scans, alerts, hospitals, profiles]);

  const barData = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
      const count = scans.filter(s => {
        const rd = new Date(s.scan_date);
        rd.setHours(0, 0, 0, 0);
        return rd.getTime() === d.getTime();
      }).length;
      days.push({ date: label, count });
    }
    return days;
  }, [scans]);

  const pieData = useMemo(() => {
    const low = scans.filter(s => s.risk_level === 'Low').length;
    const medium = scans.filter(s => s.risk_level === 'Medium').length;
    const high = scans.filter(s => s.risk_level === 'High').length;
    return [
      { name: 'Low', value: low },
      { name: 'Medium', value: medium },
      { name: 'High', value: high },
    ].filter(d => d.value > 0);
  }, [scans]);

  const recentAlerts = alerts.slice(0, 5);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F6E56]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Scans" value={stats.totalScans} icon={Activity} color="#0F6E56" />
        <StatCard label="High-Risk Cases" value={stats.highRisk} icon={AlertTriangle} color="#A32D2D" />
        <StatCard label="Pending Alerts" value={stats.pendingAlerts} icon={AlertTriangle} color="#BA7517" />
        <StatCard label="Approved Hospitals" value={stats.approvedHospitals} icon={Building2} color="#185FA5" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#E5E3DC] p-5 shadow-sm">
          <h2 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Scans — Last 7 Days</h2>
          {scans.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[#5F5E5A] text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5F5E5A' }} />
                <YAxis tick={{ fontSize: 10, fill: '#5F5E5A' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E3DC', fontSize: 12 }} />
                <Bar dataKey="count" name="Scans" fill="#0F6E56" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#E5E3DC] p-5 shadow-sm">
          <h2 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Risk Level Distribution</h2>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[#5F5E5A] text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E3DC', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E3DC] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E3DC]">
          <h2 className="font-semibold text-[#1A1A1A] text-sm">Recent Alerts</h2>
        </div>
        {recentAlerts.length === 0 ? (
          <div className="p-5 text-center text-sm text-[#5F5E5A]">No alerts yet</div>
        ) : (
          <div className="divide-y divide-[#F0EFE9]">
            {recentAlerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-sm text-[#1A1A1A]">
                    {alert.scan?.risk_level === 'High' ? 'High Risk' : alert.scan?.risk_level || 'Unknown'} Alert
                  </p>
                  <p className="text-xs text-[#5F5E5A]">
                    {new Date(alert.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  alert.hospital_response === 'pending' ? 'bg-gray-100 text-gray-600' :
                  alert.hospital_response === 'resolved' ? 'bg-green-100 text-green-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {alert.hospital_response}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
