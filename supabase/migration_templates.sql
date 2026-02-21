-- ============================================================
-- Migration: Material Templates + language_preference
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent — safe to run multiple times
-- ============================================================

-- 1. Add language_preference to profiles (stores 'en' or 'es')
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language_preference TEXT NOT NULL DEFAULT 'en';

-- 2. Backfill from existing 'language' column if present
UPDATE public.profiles
SET language_preference = language
WHERE language IS NOT NULL AND language_preference = 'en';

-- 3. Material templates table
CREATE TABLE IF NOT EXISTS public.material_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  items       JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. RLS for material_templates
ALTER TABLE public.material_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own templates" ON public.material_templates;
CREATE POLICY "Users manage own templates"
  ON public.material_templates
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_material_templates_user_id
  ON public.material_templates (user_id);
