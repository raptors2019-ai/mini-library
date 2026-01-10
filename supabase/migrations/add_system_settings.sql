-- System Settings Table for simulated date and other system-wide configurations
-- This enables demo mode functionality where admins can simulate different dates

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB,  -- NULL means no value / use default
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read system settings (needed for date simulation to affect all users)
CREATE POLICY "Anyone can read system settings" ON system_settings
  FOR SELECT USING (true);

-- Only admins and librarians can modify system settings
CREATE POLICY "Admins can modify system settings" ON system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('librarian', 'admin')
    )
  );

-- Insert default simulated_date setting (null means use real time)
INSERT INTO system_settings (key, value)
VALUES ('simulated_date', 'null'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
