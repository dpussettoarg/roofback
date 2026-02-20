-- ============================================
-- Migration: Stripe Billing
-- Adds subscription fields to profiles
-- ============================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS price_id TEXT;

-- Mantener subscription_price_id por compatibilidad con webhooks existentes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_price_id TEXT;

-- Indexes para lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription ON public.profiles(stripe_subscription_id);
