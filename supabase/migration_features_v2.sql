-- ============================================
-- Migration: Features V2
-- 1. Profile: contact_email, website
-- 2. Activity logs table
-- 3. Jobs: validated_address, lat, lng
-- ============================================

-- Profile: add contact_email and website
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '';

-- Jobs: store geocoded coordinates for map
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Activity Logs table (bitácora / work journal)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  photos TEXT[] DEFAULT '{}',
  log_type TEXT DEFAULT 'progress', -- 'progress', 'issue', 'delivery', 'completion'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own activity logs"
  ON activity_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_activity_logs_job_id ON activity_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
