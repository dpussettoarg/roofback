-- ============================================
-- RoofBack - Migration: Corregir RLS Inseguras
-- Ejecutar en Supabase SQL Editor DESPUÉS de migration_estimates.sql
--
-- Elimina las políticas que exponían datos a todo el mundo (USING true)
-- y las reemplaza con funciones SECURITY DEFINER para la ruta pública
-- de propuestas, sin abrir RLS en las tablas base.
--
-- REQUIERE: Actualizar app/proposal/[token]/page.tsx para usar las RPCs
-- ============================================

BEGIN;

-- ============================================
-- 1. ELIMINAR POLÍTICAS INSEGURAS
-- ============================================

DROP POLICY IF EXISTS "Public can view job by token" ON public.jobs;
DROP POLICY IF EXISTS "Public can approve job by token" ON public.jobs;
DROP POLICY IF EXISTS "Public can view estimate items by job" ON public.estimate_items;
DROP POLICY IF EXISTS "Public can view profiles for proposals" ON public.profiles;

-- Tras esto, solo quedan las políticas del schema.sql:
-- - jobs: Users can view/create/update/delete own jobs (auth.uid() = user_id)
-- - estimate_items: via job ownership
-- - profiles: Users can view/update/insert own profile

-- ============================================
-- 2. FUNCIONES SECURITY DEFINER PARA PROPUESTAS
-- Permiten leer/actualizar solo el job asociado al token, sin abrir RLS.
-- ============================================

-- 2.1 Obtener datos de la propuesta por token (solo el job con ese token)
-- Retorna job, profile (campos públicos), estimate_items del job.
-- Acepta text para evitar error si el token no es UUID válido.
CREATE OR REPLACE FUNCTION public.get_proposal_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_uuid uuid;
  v_job    public.jobs;
  v_profile record;
  v_items  jsonb;
BEGIN
  v_token_uuid := p_token::uuid;
  -- Solo devolver el job que coincide con el token
  SELECT * INTO v_job
  FROM public.jobs
  WHERE public_token = v_token_uuid
  LIMIT 1;

  IF v_job IS NULL THEN
    RETURN NULL;
  END IF;

  -- Solo campos necesarios para mostrar en la propuesta
  SELECT full_name, company_name, phone
  INTO v_profile
  FROM public.profiles
  WHERE id = v_job.user_id;

  -- Items del presupuesto del job
  SELECT COALESCE(
    jsonb_agg(to_jsonb(ei) ORDER BY ei.sort_order),
    '[]'::jsonb
  ) INTO v_items
  FROM public.estimate_items ei
  WHERE ei.job_id = v_job.id;

  RETURN jsonb_build_object(
    'job', to_jsonb(v_job),
    'profile', to_jsonb(v_profile),
    'estimate_items', v_items
  );
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

-- 2.2 Aprobar propuesta por token
-- Solo actualiza client_status, client_signature, approved_at, status, workflow_stage, updated_at.
-- NO permite modificar public_token ni user_id ni ningún otro dato sensible.
CREATE OR REPLACE FUNCTION public.approve_proposal_by_token(p_token text, p_client_signature text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_uuid uuid;
BEGIN
  v_token_uuid := p_token::uuid;
  UPDATE public.jobs
  SET
    client_status = 'approved',
    client_signature = COALESCE(NULLIF(TRIM(p_client_signature), ''), client_signature),
    approved_at = now(),
    status = 'approved',
    workflow_stage = 'approved',
    updated_at = now()
  WHERE public_token = v_token_uuid
    AND client_status = 'pending';

  RETURN FOUND;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN false;
END;
$$;

-- ============================================
-- 3. PERMISOS
-- anon necesita ejecutar estas funciones (clientes sin login)
-- authenticated no las necesita para la propuesta (usa tablas directas)
-- ============================================

REVOKE ALL ON FUNCTION public.get_proposal_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_proposal_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_proposal_by_token(text) TO authenticated;

REVOKE ALL ON FUNCTION public.approve_proposal_by_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_proposal_by_token(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.approve_proposal_by_token(text, text) TO authenticated;

-- ============================================
-- 4. COMENTARIO DE SEGURIDAD
-- Las funciones corren con privilegios del owner (postgres).
-- Solo exponen/actualizan el job cuyo public_token coincide.
-- Un usuario autenticado NUNCA puede cambiar public_token de otro
-- (la política "Users can update own jobs" ya lo impide: auth.uid() = user_id).
-- ============================================

COMMENT ON FUNCTION public.get_proposal_by_token(text) IS
  'Obtiene job, perfil e items de presupuesto solo para el public_token dado. Uso: propuestas públicas. Devuelve NULL si token inválido.';

COMMENT ON FUNCTION public.approve_proposal_by_token(text, text) IS
  'Marca el job como aprobado solo si public_token coincide y client_status=pending. No permite modificar public_token.';

COMMIT;
