export interface ScreeningRecord {
  id: string;
  baby_id: string | null;
  parent_id: string;
  image_url: string | null;
  risk_level: 'High' | 'Medium' | 'Low';
  confidence_score: number;
  scan_date: string;
  is_offline: boolean;
  baby?: Baby;
  parent?: Profile;
}

export interface Alert {
  id: string;
  scan_id: string;
  parent_id: string;
  hospital_user_id: string | null;
  hospital_response: 'pending' | 'received' | 'transit' | 'treatment_started' | 'resolved';
  response_time: number | null;
  created_at: string;
  resolved_at: string | null;
  scan?: ScreeningRecord;
  parent?: Profile;
  hospital?: Hospital;
}

export interface Baby {
  id: string;
  parent_id: string;
  name: string;
  date_of_birth: string;
  birth_weight: number;
  gestational_age: number;
  created_at: string;
}

export interface Profile {
  id: string;
  role: 'parent' | 'hospital' | 'admin';
  full_name: string;
  phone: string;
  city: string;
  district: string;
  is_active: boolean;
  created_at: string;
}

export interface Hospital {
  id: string;
  user_id: string;
  facility_name: string;
  license_number: string;
  capacity: number;
  is_approved: boolean;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  is_published: boolean;
  created_at: string;
}

export function getStatusBadge(status: string) {
  switch (status) {
    case 'Low': return 'text-[#27500A] bg-[#EAF3DE]';
    case 'Medium': return 'text-[#BA7517] bg-[#FAEEDA]';
    case 'High': return 'text-[#A32D2D] bg-[#FAECE7]';
    default: return 'text-gray-600 bg-gray-100';
  }
}

export function getRiskClass(status: string) {
  switch (status) {
    case 'Low': return 'text-[#27500A]';
    case 'Medium': return 'text-[#BA7517]';
    case 'High': return 'text-[#A32D2D]';
    default: return 'text-gray-700';
  }
}

export function exportCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
