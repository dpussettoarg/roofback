-- ============================================================
-- RoofBack — Fix org-logos storage RLS (logo upload)
-- Run in: Supabase Dashboard → SQL Editor
-- Fixes: "new row violates row-level security policy"
-- ============================================================
-- Causes:
-- 1. Upsert overwrites need UPDATE policy, not just INSERT
-- 2. Bucket may not exist
-- ============================================================

BEGIN;

-- 1. Ensure org-logos bucket exists (run once; skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'org-logos') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('org-logos', 'org-logos', true);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Bucket org-logos may already exist or require manual creation in Dashboard.';
END;
$$;

-- 2. Drop existing policies so we can recreate them correctly
DROP POLICY IF EXISTS "Org members upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Org members update logos" ON storage.objects;
DROP POLICY IF EXISTS "Public reads org logos" ON storage.objects;

-- 3. INSERT: org members upload to their org folder (org-logos/<org_id>/...)
CREATE POLICY "Org members upload logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'org-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text
      FROM public.profiles
      WHERE id = auth.uid()
        AND organization_id IS NOT NULL
    )
  );

-- 4. UPDATE: required for upsert when overwriting existing logo
CREATE POLICY "Org members update logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'org-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text
      FROM public.profiles
      WHERE id = auth.uid()
        AND organization_id IS NOT NULL
    )
  )
  WITH CHECK (
    bucket_id = 'org-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text
      FROM public.profiles
      WHERE id = auth.uid()
        AND organization_id IS NOT NULL
    )
  );

-- 5. SELECT: public read for logo display
CREATE POLICY "Public reads org logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');

COMMIT;
