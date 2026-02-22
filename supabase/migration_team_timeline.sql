-- ============================================================
-- RoofBack — Team Invitations, Milestone Dates, Notifications
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent — safe to run multiple times.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. INVITATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'ops' CHECK (role IN ('owner', 'ops')),
  token           UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Only org owners can insert invitations
DROP POLICY IF EXISTS "Owners can manage invitations" ON public.invitations;
CREATE POLICY "Owners can manage invitations"
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
  );

-- Anyone can read a single invitation by token (for acceptance flow)
-- We handle this via a SECURITY DEFINER function instead of open RLS
CREATE INDEX IF NOT EXISTS idx_invitations_token   ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org     ON public.invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email   ON public.invitations(email);

-- ============================================================
-- 2. ACCEPT INVITATION — SECURITY DEFINER FUNCTION
--    Called from the /invite page client-side.
--    Verifies token, matches caller email, updates profile, deletes invitation.
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv       RECORD;
  v_caller_id UUID := auth.uid();
  v_email     TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Look up invitation
  SELECT * INTO v_inv FROM public.invitations WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invitation not found or already used');
  END IF;
  IF v_inv.expires_at < NOW() THEN
    RETURN jsonb_build_object('error', 'Invitation has expired');
  END IF;

  -- Verify caller email matches
  SELECT email INTO v_email FROM auth.users WHERE id = v_caller_id;
  IF lower(v_email) <> lower(v_inv.email) THEN
    RETURN jsonb_build_object('error', 'This invitation was sent to a different email address');
  END IF;

  -- Update profile: join the org
  UPDATE public.profiles
     SET organization_id = v_inv.organization_id,
         role            = v_inv.role,
         updated_at      = NOW()
   WHERE id = v_caller_id;

  -- Backfill any jobs this user created into the org
  UPDATE public.jobs
     SET organization_id = v_inv.organization_id
   WHERE user_id = v_caller_id AND organization_id IS NULL;

  -- Consume the invitation
  DELETE FROM public.invitations WHERE id = v_inv.id;

  RETURN jsonb_build_object('success', true, 'organization_id', v_inv.organization_id, 'role', v_inv.role);
END;
$$;

-- ============================================================
-- 3. JOB MILESTONE DATES TABLE
--    Stores per-stage scheduled/completed dates separately from jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.job_milestones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  stage           TEXT NOT NULL CHECK (stage IN ('contract', 'materials', 'jobsite', 'completed')),
  scheduled_date  DATE,
  completed_date  DATE,
  notes           TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, stage)
);

ALTER TABLE public.job_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage milestones" ON public.job_milestones;
CREATE POLICY "Org members manage milestones"
  ON public.job_milestones FOR ALL
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

CREATE INDEX IF NOT EXISTS idx_job_milestones_job_id ON public.job_milestones(job_id);

-- ============================================================
-- 4. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type            TEXT NOT NULL DEFAULT 'info',  -- 'status_change' | 'new_note' | 'milestone'
  title           TEXT NOT NULL DEFAULT '',
  body            TEXT NOT NULL DEFAULT '',
  job_id          UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  read            BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Org members can insert notifications" ON public.notifications;
CREATE POLICY "Org members can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (recipient_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_org       ON public.notifications(organization_id);

-- Realtime for notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'notifications' AND c.relreplident = 'f'
  ) THEN
    ALTER TABLE public.notifications REPLICA IDENTITY FULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;

-- ============================================================
-- 5. ENFORCE role CHECK on profiles (owner | ops only)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_check' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('owner', 'ops'));
  END IF;
END;
$$;

-- Backfill any legacy 'cs' roles to 'ops'
UPDATE public.profiles SET role = 'ops' WHERE role NOT IN ('owner', 'ops');

-- ============================================================
-- 6. RLS — tighten jobs & customers to org members only
--    (drop any permissive user_id-only policies)
-- ============================================================
-- Jobs: members of same org can access
DROP POLICY IF EXISTS "Users manage own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Org members access jobs" ON public.jobs;
CREATE POLICY "Org members access jobs"
  ON public.jobs FOR ALL
  USING (
    (organization_id IS NOT NULL AND organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ))
    OR
    (organization_id IS NULL AND user_id = auth.uid())
  )
  WITH CHECK (
    (organization_id IS NOT NULL AND organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ))
    OR
    (organization_id IS NULL AND user_id = auth.uid())
  );

COMMIT;
