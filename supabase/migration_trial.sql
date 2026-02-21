-- ============================================================
-- Migration: Free Trial + Stripe Billing Columns
-- Run in Supabase Dashboard → SQL Editor
-- All statements are idempotent (safe to run multiple times)
-- ============================================================

-- 1. Subscription status (default: 'trialing' for new signups)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trialing';

-- 2. Trial expiry: 14 days from account creation
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days');

-- 3. Stripe customer & subscription references
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS price_id TEXT;

-- 4. Backfill: any existing row that's still 'trialing' but has no expiry gets 14 days from NOW
--    (handles rows created before this migration was applied)
UPDATE public.profiles
SET trial_expires_at = NOW() + INTERVAL '14 days'
WHERE subscription_status = 'trialing'
  AND trial_expires_at IS NULL;

-- 5. Backfill: any existing row that already has stripe_subscription_id
--    is considered 'active' (previously paying customer)
UPDATE public.profiles
SET subscription_status = 'active'
WHERE stripe_subscription_id IS NOT NULL
  AND subscription_status = 'trialing';

-- 6. Optional index for the middleware query (profiles looked up by id)
CREATE INDEX IF NOT EXISTS idx_profiles_subscription
  ON public.profiles (subscription_status, trial_expires_at);
