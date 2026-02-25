-- Margin health thresholds (configurable in Settings)
-- Defaults: >40% green, 25-40% amber, <25% red

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS margin_threshold_high numeric(5,2) DEFAULT 40,
  ADD COLUMN IF NOT EXISTS margin_threshold_low numeric(5,2) DEFAULT 25;
