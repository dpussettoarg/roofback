-- ============================================================
-- RoofBack — Organizations, Customers & RBAC
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent — safe to run multiple times.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ORGANIZATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL DEFAULT '',
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view their org" ON public.organizations;
CREATE POLICY "Org members can view their org"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Org owner can update" ON public.organizations;
CREATE POLICY "Org owner can update"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ============================================================
-- 2. UPDATE PROFILES — add org + role columns
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role            TEXT NOT NULL DEFAULT 'owner';

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);

-- ============================================================
-- 3. CUSTOMERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL DEFAULT '',
  address         TEXT NOT NULL DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL DEFAULT '',
  notes           TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can manage customers" ON public.customers;
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
  );

CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers(organization_id);

-- ============================================================
-- 4. JOBS — add customer_id and organization_id
--    (existing client_* columns are kept for backward compatibility)
-- ============================================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS customer_id      UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organization_id  UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_jobs_customer_id      ON public.jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_organization_id  ON public.jobs(organization_id);

-- ============================================================
-- 5. AUTO-PROVISION ORGANIZATION FOR EXISTING USERS
--    Every user who does not yet have an org gets one created.
--    The user's profile is linked and role set to 'owner'.
-- ============================================================

-- Helper function: provision an org for a user if they don't have one
CREATE OR REPLACE FUNCTION public.provision_org_for_user(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_company TEXT;
BEGIN
  -- Already has org → return it
  SELECT organization_id INTO v_org_id FROM public.profiles WHERE id = p_user_id;
  IF v_org_id IS NOT NULL THEN
    RETURN v_org_id;
  END IF;

  -- Get company name for the org
  SELECT COALESCE(company_name, full_name, '') INTO v_company
    FROM public.profiles WHERE id = p_user_id;

  -- Create org
  INSERT INTO public.organizations (name, owner_id)
    VALUES (v_company, p_user_id)
    RETURNING id INTO v_org_id;

  -- Link profile
  UPDATE public.profiles
     SET organization_id = v_org_id, role = 'owner'
   WHERE id = p_user_id;

  -- Backfill all jobs for this user
  UPDATE public.jobs
     SET organization_id = v_org_id
   WHERE user_id = p_user_id AND organization_id IS NULL;

  RETURN v_org_id;
END;
$$;

-- Backfill all existing users
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE organization_id IS NULL LOOP
    PERFORM public.provision_org_for_user(r.id);
  END LOOP;
END;
$$;

-- ============================================================
-- 6. TRIGGER — auto-provision org when a new user signs up
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.provision_org_for_user(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_provision_org ON public.profiles;
CREATE TRIGGER on_profile_created_provision_org
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_org();

-- ============================================================
-- 7. ENABLE REALTIME for jobs and customers
--    (run once; idempotent via IF NOT EXISTS logic in pg)
-- ============================================================
DO $$
BEGIN
  -- Enable replica identity so realtime sends full row on UPDATE/DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'jobs'
      AND c.relreplident = 'f'
  ) THEN
    ALTER TABLE public.jobs REPLICA IDENTITY FULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'customers'
      AND c.relreplident = 'f'
  ) THEN
    ALTER TABLE public.customers REPLICA IDENTITY FULL;
  END IF;
END;
$$;

-- Add tables to the realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'customers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
  END IF;
END;
$$;

COMMIT;
