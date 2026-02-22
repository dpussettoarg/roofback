-- ============================================================
-- RoofBack — Organizations, Customers & RBAC
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent — safe to run multiple times.
--
-- Fix: profiles columns are added BEFORE any RLS policy that
--      references them, avoiding the 42703 "column does not exist"
--      error that occurs when Postgres plans the policy body.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ORGANIZATIONS TABLE (no RLS yet — policies come after
--    profiles gets its organization_id column)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL DEFAULT '',
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. UPDATE PROFILES — add org + role columns FIRST
--    so that every subsequent RLS policy that reads
--    profiles.organization_id can resolve the column.
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role            TEXT NOT NULL DEFAULT 'owner';

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);

-- ============================================================
-- 3. RLS POLICIES FOR organizations
--    (now safe: profiles.organization_id already exists)
-- ============================================================
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
-- 4. CUSTOMERS TABLE
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
-- 5. JOBS — add customer_id and organization_id
--    (existing client_* columns are kept for backward compat)
-- ============================================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS customer_id      UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organization_id  UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_jobs_customer_id     ON public.jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_organization_id ON public.jobs(organization_id);

-- ============================================================
-- 6. AUTO-PROVISION ORG FOR EXISTING USERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.provision_org_for_user(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id  UUID;
  v_company TEXT;
BEGIN
  -- Already has org → return it
  SELECT organization_id INTO v_org_id FROM public.profiles WHERE id = p_user_id;
  IF v_org_id IS NOT NULL THEN
    RETURN v_org_id;
  END IF;

  -- Use company_name or full_name as the org display name
  SELECT COALESCE(company_name, full_name, '') INTO v_company
    FROM public.profiles WHERE id = p_user_id;

  -- Create the org
  INSERT INTO public.organizations (name, owner_id)
    VALUES (v_company, p_user_id)
    RETURNING id INTO v_org_id;

  -- Link the profile
  UPDATE public.profiles
     SET organization_id = v_org_id, role = 'owner'
   WHERE id = p_user_id;

  -- Backfill all jobs that belong to this user
  UPDATE public.jobs
     SET organization_id = v_org_id
   WHERE user_id = p_user_id AND organization_id IS NULL;

  RETURN v_org_id;
END;
$$;

-- Run for every existing user that has no org yet
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE organization_id IS NULL LOOP
    PERFORM public.provision_org_for_user(r.id);
  END LOOP;
END;
$$;

-- ============================================================
-- 7. TRIGGER — auto-provision org on new profile INSERT
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
-- 8. REALTIME — REPLICA IDENTITY + publication
-- ============================================================
DO $$
BEGIN
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
