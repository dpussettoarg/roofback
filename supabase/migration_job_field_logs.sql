-- Job Field Log / Project Notes
-- Running field notebook for each job

CREATE TABLE IF NOT EXISTS public.job_field_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  author text DEFAULT '',
  tags text[] DEFAULT '{}',
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_field_logs_job_id ON public.job_field_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_field_logs_created ON public.job_field_logs(created_at DESC);

ALTER TABLE public.job_field_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage job field logs" ON public.job_field_logs;
CREATE POLICY "Org members manage job field logs"
  ON public.job_field_logs FOR ALL
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
