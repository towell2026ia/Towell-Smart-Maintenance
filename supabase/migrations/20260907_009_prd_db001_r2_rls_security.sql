-- ============================================================================
-- TSM-AI: Migración Oficial de Seguridad y Blindaje RLS (PRD-DB001-R2)
-- Archivo: 20260907_009_prd_db001_r2_rls_security.sql
-- Fecha: 2026-09-07
-- Prioridad: P0/P1 Seguridad e Integridad Operativa
-- ============================================================================

-- 0. FUNCIÓN AUXILIAR DE PERFIL DEL USUARIO ACTIVO (SECURITY DEFINER SEGURO)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE (
  id_usuario UUID,
  correo VARCHAR,
  rol VARCHAR,
  departamento VARCHAR,
  area VARCHAR,
  cve_empleado VARCHAR,
  cve_tecnico VARCHAR
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id_usuario,
    u.correo,
    u.rol,
    u.departamento,
    u.area,
    u.cve_empleado,
    u.cve_tecnico
  FROM public.cat_usuarios_roles u
  WHERE (u.id_usuario = auth.uid() OR u.correo = auth.jwt()->>'email')
    AND u.activo = TRUE
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_current_user_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_user_profile() TO authenticated, service_role;

-- 1. FUNCIÓN CONTROLADA PARA EL PORTAL PÚBLICO (CREACIÓN SIN LOGIN)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.portal_crear_solicitud(p_solicitud JSONB)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_folio TEXT;
  v_depto TEXT;
  v_maquina TEXT;
BEGIN
  v_folio := p_solicitud->>'folio';
  IF v_folio IS NULL OR LENGTH(TRIM(v_folio)) = 0 THEN
    RAISE EXCEPTION 'El folio de solicitud es obligatorio.';
  END IF;

  v_depto := UPPER(COALESCE(p_solicitud->>'departamento', 'CF'));
  IF v_depto NOT IN ('PF', 'CF', 'TF', 'AF') THEN
    v_depto := 'CF';
  END IF;

  v_maquina := p_solicitud->>'maquina_id';

  INSERT INTO public.ordenes_trabajo (
    folio, orden_trabajo, origen, estatus, fecha_inicio, hora_inicio,
    fecha_hora_inicio, departamento, maquina_id, falla, descripcion,
    observacion_inicial, nombre_solicitante, cve_solicitante, turno_solicitante,
    prioridad, fecha_carga
  ) VALUES (
    v_folio,
    COALESCE(p_solicitud->>'orden_trabajo', 'MC'),
    'App',
    'solicitud_recibida',
    CURRENT_DATE,
    CURRENT_TIME,
    NOW(),
    v_depto,
    v_maquina,
    COALESCE(p_solicitud->>'falla', 'Correctivo'),
    p_solicitud->>'descripcion',
    p_solicitud->>'observacion_inicial',
    COALESCE(p_solicitud->>'nombre_solicitante', 'Solicitante Público'),
    p_solicitud->>'cve_solicitante',
    COALESCE((p_solicitud->>'turno_solicitante')::INT, 1),
    COALESCE(p_solicitud->>'prioridad', 'Media'),
    NOW()
  );

  RETURN jsonb_build_object('success', true, 'folio', v_folio);
END;
$$;

REVOKE ALL ON FUNCTION public.portal_crear_solicitud(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_crear_solicitud(JSONB) TO anon, authenticated, service_role;

-- 2. TABLA: cat_usuarios_roles
-- ============================================================================
ALTER TABLE public.cat_usuarios_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "p_usr_super_admin_all" ON public.cat_usuarios_roles;
CREATE POLICY "p_usr_super_admin_all" ON public.cat_usuarios_roles
  FOR ALL TO authenticated
  USING (public.check_user_role('SUPER_ADMINISTRADOR') OR public.check_user_role('ADMINISTRADOR'))
  WITH CHECK (public.check_user_role('SUPER_ADMINISTRADOR') OR public.check_user_role('ADMINISTRADOR'));

DROP POLICY IF EXISTS "p_usr_self_select" ON public.cat_usuarios_roles;
CREATE POLICY "p_usr_self_select" ON public.cat_usuarios_roles
  FOR SELECT TO authenticated
  USING (id_usuario = auth.uid() OR correo = auth.jwt()->>'email');

DROP POLICY IF EXISTS "p_usr_mantenimiento_select" ON public.cat_usuarios_roles;
CREATE POLICY "p_usr_mantenimiento_select" ON public.cat_usuarios_roles
  FOR SELECT TO authenticated
  USING (public.check_user_role('MANTENIMIENTO') OR rol = 'MANTENIMIENTO');

DROP POLICY IF EXISTS "p_usr_public_verify" ON public.cat_usuarios_roles;
CREATE POLICY "p_usr_public_verify" ON public.cat_usuarios_roles
  FOR SELECT TO anon
  USING (activo = TRUE);

-- 3. TABLA: ordenes_trabajo
-- ============================================================================
ALTER TABLE public.ordenes_trabajo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "p_ot_super_admin_all" ON public.ordenes_trabajo;
CREATE POLICY "p_ot_super_admin_all" ON public.ordenes_trabajo
  FOR ALL TO authenticated
  USING (public.check_user_role('SUPER_ADMINISTRADOR') OR public.check_user_role('ADMINISTRADOR'))
  WITH CHECK (public.check_user_role('SUPER_ADMINISTRADOR') OR public.check_user_role('ADMINISTRADOR'));

DROP POLICY IF EXISTS "p_ot_mantenimiento_select" ON public.ordenes_trabajo;
CREATE POLICY "p_ot_mantenimiento_select" ON public.ordenes_trabajo
  FOR SELECT TO authenticated
  USING (public.check_user_role('MANTENIMIENTO'));

DROP POLICY IF EXISTS "p_ot_mantenimiento_update" ON public.ordenes_trabajo;
CREATE POLICY "p_ot_mantenimiento_update" ON public.ordenes_trabajo
  FOR UPDATE TO authenticated
  USING (public.check_user_role('MANTENIMIENTO'))
  WITH CHECK (public.check_user_role('MANTENIMIENTO'));

DROP POLICY IF EXISTS "p_ot_solicitante_select" ON public.ordenes_trabajo;
CREATE POLICY "p_ot_solicitante_select" ON public.ordenes_trabajo
  FOR SELECT TO authenticated
  USING (
    cve_solicitante IN (SELECT cve_empleado FROM public.cat_usuarios_roles WHERE id_usuario = auth.uid() OR correo = auth.jwt()->>'email')
    OR departamento IN (SELECT departamento FROM public.cat_usuarios_roles WHERE id_usuario = auth.uid() OR correo = auth.jwt()->>'email')
  );

DROP POLICY IF EXISTS "p_ot_solicitante_insert" ON public.ordenes_trabajo;
CREATE POLICY "p_ot_solicitante_insert" ON public.ordenes_trabajo
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "p_ot_portal_publico_insert" ON public.ordenes_trabajo;
CREATE POLICY "p_ot_portal_publico_insert" ON public.ordenes_trabajo
  FOR INSERT TO anon
  WITH CHECK (estatus = 'solicitud_recibida' AND origen = 'App');

-- 4. TABLA: bitacora_mantenimiento
-- ============================================================================
ALTER TABLE public.bitacora_mantenimiento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "p_bit_super_admin_all" ON public.bitacora_mantenimiento;
CREATE POLICY "p_bit_super_admin_all" ON public.bitacora_mantenimiento
  FOR ALL TO authenticated
  USING (public.check_user_role('SUPER_ADMINISTRADOR') OR public.check_user_role('ADMINISTRADOR'))
  WITH CHECK (public.check_user_role('SUPER_ADMINISTRADOR') OR public.check_user_role('ADMINISTRADOR'));

DROP POLICY IF EXISTS "p_bit_mantenimiento_rw" ON public.bitacora_mantenimiento;
CREATE POLICY "p_bit_mantenimiento_rw" ON public.bitacora_mantenimiento
  FOR ALL TO authenticated
  USING (public.check_user_role('MANTENIMIENTO'))
  WITH CHECK (public.check_user_role('MANTENIMIENTO'));

-- 5. TABLAS HISTÓRICAS: fallas_por_maquina Y stg_telegram_ordenes_telares
-- ============================================================================
ALTER TABLE public.fallas_por_maquina ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "p_fallas_admin_mantenimiento_read" ON public.fallas_por_maquina;
CREATE POLICY "p_fallas_admin_mantenimiento_read" ON public.fallas_por_maquina
  FOR SELECT TO authenticated
  USING (
    public.check_user_role('SUPER_ADMINISTRADOR') 
    OR public.check_user_role('ADMINISTRADOR')
    OR public.check_user_role('MANTENIMIENTO')
  );

ALTER TABLE public.stg_telegram_ordenes_telares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "p_telegram_admin_mantenimiento_read" ON public.stg_telegram_ordenes_telares;
CREATE POLICY "p_telegram_admin_mantenimiento_read" ON public.stg_telegram_ordenes_telares
  FOR SELECT TO authenticated
  USING (
    public.check_user_role('SUPER_ADMINISTRADOR') 
    OR public.check_user_role('ADMINISTRADOR')
    OR public.check_user_role('MANTENIMIENTO')
  );
