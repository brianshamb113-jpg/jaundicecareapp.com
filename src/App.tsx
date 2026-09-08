import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ParentDashboard from './pages/ParentDashboard';
import ScanPage from './pages/ScanPage';
import HospitalDashboard from './pages/HospitalDashboard';

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole?: string }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F6F2]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F6E56]" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && profile?.role !== allowedRole) {
    const home = profile?.role === 'admin' ? '/admin/dashboard' : '/';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F6F2]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F6E56]" />
      </div>
    );
  }

  if (session && profile) {
    if (profile.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (profile.role === 'hospital') {
      return (
        <Routes>
          <Route path="/" element={<HospitalDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      );
    }
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRole="parent">
            <ParentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scan"
        element={
          <ProtectedRoute allowedRole="parent">
            <ScanPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#F7F6F2] max-w-2xl mx-auto">
      <AppRoutes />
    </div>
  );
}
