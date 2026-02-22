-- ============================================================
-- RoofBack — Organization Branding Fields
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent — safe to run multiple times.
-- ============================================================

BEGIN;

-- Add branding / contact columns to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url        TEXT,
  ADD COLUMN IF NOT EXISTS business_address TEXT,
  ADD COLUMN IF NOT EXISTS business_phone   TEXT,
  ADD COLUMN IF NOT EXISTS business_email   TEXT;

-- Storage bucket for company logos (public read, authenticated upload)
-- Run this only once — it errors if bucket already exists, which is fine.
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('org-logos', 'org-logos', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload to their own folder
-- (org-logos/<org_id>/logo.*)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Org members upload logos'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Org members upload logos"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'org-logos'
          AND (storage.foldername(name))[1] IN (
            SELECT organization_id::text
            FROM public.profiles
            WHERE id = auth.uid()
          )
        )
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Public reads org logos'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Public reads org logos"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'org-logos')
    $p$;
  END IF;
END;
$$;

COMMIT;
