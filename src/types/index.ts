export type UserRole = 'parent' | 'hospital' | 'admin';

export type RiskLevel = 'High' | 'Medium' | 'Low';

export type HospitalResponse = 'pending' | 'received' | 'transit' | 'treatment_started' | 'resolved';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string;
  city: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
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

export interface Baby {
  id: string;
  parent_id: string;
  name: string;
  date_of_birth: string;
  birth_weight: number;
  gestational_age: number;
  created_at: string;
}

export interface Scan {
  id: string;
  baby_id: string | null;
  parent_id: string;
  image_url: string | null;
  image_path: string | null;
  risk_level: RiskLevel;
  confidence_score: number;
  model_version: string;
  scan_date: string;
  is_offline: boolean;
  synced_at: string | null;
  baby?: Baby;
}

export interface Alert {
  id: string;
  scan_id: string;
  parent_id: string;
  hospital_user_id: string | null;
  admin_notified: boolean;
  hospital_notified: boolean;
  hospital_response: HospitalResponse;
  response_time: number | null;
  sent_via: 'whatsapp' | 'sms' | 'email' | 'in_app';
  notes: string;
  created_at: string;
  resolved_at: string | null;
  scan?: Scan;
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
