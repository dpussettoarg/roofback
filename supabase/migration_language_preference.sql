-- ============================================================
-- Add language_preference to profiles (fixes schema cache error)
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent — safe to run multiple times.
-- ============================================================

-- Add column if missing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'en';

-- Backfill from legacy 'language' column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'language'
  ) THEN
    UPDATE public.profiles
    SET language_preference = COALESCE(language, 'en')
    WHERE language_preference IS NULL OR language_preference = '';
  END IF;
END;
$$;
