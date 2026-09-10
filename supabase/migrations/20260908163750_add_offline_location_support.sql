/*
# Add offline and live-location support

1. New columns
- `scans.latitude`, `scans.longitude`, `scans.location_accuracy`, `scans.location_address`, and `scans.location_captured_at` store the exact location and capture time for each screening.
- `alerts.latitude`, `alerts.longitude`, `alerts.location_accuracy`, `alerts.location_address`, and `alerts.location_updated_at` store the parent's emergency location.

2. New table
- `alert_location_updates` stores the live-location trail shared during an active emergency, including coordinates, accuracy, address, and capture time.

3. Security
- RLS remains enabled for the new table.
- Parents can create and view location updates for their own alerts.
- Assigned hospitals can view and create location updates for alerts assigned to them.
- Admins can view all location updates.

4. Important notes
- All additions are idempotent and preserve existing data.
- Location values are optional so scans can still be saved when GPS is unavailable.
*/

ALTER TABLE scans ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS location_accuracy double precision;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS location_address text;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS location_captured_at timestamptz;

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS location_accuracy double precision;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS location_address text;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS alert_location_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  address text NOT NULL DEFAULT '',
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE alert_location_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_alert_location_updates" ON alert_location_updates;
CREATE POLICY "select_own_alert_location_updates" ON alert_location_updates FOR SELECT
  TO authenticated USING (auth.uid() = parent_id);

DROP POLICY IF EXISTS "insert_own_alert_location_updates" ON alert_location_updates;
CREATE POLICY "insert_own_alert_location_updates" ON alert_location_updates FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = parent_id AND EXISTS (
      SELECT 1 FROM alerts WHERE alerts.id = alert_id AND alerts.parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "select_hospital_alert_location_updates" ON alert_location_updates;
CREATE POLICY "select_hospital_alert_location_updates" ON alert_location_updates FOR SELECT
  TO authenticated USING (EXISTS (
    SELECT 1 FROM alerts WHERE alerts.id = alert_id AND alerts.hospital_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "insert_hospital_alert_location_updates" ON alert_location_updates;
CREATE POLICY "insert_hospital_alert_location_updates" ON alert_location_updates FOR INSERT
  TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM alerts WHERE alerts.id = alert_id AND alerts.hospital_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "select_admin_alert_location_updates" ON alert_location_updates;
CREATE POLICY "select_admin_alert_location_updates" ON alert_location_updates FOR SELECT
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE INDEX IF NOT EXISTS idx_alert_location_updates_alert_id ON alert_location_updates(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_location_updates_captured_at ON alert_location_updates(captured_at);
CREATE INDEX IF NOT EXISTS idx_scans_coordinates ON scans(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_alerts_coordinates ON alerts(latitude, longitude);
