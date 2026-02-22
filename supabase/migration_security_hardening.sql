-- ============================================================
-- RoofBack — Security Hardening Migration
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent — safe to run multiple times.
--
-- Every optional table (may not exist in all environments) is
-- wrapped in a DO $$ IF EXISTS block so the script never errors
-- on a missing relation.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. DROP ALL LEFTOVER "OPEN" POLICIES
--    These were created by migration_estimates.sql and MUST be
--    absent from production. DROP POLICY IF EXISTS is always safe.
-- ============================================================

DROP POLICY IF EXISTS "Public can view job by token"            ON public.jobs;
DROP POLICY IF EXISTS "Public can approve job by token"         ON public.jobs;
DROP POLICY IF EXISTS "Public can view estimate items by job"   ON public.estimate_items;
DROP POLICY IF EXISTS "Public can view profiles for proposals"  ON public.profiles;
DROP POLICY IF EXISTS "Allow public read"                       ON public.jobs;
DROP POLICY IF EXISTS "Allow public read"                       ON public.profiles;
DROP POLICY IF EXISTS "Allow public read"                       ON public.estimate_items;
DROP POLICY IF EXISTS "Anyone can read jobs"                    ON public.jobs;
DROP POLICY IF EXISTS "Anyone can read estimate_items"          ON public.estimate_items;

-- ============================================================
-- 2. CORE TABLES — always exist (created in schema.sql)
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
CREATE POLICY "Users manage own profile"
  ON public.profiles FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── jobs ─────────────────────────────────────────────────────
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own jobs"   ON public.jobs;
DROP POLICY IF EXISTS "Org members manage jobs" ON public.jobs;

CREATE POLICY "Org members manage jobs"
  ON public.jobs FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    OR user_id = auth.uid()
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- ── estimate_items ────────────────────────────────────────────
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own estimate items"   ON public.estimate_items;
DROP POLICY IF EXISTS "Org members manage estimate items" ON public.estimate_items;

CREATE POLICY "Org members manage estimate items"
  ON public.estimate_items FOR ALL
  USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      WHERE j.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      ) OR j.user_id = auth.uid()
    )
  )
  WITH CHECK (
    job_id IN (
      SELECT j.id FROM public.jobs j
      WHERE j.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      ) OR j.user_id = auth.uid()
    )
  );

-- ── material_checklist ────────────────────────────────────────
ALTER TABLE public.material_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own checklist"   ON public.material_checklist;
DROP POLICY IF EXISTS "Org members manage checklist" ON public.material_checklist;

CREATE POLICY "Org members manage checklist"
  ON public.material_checklist FOR ALL
  USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      WHERE j.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      ) OR j.user_id = auth.uid()
    )
  );

-- ── expenses ──────────────────────────────────────────────────
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own expenses"   ON public.expenses;
DROP POLICY IF EXISTS "Org members manage expenses" ON public.expenses;

CREATE POLICY "Org members manage expenses"
  ON public.expenses FOR ALL
  USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      WHERE j.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      ) OR j.user_id = auth.uid()
    )
  );

-- ── time_entries ──────────────────────────────────────────────
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own time entries"   ON public.time_entries;
DROP POLICY IF EXISTS "Org members manage time entries" ON public.time_entries;

CREATE POLICY "Org members manage time entries"
  ON public.time_entries FOR ALL
  USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      WHERE j.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      ) OR j.user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. OPTIONAL TABLES — wrapped in existence checks
-- ============================================================

-- ── customers ─────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'customers') THEN
    EXECUTE 'ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Org members can manage customers" ON public.customers';
    EXECUTE $p$
      CREATE POLICY "Org members can manage customers"
        ON public.customers FOR ALL
        USING (
          organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
          )
        )
        WITH CHECK (
          organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
          )
        )
    $p$;
  END IF;
END; $$;

-- ── notifications ─────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    EXECUTE 'ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Org members can read notifications" ON public.notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Org members can update notifications" ON public.notifications';
    EXECUTE $p$
      CREATE POLICY "Org members can read notifications"
        ON public.notifications FOR SELECT
        USING (
          organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
          )
        )
    $p$;
    EXECUTE $p$
      CREATE POLICY "Org members can update notifications"
        ON public.notifications FOR UPDATE
        USING (
          organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
          )
        )
    $p$;
  END IF;
END; $$;

