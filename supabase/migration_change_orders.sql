-- Change Orders: client notification paper trail

CREATE TABLE IF NOT EXISTS public.change_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  reason text NOT NULL DEFAULT 'other',
  internal_note text DEFAULT '',
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'approved', 'verbal', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_change_orders_job_id ON public.change_orders(job_id);

ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage change orders" ON public.change_orders;
CREATE POLICY "Org members manage change orders"
  ON public.change_orders FOR ALL
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
