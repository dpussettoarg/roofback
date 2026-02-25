-- ============================================================
-- RoofBack — Rate-limiting guidance for public proposal RPCs
-- Run in: Supabase Dashboard → SQL Editor
--
-- These RPCs (get_proposal_by_token, approve_proposal_by_token) are
-- executable by anon users. Rate limiting should be enforced at the
-- Supabase/infrastructure level (e.g. Supabase Edge Functions,
-- API Gateway, or Upstash Redis) to prevent abuse.
-- ============================================================

COMMENT ON FUNCTION public.get_proposal_by_token(text) IS
  'Obtiene job, perfil e items de presupuesto solo para el public_token dado. Uso: propuestas públicas. Devuelve NULL si token inválido. IMPORTANT: Rate-limit this function at Supabase/infrastructure level (anon traffic).';

COMMENT ON FUNCTION public.approve_proposal_by_token(text, text) IS
  'Marca el job como aprobado solo si public_token coincide y client_status=pending. No permite modificar public_token. IMPORTANT: Rate-limit this function at Supabase/infrastructure level (anon traffic).';