-- ── job_milestones ────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'job_milestones') THEN
    EXECUTE 'ALTER TABLE public.job_milestones ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Org members manage milestones" ON public.job_milestones';
    EXECUTE $p$
      CREATE POLICY "Org members manage milestones"
        ON public.job_milestones FOR ALL
        USING (
          job_id IN (
            SELECT j.id FROM public.jobs j
            WHERE j.organization_id IN (
              SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            ) OR j.user_id = auth.uid()
          )
        )
    $p$;
  END IF;
END; $$;

-- ── material_templates ────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'material_templates') THEN
    EXECUTE 'ALTER TABLE public.material_templates ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Org members manage material templates" ON public.material_templates';
    EXECUTE $p$
      CREATE POLICY "Org members manage material templates"
        ON public.material_templates FOR ALL
        USING (
          organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
          )
        )
        WITH CHECK (
          organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
          )
        )
    $p$;
  END IF;
END; $$;

-- ── invitations ───────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'invitations') THEN
    EXECUTE 'ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Org owners manage invitations" ON public.invitations';
    EXECUTE $p$
      CREATE POLICY "Org owners manage invitations"
        ON public.invitations FOR ALL
        USING (
          organization_id IN (
            SELECT organization_id FROM public.profiles
            WHERE id = auth.uid() AND role = 'owner'
          )
        )
        WITH CHECK (
          organization_id IN (
            SELECT organization_id FROM public.profiles
            WHERE id = auth.uid() AND role = 'owner'
          )
        )
    $p$;
  END IF;
END; $$;

-- ── job_activity_log ──────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'job_activity_log') THEN
    EXECUTE 'ALTER TABLE public.job_activity_log ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Org members read activity log" ON public.job_activity_log';
    EXECUTE $p$
      CREATE POLICY "Org members read activity log"
        ON public.job_activity_log FOR SELECT
        USING (
          job_id IN (
            SELECT j.id FROM public.jobs j
            WHERE j.organization_id IN (
              SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            ) OR j.user_id = auth.uid()
          )
        )
    $p$;
  END IF;
END; $$;

-- ── job_templates ─────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'job_templates') THEN
    EXECUTE 'ALTER TABLE public.job_templates ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone reads system templates" ON public.job_templates';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated reads system templates" ON public.job_templates';
    EXECUTE $p$
      CREATE POLICY "Authenticated reads system templates"
        ON public.job_templates FOR SELECT
        TO authenticated
        USING (is_system = true)
    $p$;
  END IF;
END; $$;

-- ============================================================
-- 4. UNIQUE CONSTRAINT ON invitations(organization_id, email)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'invitations') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'invitations_org_email_unique'
        AND table_schema     = 'public'
        AND table_name       = 'invitations'
    ) THEN
      ALTER TABLE public.invitations
        ADD CONSTRAINT invitations_org_email_unique
        UNIQUE (organization_id, email);
    END IF;
  END IF;
END; $$;

-- ============================================================
-- 5. ATOMIC JOB NUMBER COUNTER (replaces racy MAX()+1 trigger)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.job_number_sequences (
  key        TEXT   PRIMARY KEY,
  last_value BIGINT NOT NULL DEFAULT 0
);

ALTER TABLE public.job_number_sequences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_number_sequences FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.assign_job_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seq_key  TEXT;
  next_num BIGINT;
BEGIN
  seq_key := CASE
    WHEN NEW.organization_id IS NOT NULL THEN 'org:'  || NEW.organization_id::text
    ELSE                                      'user:' || NEW.user_id::text
  END;

  INSERT INTO public.job_number_sequences (key, last_value)
    VALUES (seq_key, 1)
  ON CONFLICT (key)
    DO UPDATE SET last_value = job_number_sequences.last_value + 1
  RETURNING last_value INTO next_num;

  NEW.job_number := next_num;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_job_number ON public.jobs;
CREATE TRIGGER trg_assign_job_number
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  WHEN (NEW.job_number IS NULL OR NEW.job_number = 0)
  EXECUTE FUNCTION public.assign_job_number();

-- ============================================================
-- 6. AUDIT VIEW — run SELECT * FROM public.v_rls_policy_audit
--    to spot any remaining USING (true) policies at a glance.
-- ============================================================

CREATE OR REPLACE VIEW public.v_rls_policy_audit AS
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual        AS using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

REVOKE ALL ON public.v_rls_policy_audit FROM anon, authenticated;

COMMIT;
