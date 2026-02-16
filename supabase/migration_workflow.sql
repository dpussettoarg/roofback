-- ============================================
-- RoofBack - Migration: Odoo-Lite Workflow
-- Run in Supabase SQL Editor AFTER previous migrations
-- ============================================

-- New workflow & scheduling fields on jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS deadline_date date,
  ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT '50/50',
  ADD COLUMN IF NOT EXISTS workflow_stage text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS materials_ordered boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS language_output text DEFAULT 'es';

-- Create Supabase Storage bucket for job photos (run in dashboard or here)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('job-photos', 'job-photos', true)
-- ON CONFLICT DO NOTHING;

-- Storage RLS: allow authenticated users to upload/read
-- CREATE POLICY "Users can upload job photos" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'job-photos' AND auth.role() = 'authenticated');
-- CREATE POLICY "Public can view job photos" ON storage.objects
--   FOR SELECT USING (bucket_id = 'job-photos');
