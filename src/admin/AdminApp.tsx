import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminLogin from './AdminLogin';
import AdminLayout from './AdminLayout';
import AdminDashboard from './AdminDashboard';
import AdminScans from './AdminScans';
import AdminAlerts from './AdminAlerts';
import AdminHospitals from './AdminHospitals';
import AdminAnnouncements from './AdminAnnouncements';
import AdminSettings from './AdminSettings';
import type { Profile } from './types';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate('/admin', { replace: true });
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();
      if (mounted) {
        setIsAdmin((data as Profile | null)?.role === 'admin');
        setChecking(false);
      }
    });
    return () => { mounted = false; };
  }, [navigate, location]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F6E56]" />
      </div>
    );
  }

  if (!isAdmin) {
    navigate('/admin', { replace: true });
    return null;
  }

  return <>{children}</>;
}

export default function AdminApp() {
  return (
    <Routes>
      <Route path="/" element={<AdminLogin />} />
      <Route path="/dashboard" element={<RequireAuth><AdminLayout><AdminDashboard /></AdminLayout></RequireAuth>} />
      <Route path="/scans" element={<RequireAuth><AdminLayout><AdminScans /></AdminLayout></RequireAuth>} />
      <Route path="/alerts" element={<RequireAuth><AdminLayout><AdminAlerts /></AdminLayout></RequireAuth>} />
      <Route path="/hospitals" element={<RequireAuth><AdminLayout><AdminHospitals /></AdminLayout></RequireAuth>} />
      <Route path="/announcements" element={<RequireAuth><AdminLayout><AdminAnnouncements /></AdminLayout></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><AdminLayout><AdminSettings /></AdminLayout></RequireAuth>} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
