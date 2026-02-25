-- Payment Checklist: 3 fixed checkpoints (Deposit, Progress, Final)
-- Stored on jobs as JSONB

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS payment_checkpoints jsonb DEFAULT '[
    {"id": "deposit",  "checked": false, "date": null},
    {"id": "progress", "checked": false, "date": null},
    {"id": "final",    "checked": false, "date": null}
  ]'::jsonb;
