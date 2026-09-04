/*
# JaundiceCARE Tanzania - Full Schema

1. New Tables
- `profiles` - Extends auth.users with role (parent/hospital/admin), name, phone, location
- `hospitals` - Extra info for hospital users (facility name, license, approval status)
- `babies` - Baby profiles belonging to parents
- `scans` - Jaundice scan results with risk levels and image paths
- `alerts` - Emergency alerts sent to hospitals when high-risk scans detected
- `announcements` - System-wide announcements published by admins

2. Security
- RLS enabled on every table
- Owner-scoped policies: users can only CRUD their own data
- Hospitals can view alerts assigned to them and scans linked to those alerts
- Admins manage announcements
- Anon cannot access anything (auth required for all roles)

3. Important Notes
- All tables use auth.uid() for ownership
- profiles.id defaults to auth.uid() for seamless inserts
- babies.parent_id defaults to auth.uid()
- scans.parent_id defaults to auth.uid()
- alerts link scans to hospitals for the hospital dashboard
- Announcements readable by all authenticated users when published
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('parent', 'hospital', 'admin')) DEFAULT 'parent',
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT '',
  latitude double precision,
  longitude double precision,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "select_hospital_profiles" ON profiles;
CREATE POLICY "select_hospital_profiles" ON profiles FOR SELECT
  TO authenticated USING (role = 'hospital');

-- Hospitals table (extra info for hospital role)
CREATE TABLE IF NOT EXISTS hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_name text NOT NULL DEFAULT '',
  license_number text NOT NULL DEFAULT '',
  capacity integer NOT NULL DEFAULT 0,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_hospitals" ON hospitals;
CREATE POLICY "select_hospitals" ON hospitals FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_hospital" ON hospitals;
CREATE POLICY "insert_own_hospital" ON hospitals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_hospital" ON hospitals;
CREATE POLICY "update_own_hospital" ON hospitals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Babies table
CREATE TABLE IF NOT EXISTS babies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  date_of_birth date NOT NULL,
  birth_weight numeric NOT NULL DEFAULT 0,
  gestational_age integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE babies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_babies" ON babies;
CREATE POLICY "select_own_babies" ON babies FOR SELECT
  TO authenticated USING (auth.uid() = parent_id);

DROP POLICY IF EXISTS "insert_own_babies" ON babies;
CREATE POLICY "insert_own_babies" ON babies FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = parent_id);

DROP POLICY IF EXISTS "update_own_babies" ON babies;
CREATE POLICY "update_own_babies" ON babies FOR UPDATE
  TO authenticated USING (auth.uid() = parent_id) WITH CHECK (auth.uid() = parent_id);

DROP POLICY IF EXISTS "delete_own_babies" ON babies;
CREATE POLICY "delete_own_babies" ON babies FOR DELETE
  TO authenticated USING (auth.uid() = parent_id);

-- Scans table
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id uuid REFERENCES babies(id) ON DELETE SET NULL,
  parent_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text,
  image_path text,
  risk_level text NOT NULL CHECK (risk_level IN ('High', 'Medium', 'Low')) DEFAULT 'Low',
  confidence_score numeric NOT NULL DEFAULT 0,
  model_version text NOT NULL DEFAULT '1.0.0',
  scan_date timestamptz DEFAULT now(),
  is_offline boolean NOT NULL DEFAULT false,
  synced_at timestamptz
);

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_scans" ON scans;
CREATE POLICY "select_own_scans" ON scans FOR SELECT
  TO authenticated USING (auth.uid() = parent_id);

DROP POLICY IF EXISTS "insert_own_scans" ON scans;
CREATE POLICY "insert_own_scans" ON scans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = parent_id);

DROP POLICY IF EXISTS "update_own_scans" ON scans;
CREATE POLICY "update_own_scans" ON scans FOR UPDATE
  TO authenticated USING (auth.uid() = parent_id) WITH CHECK (auth.uid() = parent_id);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_notified boolean NOT NULL DEFAULT false,
  hospital_notified boolean NOT NULL DEFAULT false,
  hospital_response text NOT NULL CHECK (hospital_response IN ('pending', 'received', 'transit', 'treatment_started', 'resolved')) DEFAULT 'pending',
  response_time integer,
  sent_via text NOT NULL CHECK (sent_via IN ('whatsapp', 'sms', 'email', 'in_app')) DEFAULT 'in_app',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_alerts" ON alerts;
CREATE POLICY "select_own_alerts" ON alerts FOR SELECT
  TO authenticated USING (auth.uid() = parent_id);

DROP POLICY IF EXISTS "select_hospital_alerts" ON alerts;
CREATE POLICY "select_hospital_alerts" ON alerts FOR SELECT
  TO authenticated USING (auth.uid() = hospital_user_id);

DROP POLICY IF EXISTS "insert_own_alerts" ON alerts;
CREATE POLICY "insert_own_alerts" ON alerts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = parent_id);

DROP POLICY IF EXISTS "update_hospital_alerts" ON alerts;
CREATE POLICY "update_hospital_alerts" ON alerts FOR UPDATE
  TO authenticated USING (auth.uid() = hospital_user_id) WITH CHECK (auth.uid() = hospital_user_id);

-- Now add the hospital scans policy (after alerts table exists)
DROP POLICY IF EXISTS "select_hospital_scans" ON scans;
CREATE POLICY "select_hospital_scans" ON scans FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM alerts WHERE alerts.scan_id = scans.id AND alerts.hospital_user_id = auth.uid())
  );

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  priority text NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_announcements" ON announcements;
CREATE POLICY "select_announcements" ON announcements FOR SELECT
  TO authenticated USING (is_published = true);

DROP POLICY IF EXISTS "insert_announcements" ON announcements;
CREATE POLICY "insert_announcements" ON announcements FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "update_announcements" ON announcements;
CREATE POLICY "update_announcements" ON announcements FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "delete_announcements" ON announcements;
CREATE POLICY "delete_announcements" ON announcements FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_babies_parent_id ON babies(parent_id);
CREATE INDEX IF NOT EXISTS idx_scans_parent_id ON scans(parent_id);
CREATE INDEX IF NOT EXISTS idx_scans_baby_id ON scans(baby_id);
CREATE INDEX IF NOT EXISTS idx_alerts_parent_id ON alerts(parent_id);
CREATE INDEX IF NOT EXISTS idx_alerts_hospital_user_id ON alerts(hospital_user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_scan_id ON alerts(scan_id);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone');
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
