-- ============================================================
-- RoofBack — FULL SCHEMA SYNC
-- Run this ONE file in Supabase SQL Editor.
-- It is 100% idempotent: safe to run multiple times.
-- Applies every migration that has NOT been run yet.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. JOBS — proposal / estimate columns  (migration_estimates.sql)
-- ============================================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS estimate_mode      text        DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS simple_description text        DEFAULT '',
  ADD COLUMN IF NOT EXISTS public_token       uuid        DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS client_status      text        DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS client_signature   text        DEFAULT '',
  ADD COLUMN IF NOT EXISTS approved_at        timestamptz;

-- Backfill any rows that got a NULL public_token before the DEFAULT existed
UPDATE public.jobs SET public_token = gen_random_uuid() WHERE public_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_public_token ON public.jobs(public_token);

-- ============================================================
-- 2. JOBS — workflow / scheduling columns  (migration_workflow.sql)
-- ============================================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS start_date        date,
  ADD COLUMN IF NOT EXISTS duration_days     integer  DEFAULT 1,
  ADD COLUMN IF NOT EXISTS deadline_date     date,
  ADD COLUMN IF NOT EXISTS payment_terms     text     DEFAULT '50/50',
  ADD COLUMN IF NOT EXISTS workflow_stage    text     DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS photos            text[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS materials_ordered boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS language_output   text     DEFAULT 'es';

-- ============================================================
-- 3. JOBS — job numbering  (migration_job_numbering.sql)
-- ============================================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS job_number       integer,
  ADD COLUMN IF NOT EXISTS estimate_version integer DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_jobs_job_number ON public.jobs(user_id, job_number);

-- Auto-assign job_number on INSERT (per-user sequential)
CREATE OR REPLACE FUNCTION public.assign_job_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE next_num integer;
BEGIN
  SELECT COALESCE(MAX(job_number), 0) + 1
    INTO next_num
    FROM public.jobs
   WHERE user_id = NEW.user_id;
  NEW.job_number := next_num;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_job_number ON public.jobs;
CREATE TRIGGER trg_assign_job_number
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  WHEN (NEW.job_number IS NULL)
  EXECUTE FUNCTION public.assign_job_number();

-- Backfill existing jobs
UPDATE public.jobs
SET job_number = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS rn
  FROM public.jobs
  WHERE job_number IS NULL
) sub
WHERE public.jobs.id = sub.id;

-- ============================================================
-- 4. JOBS — simple estimate budget buckets  (migration_simple_budget.sql)
-- ============================================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS simple_materials_budget numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS simple_labor_budget     numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS simple_other_budget     numeric(12,2) DEFAULT 0;

-- ============================================================
-- 5. PROFILES — contact info  (migration_features_v2.sql)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contact_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS website       text DEFAULT '';

-- ============================================================
-- 6. JOBS — geocoding  (migration_features_v2.sql)
-- ============================================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

-- ============================================================
-- 7. ACTIVITY LOGS table  (migration_features_v2.sql)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id      uuid        REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  user_id     uuid        REFERENCES auth.users(id) NOT NULL,
  description text        NOT NULL DEFAULT '',
  photos      text[]      DEFAULT '{}',
  log_type    text        DEFAULT 'progress',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'activity_logs' AND policyname = 'Users can manage own activity logs'
  ) THEN
    CREATE POLICY "Users can manage own activity logs"
      ON public.activity_logs FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_activity_logs_job_id ON public.activity_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- ============================================================
-- 8. PROFILES — Stripe billing  (migration_stripe.sql)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id       text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id   text,
  ADD COLUMN IF NOT EXISTS subscription_status      text DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS price_id                 text,
  ADD COLUMN IF NOT EXISTS subscription_price_id    text;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer      ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription  ON public.profiles(stripe_subscription_id);

-- ============================================================
-- 9. RLS — remove insecure open policies  (migration_fix_rls.sql)
--    These were created by migration_estimates.sql originally;
--    migration_fix_rls.sql drops them and replaces with SECURITY DEFINER RPCs.
-- ============================================================
DROP POLICY IF EXISTS "Public can view job by token"          ON public.jobs;
DROP POLICY IF EXISTS "Public can approve job by token"       ON public.jobs;
DROP POLICY IF EXISTS "Public can view estimate items by job" ON public.estimate_items;
DROP POLICY IF EXISTS "Public can view profiles for proposals" ON public.profiles;

-- ============================================================
-- 10. RPC — get_proposal_by_token  (migration_fix_rls.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_proposal_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_uuid uuid;
  v_job        public.jobs;
  v_profile    record;
  v_items      jsonb;
BEGIN
  BEGIN
    v_token_uuid := p_token::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN NULL;
  END;

  SELECT * INTO v_job FROM public.jobs WHERE public_token = v_token_uuid LIMIT 1;
  IF v_job IS NULL THEN RETURN NULL; END IF;

  SELECT full_name, company_name, phone
    INTO v_profile
    FROM public.profiles
   WHERE id = v_job.user_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(ei) ORDER BY ei.sort_order), '[]'::jsonb)
    INTO v_items
    FROM public.estimate_items ei
   WHERE ei.job_id = v_job.id;

  RETURN jsonb_build_object(
    'job',            to_jsonb(v_job),
    'profile',        to_jsonb(v_profile),
    'estimate_items', v_items
  );
END;
$$;

-- ============================================================
-- 11. RPC — approve_proposal_by_token  (migration_fix_rls.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_proposal_by_token(p_token text, p_client_signature text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_uuid uuid;
BEGIN
  BEGIN
    v_token_uuid := p_token::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  UPDATE public.jobs
     SET client_status    = 'approved',
         client_signature = COALESCE(NULLIF(TRIM(p_client_signature), ''), client_signature),
         approved_at      = now(),
         status           = 'approved',
         workflow_stage   = 'approved',
         updated_at       = now()
   WHERE public_token     = v_token_uuid
     AND client_status    = 'pending';

  RETURN FOUND;
END;
$$;

-- ============================================================
-- 12. RPC permissions
-- ============================================================
REVOKE ALL ON FUNCTION public.get_proposal_by_token(text)            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_proposal_by_token(text, text)  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_proposal_by_token(text)           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_proposal_by_token(text, text) TO anon, authenticated;

COMMIT;
