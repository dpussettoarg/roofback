-- Onboarding flag: redirect new users to /onboarding until they complete setup

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_proposal_language text DEFAULT 'es';

-- Existing users: mark as completed so they are not redirected
UPDATE public.profiles SET onboarding_completed = true WHERE onboarding_completed IS NULL;
