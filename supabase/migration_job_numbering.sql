-- ============================================
-- RoofBack - Migration: Job Numbering System (ERP-style)
-- Run in Supabase SQL Editor AFTER previous migrations
--
-- Adds sequential job numbers per user (J001, J002...)
-- and estimate versioning per job (J001-01, J001-02...)
-- Similar to Odoo's sequence-based document numbering.
-- ============================================

-- 1. Add columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'job_number'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN job_number integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'estimate_version'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN estimate_version integer DEFAULT 1;
  END IF;
END $$;

-- 2. Trigger function: auto-assigns next job_number per user on INSERT
CREATE OR REPLACE FUNCTION public.assign_job_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
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

-- 3. Backfill existing jobs that don't have a number yet
UPDATE public.jobs
SET job_number = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS rn
  FROM public.jobs
  WHERE job_number IS NULL
) sub
WHERE public.jobs.id = sub.id;

-- 4. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_jobs_job_number ON public.jobs(user_id, job_number);
