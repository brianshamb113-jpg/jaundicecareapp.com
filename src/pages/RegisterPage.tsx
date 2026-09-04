import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Building2, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    city: '',
    district: '',
    facilityName: '',
    licenseNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setLoading(true);
    setError(null);

    const { error: signUpError } = await signUp(form.email, form.password, {
      full_name: form.fullName,
      phone: form.phone,
      role,
      city: form.city,
      district: form.district,
      facility_name: role === 'hospital' ? form.facilityName : undefined,
      license_number: role === 'hospital' ? form.licenseNumber : undefined,
    });

    if (signUpError) {
      setError(signUpError);
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

        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Create Your Account</h1>
        <p className="text-sm text-[#5F5E5A] mb-6">Choose your role to get started.</p>

        {/* Role Selection */}
        {!role && (
          <div className="grid gap-3">
            <RoleCard
              icon={<User className="w-6 h-6" />}
              title="Parent / Guardian"
              description="Register your baby and scan for jaundice from home."
              onClick={() => setRole('parent')}
            />
            <RoleCard
              icon={<Building2 className="w-6 h-6" />}
              title="Health Facility"
              description="Receive alerts from parents and manage patient cases."
              onClick={() => setRole('hospital')}
            />
            <RoleCard
              icon={<Shield className="w-6 h-6" />}
              title="System Administrator"
              description="Manage hospitals, view analytics, and configure settings."
              onClick={() => setRole('admin')}
            />
          </div>
        )}

        {/* Registration Form */}
        {role && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-[#E1F5EE] rounded-xl p-3 flex items-center gap-3">
              <div className="bg-[#0F6E56] text-white rounded-lg p-2">
                {role === 'parent' ? <User className="w-5 h-5" /> : role === 'hospital' ? <Building2 className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
              </div>
              <span className="font-semibold text-[#0F6E56]">
                {role === 'parent' ? 'Parent / Guardian' : role === 'hospital' ? 'Health Facility' : 'System Administrator'}
              </span>
              <button type="button" onClick={() => setRole(null)} className="ml-auto text-xs text-[#0F6E56] underline">
                Change
              </button>
            </div>

            <FormField label="Full Name *" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} required />
            <FormField label="Phone Number *" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
            <FormField label="Email *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
            <FormField label="Password *" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />

            {role !== 'admin' && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                <FormField label="District" value={form.district} onChange={(v) => setForm({ ...form, district: v })} />
              </div>
            )}

            {role === 'hospital' && (
              <>
                <FormField label="Facility Name *" value={form.facilityName} onChange={(v) => setForm({ ...form, facilityName: v })} required />
                <FormField label="License Number" value={form.licenseNumber} onChange={(v) => setForm({ ...form, licenseNumber: v })} />
              </>
            )}

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
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function RoleCard({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border-2 border-gray-200 rounded-2xl p-5 flex gap-4 items-start text-left hover:border-[#0F6E56] transition-colors"
    >
      <div className="bg-[#E1F5EE] text-[#0F6E56] rounded-xl p-3 flex-shrink-0">{icon}</div>
      <div>
        <h3 className="font-bold text-[#1A1A1A] text-lg">{title}</h3>
        <p className="text-sm text-[#5F5E5A]">{description}</p>
      </div>
    </button>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-[#1A1A1A] mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
      />
    </div>
  );
}
