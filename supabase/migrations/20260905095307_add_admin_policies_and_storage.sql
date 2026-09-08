-- Admin RLS policies: admins need to read all scans, alerts, hospitals, profiles, babies
-- Storage bucket for scan images

-- ============ PROFILES ============
-- Admins can read all profiles
DROP POLICY IF EXISTS "select_all_profiles_admin" ON profiles;
CREATE POLICY "select_all_profiles_admin" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============ HOSPITALS ============
-- Admins can update hospital approval status
DROP POLICY IF EXISTS "update_hospitals_admin" ON hospitals;
CREATE POLICY "update_hospitals_admin" ON hospitals FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Admins can delete hospitals
DROP POLICY IF EXISTS "delete_hospitals_admin" ON hospitals;
CREATE POLICY "delete_hospitals_admin" ON hospitals FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============ BABIES ============
-- Admins can read all babies
DROP POLICY IF EXISTS "select_all_babies_admin" ON babies;
CREATE POLICY "select_all_babies_admin" ON babies FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============ SCANS ============
-- Admins can read all scans
DROP POLICY IF EXISTS "select_all_scans_admin" ON scans;
CREATE POLICY "select_all_scans_admin" ON scans FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============ ALERTS ============
-- Admins can read all alerts
DROP POLICY IF EXISTS "select_all_alerts_admin" ON alerts;
CREATE POLICY "select_all_alerts_admin" ON alerts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Admins can update alerts
DROP POLICY IF EXISTS "update_alerts_admin" ON alerts;
CREATE POLICY "update_alerts_admin" ON alerts FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('scans', 'scans', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for scan images
DROP POLICY IF EXISTS "storage_scans_insert" ON storage.objects;
CREATE POLICY "storage_scans_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'scans');

DROP POLICY IF EXISTS "storage_scans_select" ON storage.objects;
CREATE POLICY "storage_scans_select" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'scans');

DROP POLICY IF EXISTS "storage_scans_update" ON storage.objects;
CREATE POLICY "storage_scans_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'scans') WITH CHECK (bucket_id = 'scans');

DROP POLICY IF EXISTS "storage_scans_delete" ON storage.objects;
CREATE POLICY "storage_scans_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'scans');
