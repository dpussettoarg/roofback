-- ============================================================
-- Fix: Allow trial_expires_at to be NULL in profiles
--
-- Context: When a user subscribes, the Stripe webhook sets
-- trial_expires_at = NULL to mark them as a paying customer
-- (no longer in trial). The column was originally created with
-- NOT NULL, which caused the webhook to fail with:
--   "null value in column trial_expires_at violates not-null constraint"
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (idempotent).
-- ============================================================

-- 1. Drop the NOT NULL constraint
ALTER TABLE public.profiles
  ALTER COLUMN trial_expires_at DROP NOT NULL;

-- 2. Verify the change (optional — inspect results after running)
-- SELECT column_name, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name   = 'profiles'
--   AND column_name  = 'trial_expires_at';
