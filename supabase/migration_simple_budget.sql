-- ============================================
-- Migration: Simple Estimate Budget Buckets
-- Allows the budget tracker to work for jobs
-- created with the 'simple' estimate mode.
-- ============================================

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS simple_materials_budget NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS simple_labor_budget     NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS simple_other_budget     NUMERIC(12,2) DEFAULT 0;
