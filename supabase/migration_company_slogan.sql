-- ============================================================
-- RoofBack — Add company_slogan to organizations
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS company_slogan TEXT;
