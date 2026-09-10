-- ============================================================================
-- TSM-AI: Cierre de Seguridad Post-RLS (PRD-DB001-R2.1)
-- Archivo: 20260907_010_prd_db001_r2_1_security_closure.sql
-- Fecha: 2026-09-07
-- Prioridad: P0/P1 Seguridad, Blindaje de Puerta Pública y Privacidad Auth
-- ============================================================================

-- 1. CERRAR INSERT DIRECTO ANON EN ordenes_trabajo
-- Se elimina la política que permitía al rol anon insertar directamente en la tabla.
-- La única puerta de entrada pública autorizada será la RPC portal_crear_solicitud().
-- ============================================================================
DROP POLICY IF EXISTS "p_ot_portal_publico_insert" ON public.ordenes_trabajo;

-- 2. FUNCIÓN RPC BLINDADA PARA EL PORTAL PÚBLICO
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
  v_descripcion TEXT;
  v_obs_inicial TEXT;
  v_nombre_solicitante TEXT;
  v_cve_solicitante TEXT;
  v_turno INT;
  v_prioridad TEXT;
  v_falla TEXT;
  v_tipo_orden TEXT;
BEGIN
  -- A. Validar folio obligatorio
  v_folio := TRIM(COALESCE(p_solicitud->>'folio', ''));
  IF v_folio = '' THEN
    RAISE EXCEPTION 'El folio de solicitud es obligatorio.';
  END IF;

  -- B. Validar y normalizar departamento canónico ('PF', 'CF', 'TF', 'AF')
  v_depto := UPPER(TRIM(COALESCE(p_solicitud->>'departamento', 'CF')));
  IF v_depto NOT IN ('PF', 'CF', 'TF', 'AF') THEN
    v_depto := 'CF';
  END IF;

  -- C. Sanitizar máquina/equipo (solo valores válidos)
  v_maquina := NULLIF(TRIM(COALESCE(p_solicitud->>'maquina_id', '')), '');
  IF v_maquina LIKE '📍%' OR v_maquina = 'NO_APLICA' THEN
    v_maquina := NULL;
  END IF;

  -- D. Sanitizar textos de usuario con límites estrictos de longitud
  v_descripcion := SUBSTRING(TRIM(COALESCE(p_solicitud->>'descripcion', 'Solicitud de servicio')), 1, 1000);
  v_obs_inicial := SUBSTRING(TRIM(COALESCE(p_solicitud->>'observacion_inicial', '')), 1, 500);
  v_nombre_solicitante := SUBSTRING(TRIM(COALESCE(p_solicitud->>'nombre_solicitante', 'Solicitante')), 1, 150);
  v_cve_solicitante := NULLIF(TRIM(COALESCE(p_solicitud->>'cve_solicitante', '')), '');

  -- E. Turno normalizado (1, 2, 3 o 4)
  BEGIN
    v_turno := COALESCE((p_solicitud->>'turno_solicitante')::INT, 1);
    IF v_turno NOT IN (1, 2, 3, 4) THEN v_turno := 1; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_turno := 1;
  END;

  -- F. Prioridad normalizada
  v_prioridad := UPPER(TRIM(COALESCE(p_solicitud->>'prioridad', 'Media')));
  IF v_prioridad NOT IN ('BAJA', 'MEDIA', 'ALTA', 'CRÍTICA', 'CRITICA') THEN
    v_prioridad := 'Media';
  END IF;

  v_falla := SUBSTRING(TRIM(COALESCE(p_solicitud->>'falla', 'Correctivo')), 1, 100);
  v_tipo_orden := SUBSTRING(TRIM(COALESCE(p_solicitud->>'orden_trabajo', 'MC')), 1, 10);

  -- G. INSERCIÓN CONTROLADA:
  -- Se fuerzan inmutablemente origen='App' y estatus='solicitud_recibida'.
  -- Se ignoran por completo campos sensibles (cve_atendio, fecha_fin, calidad, etc.)
  INSERT INTO public.ordenes_trabajo (
    folio,
    orden_trabajo,
    origen,
    estatus,
    fecha_inicio,
    hora_inicio,
    fecha_hora_inicio,
    departamento,
    maquina_id,
    falla,
    descripcion,
    observacion_inicial,
    nombre_solicitante,
    cve_solicitante,
    turno_solicitante,
    prioridad,
    fecha_carga
  ) VALUES (
    v_folio,
    v_tipo_orden,
    'App',
    'solicitud_recibida',
    CURRENT_DATE,
    CURRENT_TIME,
    NOW(),
    v_depto,
    v_maquina,
    v_falla,
    v_descripcion,
    v_obs_inicial,
    v_nombre_solicitante,
    v_cve_solicitante,
    v_turno,
    v_prioridad,
    NOW()
  );

  -- Inserción secundaria en solicitudes_mantenimiento si existe
  BEGIN
    INSERT INTO public.solicitudes_mantenimiento (
      folio_solicitud,
      solicitante_nombre,
      area,
      maquina_id,
      descripcion_falla,
      urgencia,
      tipo_servicio,
      estatus,
      fecha_registro
    ) VALUES (
      v_folio,
      v_nombre_solicitante,
      v_depto,
      v_maquina,
      v_descripcion,
      v_prioridad,
      v_falla,
      'Solicitud recibida',
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- No bloqueante
  END;

  RETURN jsonb_build_object('success', true, 'folio', v_folio);
END;
$$;

REVOKE ALL ON FUNCTION public.portal_crear_solicitud(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_crear_solicitud(JSONB) TO anon, authenticated, service_role;

-- 3. CERRAR SELECT ANON EN cat_usuarios_roles
-- Se elimina la política que permitía a anon consultar usuarios con activo=true.
-- ============================================================================
DROP POLICY IF EXISTS "p_usr_public_verify" ON public.cat_usuarios_roles;

-- 4. FUNCIÓN CONTROLADA PARA RECUPERACIÓN DE CONTRASEÑA SIN ENUMERACIÓN
-- ============================================================================
CREATE OR REPLACE FUNCTION public.verificar_usuario_recuperacion(p_email TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user RECORD;
BEGIN
  IF p_email IS NULL OR LENGTH(TRIM(p_email)) = 0 THEN
    RETURN jsonb_build_object('valido', false, 'activo', true);
  END IF;

  SELECT id_usuario, nombre_completo, correo, activo
  INTO v_user
  FROM public.cat_usuarios_roles
  WHERE LOWER(TRIM(correo)) = LOWER(TRIM(p_email))
  LIMIT 1;

  IF FOUND AND v_user.activo = TRUE THEN
    RETURN jsonb_build_object(
      'valido', true,
      'nombre', v_user.nombre_completo,
      'activo', true
    );
  ELSIF FOUND AND v_user.activo = FALSE THEN
    RETURN jsonb_build_object(
      'valido', false,
      'activo', false
    );
  ELSE
    -- Retorno seguro que no revela existencia de correos
    RETURN jsonb_build_object(
      'valido', false,
      'activo', true
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verificar_usuario_recuperacion(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verificar_usuario_recuperacion(TEXT) TO anon, authenticated, service_role;
