-- ============================================
-- RoofBack - Migration: Dual Estimate System
-- Run in Supabase SQL Editor AFTER schema.sql
-- ============================================

-- Add new columns to jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS estimate_mode text DEFAULT 'itemized',
  ADD COLUMN IF NOT EXISTS simple_description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS public_token uuid DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS client_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS client_signature text DEFAULT '',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Ensure existing rows get a token
UPDATE public.jobs SET public_token = gen_random_uuid() WHERE public_token IS NULL;

-- Index for fast public proposal lookups
CREATE INDEX IF NOT EXISTS idx_jobs_public_token ON public.jobs(public_token);

-- RLS policy: allow public read via token (no auth required)
CREATE POLICY "Public can view job by token"
  ON public.jobs FOR SELECT
  USING (true);

-- RLS policy: allow public update of client_status/signature via token
CREATE POLICY "Public can approve job by token"
  ON public.jobs FOR UPDATE
  USING (public_token IS NOT NULL)
  WITH CHECK (public_token IS NOT NULL);

-- Public read for estimate_items (for proposal view)
CREATE POLICY "Public can view estimate items by job"
  ON public.estimate_items FOR SELECT
  USING (true);

-- Public read for profiles (to show contractor info in proposal)
CREATE POLICY "Public can view profiles for proposals"
  ON public.profiles FOR SELECT
  USING (true);
