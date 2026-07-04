-- ============================================================================
-- TSM-AI: DB Schema Modifications for Excel Ingestion & Calendars (PRD)
-- Safe to execute in Supabase SQL Editor
-- ============================================================================

-- Enable pgcrypto extension for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. NEW STAGING TABLES
-- ============================================================================

-- stg_maquinas_excel
CREATE TABLE IF NOT EXISTS public.stg_maquinas_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_towell VARCHAR(255) NULL,
    clave VARCHAR(255) NULL,
    area VARCHAR(255) NULL,
    proceso VARCHAR(255) NULL,
    tipo_equipo VARCHAR(255) NULL,
    activo VARCHAR(255) NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW()
);

-- stg_refacciones_excel
CREATE TABLE IF NOT EXISTS public.stg_refacciones_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_articulo VARCHAR(255) NULL,
    nombre_articulo VARCHAR(255) NULL,
    unidad_medida VARCHAR(255) NULL,
    familia VARCHAR(255) NULL,
    activo VARCHAR(255) NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW()
);

-- stg_tecnicos_excel
CREATE TABLE IF NOT EXISTS public.stg_tecnicos_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cve_tecnico VARCHAR(255) NULL,
    nombre_tecnico VARCHAR(255) NULL,
    departamento_codigo VARCHAR(255) NULL,
    turno_id VARCHAR(255) NULL,
    especialidad VARCHAR(255) NULL,
    puesto VARCHAR(255) NULL,
    correo VARCHAR(255) NULL,
    telefono VARCHAR(255) NULL,
    activo VARCHAR(255) NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW()
);

-- stg_empleados_excel
CREATE TABLE IF NOT EXISTS public.stg_empleados_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cve_empleado VARCHAR(255) NULL,
    nombre_empleado VARCHAR(255) NULL,
    departamento_codigo VARCHAR(255) NULL,
    turno_id VARCHAR(255) NULL,
    puesto VARCHAR(255) NULL,
    correo VARCHAR(255) NULL,
    telefono VARCHAR(255) NULL,
    activo VARCHAR(255) NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW()
);

-- stg_refacciones_por_maquina_excel
CREATE TABLE IF NOT EXISTS public.stg_refacciones_por_maquina_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha VARCHAR(255) NULL,
    maquina_id VARCHAR(255) NULL,
    destino VARCHAR(255) NULL,
    codigo_articulo VARCHAR(255) NULL,
    nombre_articulo VARCHAR(255) NULL,
    cantidad_estandar VARCHAR(255) NULL,
    precio_costo_unitario VARCHAR(255) NULL,
    importe_costo_origen VARCHAR(255) NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW()
);

-- stg_historico_precios_refacciones_excel
CREATE TABLE IF NOT EXISTS public.stg_historico_precios_refacciones_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_articulo VARCHAR(255) NULL,
    fecha VARCHAR(255) NULL,
    precio_costo_unitario VARCHAR(255) NULL,
    moneda VARCHAR(255) NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW()
);

-- stg_inventario_refacciones_excel
CREATE TABLE IF NOT EXISTS public.stg_inventario_refacciones_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_articulo VARCHAR(255) NULL,
    codigo_proveedor VARCHAR(255) NULL,
    stock_actual VARCHAR(255) NULL,
    stock_minimo VARCHAR(255) NULL,
    stock_maximo VARCHAR(255) NULL,
    unidad_medida VARCHAR(255) NULL,
    ubicacion VARCHAR(255) NULL,
    costo_unitario VARCHAR(255) NULL,
    moneda VARCHAR(255) NULL,
    observaciones TEXT NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW()
);

-- stg_costos_mano_obra_excel
CREATE TABLE IF NOT EXISTS public.stg_costos_mano_obra_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cve_tecnico VARCHAR(255) NULL,
    nombre_tecnico VARCHAR(255) NULL,
    costo_hora VARCHAR(255) NULL,
    moneda VARCHAR(255) NULL,
    fecha_inicio_vigencia VARCHAR(255) NULL,
    fecha_fin_vigencia VARCHAR(255) NULL,
    observaciones TEXT NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW()
);

-- stg_segundas_por_rollo_excel
-- DISEÑO: Esta tabla acepta datos crudos de CUALQUIER fuente (Excel manual, API externa,
-- integración automática similar a Telegram). No impone restricciones estrictas de tipo
-- porque los datos llegan sin normalizar. La validación y resolución de maquina_id ocurre
-- en la vista vw_validacion_segundas_por_rollo antes de pasar a la tabla limpia.
CREATE TABLE IF NOT EXISTS public.stg_segundas_por_rollo_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produccion VARCHAR(255) NULL,
    fecha VARCHAR(255) NULL,
    codigo_bodega VARCHAR(255) NULL,
    codigo_articulo VARCHAR(255) NULL,
    nombre_articulo VARCHAR(255) NULL,
    configuracion VARCHAR(255) NULL,
    tamano VARCHAR(255) NULL,
    color VARCHAR(255) NULL,
    nombre VARCHAR(255) NULL,
    almacen VARCHAR(255) NULL,
    numero_lote VARCHAR(255) NULL,
    localidad VARCHAR(255) NULL,
    salon VARCHAR(255) NULL,
    numero_serie VARCHAR(255) NULL,
    id_flog VARCHAR(255) NULL,
    nombre_flog VARCHAR(255) NULL,
    calidad_flog VARCHAR(255) NULL,
    pzas_rollo VARCHAR(255) NULL,
    kg_rollo VARCHAR(255) NULL,
    mts_rollo VARCHAR(255) NULL,
    no_tiras VARCHAR(255) NULL,
    medida_1 VARCHAR(255) NULL,
    medida_2 VARCHAR(255) NULL,
    pzas_t1 VARCHAR(255) NULL,
    pzas_t2 VARCHAR(255) NULL,
    pzas_t3 VARCHAR(255) NULL,
    pzas_t4 VARCHAR(255) NULL,
    turno_tejido VARCHAR(255) NULL,
    codigo_defecto VARCHAR(255) NULL,
    cantidad VARCHAR(255) NULL,
    defecto VARCHAR(255) NULL,
    maquina_id_detectada VARCHAR(255) NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    -- origen_carga: identifica quién insertó el registro.
    -- Valores esperados: 'EXCEL_MANUAL' | 'API_EXTERNA' | 'EDGE_FUNCTION' | 'TELEGRAM' | 'OTRO'
    -- Permite auditoría y segmentación de registros en la vista de validación.
    origen_carga VARCHAR(100) NULL DEFAULT 'EXCEL_MANUAL',
    fecha_carga TIMESTAMPTZ DEFAULT NOW(),
    observaciones TEXT NULL
);

-- ============================================================================
-- 2. NEW CLEAN/FINAL TABLES
-- ============================================================================

-- segundas_por_rollo
CREATE TABLE IF NOT EXISTS public.segundas_por_rollo (
    id_segunda_rollo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    anio INT NULL,
    mes INT NULL,
    semana INT NULL,
    produccion VARCHAR(100) NOT NULL,
    maquina_id VARCHAR(100) NOT NULL REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE RESTRICT,
    salon VARCHAR(100) NULL,
    turno_tejido VARCHAR(50) DEFAULT '' NOT NULL,
    codigo_articulo VARCHAR(100) NULL,
    nombre_articulo VARCHAR(255) NULL,
    configuracion VARCHAR(255) NULL,
    tamano VARCHAR(255) NULL,
    color VARCHAR(255) NULL,
    codigo_defecto VARCHAR(100) NOT NULL,
    defecto VARCHAR(255) NULL,
    cantidad_defecto NUMERIC(18,4) NULL,
    pzas_rollo NUMERIC(18,4) NULL,
    kg_rollo NUMERIC(18,4) NULL,
    mts_rollo NUMERIC(18,4) NULL,
    no_tiras NUMERIC(18,4) NULL,
    medida_1 NUMERIC(18,4) NULL,
    medida_2 NUMERIC(18,4) NULL,
    pzas_t1 NUMERIC(18,4) NULL,
    pzas_t2 NUMERIC(18,4) NULL,
    pzas_t3 NUMERIC(18,4) NULL,
    pzas_t4 NUMERIC(18,4) NULL,
    id_flog VARCHAR(100) NULL,
    calidad_flog VARCHAR(100) NULL,
    numero_serie VARCHAR(255) DEFAULT '' NOT NULL,
    tipo_falla_id_sugerido VARCHAR(100) NULL,
    categoria_falla_sugerida VARCHAR(100) NULL,
    id_componente_sugerido UUID NULL REFERENCES public.cat_componentes_maquina(id_componente) ON UPDATE CASCADE ON DELETE SET NULL,
    requiere_revision_autonoma BOOLEAN DEFAULT FALSE,
    nivel_riesgo VARCHAR(50) NULL,
    score_riesgo NUMERIC(18,4) NULL,
    origen VARCHAR(100) DEFAULT 'EXCEL_SEGUNDAS_X_ROLLO',
    id_carga UUID NULL REFERENCES public.control_cargas_archivos(id_carga) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_carga TIMESTAMPTZ DEFAULT NOW(),
    fecha_alta TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    observaciones TEXT NULL,
    CONSTRAINT uq_segundas_rollo UNIQUE (fecha, produccion, codigo_defecto, numero_serie, turno_tejido)
);

-- cat_relacion_defecto_falla
CREATE TABLE IF NOT EXISTS public.cat_relacion_defecto_falla (
    id_relacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_defecto VARCHAR(100) NULL,
    defecto_calidad VARCHAR(255) NOT NULL,
    tipo_falla_id VARCHAR(50) NULL REFERENCES public.cat_tipos_falla(tipo_falla_id) ON UPDATE CASCADE ON DELETE SET NULL,
    categoria_falla VARCHAR(100) NULL,
    componente_sugerido VARCHAR(150) NULL,
    actividad_autonoma_sugerida TEXT NULL,
    actividad_mantenimiento_sugerida TEXT NULL,
    prioridad_default VARCHAR(50) NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    observaciones TEXT NULL
);

-- calendarios_mantenimiento
CREATE TABLE IF NOT EXISTS public.calendarios_mantenimiento (
    id_calendario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_calendario VARCHAR(50) NOT NULL, -- 'PREVENTIVO_ANUAL', 'PREDICTIVO_MENSUAL', 'AUTONOMO_SEMANAL'
    anio INT NOT NULL,
    mes INT NULL,
    semana INT NULL,
    fecha_inicio_periodo DATE NOT NULL,
    fecha_fin_periodo DATE NOT NULL,
    estatus_calendario VARCHAR(50) DEFAULT 'PROPUESTO', -- 'PROPUESTO', 'EN_REVISION', 'APROBADO', 'RECHAZADO', 'EJECUTADO_PARCIAL', 'EJECUTADO_TOTAL', 'CANCELADO'
    generado_por VARCHAR(150) NULL,
    origen_generacion VARCHAR(100) NULL,
    fecha_generacion TIMESTAMPTZ DEFAULT NOW(),
    aprobado_por UUID NULL,
    fecha_aprobacion TIMESTAMPTZ NULL,
    observaciones TEXT NULL
);

-- calendario_mantenimiento_detalle
CREATE TABLE IF NOT EXISTS public.calendario_mantenimiento_detalle (
    id_detalle UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_calendario UUID NOT NULL REFERENCES public.calendarios_mantenimiento(id_calendario) ON DELETE CASCADE,
    maquina_id VARCHAR(100) NOT NULL REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE RESTRICT,
    fecha_programada DATE NOT NULL,
    turno_sugerido VARCHAR(50) NULL,
    tipo_mantenimiento VARCHAR(50) NOT NULL, -- 'PREVENTIVO', 'PREDICTIVO', 'AUTONOMO', 'CORRECTIVO_DERIVADO'
    prioridad VARCHAR(50) NULL, -- 'Baja', 'Media', 'Alta', 'Crítica'
    actividad_sugerida TEXT NOT NULL,
    responsable_sugerido VARCHAR(150) NULL,
    fuente_principal VARCHAR(100) NULL,
    score_riesgo NUMERIC(18,4) NULL,
    id_plan UUID NULL REFERENCES public.planes_mantenimiento_preventivo(id_plan) ON DELETE SET NULL,
    id_analisis UUID REFERENCES public.analisis_repetibilidad_fallas(id_analisis) ON DELETE SET NULL,
    id_orden_referencia UUID NULL,
    requiere_ot BOOLEAN DEFAULT FALSE,
    id_orden_generada UUID NULL,
    estatus_detalle VARCHAR(50) DEFAULT 'PROPUESTO', -- 'PROPUESTO', 'APROBADO', 'PROGRAMADO', 'OT_GENERADA', 'EN_PROCESO', 'REALIZADO', 'NO_REALIZADO', 'CANCELADO'
    fecha_alta TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    observaciones TEXT NULL
);

-- calendario_mantenimiento_fuentes
CREATE TABLE IF NOT EXISTS public.calendario_mantenimiento_fuentes (
    id_fuente UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_detalle UUID NOT NULL REFERENCES public.calendario_mantenimiento_detalle(id_detalle) ON DELETE CASCADE,
    tipo_fuente VARCHAR(50) NOT NULL, -- 'SEGUNDAS_X_ROLLO', 'FALLAS_POR_MAQUINA', 'TELEGRAM_OT', 'PLAN_PREVENTIVO', etc.
    id_referencia VARCHAR(255) NULL,
    maquina_id VARCHAR(100) NULL REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE CASCADE,
    fecha_referencia DATE NULL,
    peso_riesgo NUMERIC(18,4) NULL,
    comentario TEXT NULL,
    fecha_alta TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. CHANGES TO EXISTING TABLES
-- ============================================================================

-- Add new fields to ordenes_trabajo
ALTER TABLE public.ordenes_trabajo
ADD COLUMN IF NOT EXISTS tipo_orden VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS id_plan UUID NULL REFERENCES public.planes_mantenimiento_preventivo(id_plan) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS id_carga UUID NULL REFERENCES public.control_cargas_archivos(id_carga) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS validado_desde_excel BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fecha_validacion_excel TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS observaciones_validacion TEXT NULL;

-- ============================================================================
-- Backfill de columna origen_carga en instalaciones existentes (idempotente)
-- ============================================================================
ALTER TABLE public.stg_segundas_por_rollo_excel
  ADD COLUMN IF NOT EXISTS origen_carga VARCHAR(100) NULL DEFAULT 'EXCEL_MANUAL';

-- Rename id_orden_trabajo -> id_orden in subtareas (idempotente: verifica existencia antes de renombrar)
-- 1. subtareas_orden_trabajo
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name  = 'subtareas_orden_trabajo'
      AND column_name = 'id_orden_trabajo'
  ) THEN
    ALTER TABLE public.subtareas_orden_trabajo RENAME COLUMN id_orden_trabajo TO id_orden;
  END IF;
END;
$$;
ALTER TABLE public.subtareas_orden_trabajo DROP CONSTRAINT IF EXISTS uq_subtareas_numero;
ALTER TABLE public.subtareas_orden_trabajo
  ADD CONSTRAINT uq_subtareas_numero UNIQUE (id_orden, numero_subtarea);

-- 2. bitacora_subtareas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name  = 'bitacora_subtareas'
      AND column_name = 'id_orden_trabajo'
  ) THEN
    ALTER TABLE public.bitacora_subtareas RENAME COLUMN id_orden_trabajo TO id_orden;
  END IF;
END;
$$;

-- 3. evidencias_subtareas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name  = 'evidencias_subtareas'
      AND column_name = 'id_orden_trabajo'
  ) THEN
    ALTER TABLE public.evidencias_subtareas RENAME COLUMN id_orden_trabajo TO id_orden;
  END IF;
END;
$$;

-- Recreate index definitions on renamed columns
DROP INDEX IF EXISTS public.idx_subtasks_id_orden;
CREATE INDEX IF NOT EXISTS idx_subtasks_id_orden ON public.subtareas_orden_trabajo(id_orden);

DROP INDEX IF EXISTS public.idx_subtask_evidences_id_orden;
CREATE INDEX IF NOT EXISTS idx_subtask_evidences_id_orden ON public.evidencias_subtareas(id_orden);

-- Remove simulated password column from cat_usuarios_roles
ALTER TABLE public.cat_usuarios_roles DROP COLUMN IF EXISTS contrasenia;

-- ============================================================================
-- 4. VALIDATION VIEWS (Excel staging auditing)
-- ============================================================================

-- vw_validacion_maquinas_excel
CREATE OR REPLACE VIEW public.vw_validacion_maquinas_excel AS
SELECT 
    id_stg,
    equipo_towell,
    clave,
    area,
    proceso,
    tipo_equipo,
    activo,
    archivo_origen,
    fecha_carga,
    id_carga,
    CASE 
        WHEN equipo_towell IS NULL OR equipo_towell = '' THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN equipo_towell IS NULL OR equipo_towell = '' THEN 'Falta EQUIPO TOWELL (código operativo principal).'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_maquinas_excel;

-- vw_validacion_refacciones_excel
CREATE OR REPLACE VIEW public.vw_validacion_refacciones_excel AS
SELECT
    id_stg,
    codigo_articulo,
    nombre_articulo,
    unidad_medida,
    familia,
    activo,
    archivo_origen,
    fecha_carga,
    id_carga,
    CASE 
        WHEN codigo_articulo IS NULL OR codigo_articulo = '' THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN codigo_articulo IS NULL OR codigo_articulo = '' THEN 'Falta código de artículo.'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_refacciones_excel;

-- vw_validacion_tecnicos_excel
CREATE OR REPLACE VIEW public.vw_validacion_tecnicos_excel AS
SELECT
    id_stg,
    cve_tecnico,
    nombre_tecnico,
    departamento_codigo,
    turno_id,
    especialidad,
    puesto,
    correo,
    telefono,
    activo,
    archivo_origen,
    fecha_carga,
    id_carga,
    CASE 
        WHEN cve_tecnico IS NULL OR cve_tecnico = '' THEN FALSE
        WHEN nombre_tecnico IS NULL OR nombre_tecnico = '' THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN cve_tecnico IS NULL OR cve_tecnico = '' THEN 'Falta clave del técnico.'
        WHEN nombre_tecnico IS NULL OR nombre_tecnico = '' THEN 'Falta nombre del técnico.'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_tecnicos_excel;

-- vw_validacion_empleados_excel
CREATE OR REPLACE VIEW public.vw_validacion_empleados_excel AS
SELECT
    id_stg,
    cve_empleado,
    nombre_empleado,
    departamento_codigo,
    turno_id,
    puesto,
    correo,
    telefono,
    activo,
    archivo_origen,
    fecha_carga,
    id_carga,
    CASE 
        WHEN cve_empleado IS NULL OR cve_empleado = '' THEN FALSE
        WHEN nombre_empleado IS NULL OR nombre_empleado = '' THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN cve_empleado IS NULL OR cve_empleado = '' THEN 'Falta clave del empleado.'
        WHEN nombre_empleado IS NULL OR nombre_empleado = '' THEN 'Falta nombre del empleado.'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_empleados_excel;

-- vw_validacion_fallas_por_maquina
CREATE OR REPLACE VIEW public.vw_validacion_fallas_por_maquina AS
SELECT
    id,
    maquina_id,
    descripcion,
    creada,
    archivo_origen,
    fecha_carga,
    CASE 
        WHEN maquina_id IS NULL OR maquina_id = '' THEN FALSE
        WHEN NOT EXISTS (SELECT 1 FROM public.cat_maquinas m WHERE m.equipo_towell = maquina_id) THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN maquina_id IS NULL OR maquina_id = '' THEN 'Falta identificación de la máquina (equipo_towell).'
        WHEN NOT EXISTS (SELECT 1 FROM public.cat_maquinas m WHERE m.equipo_towell = maquina_id) THEN 'El telar no existe en el catálogo principal.'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_fallas_por_maquina_excel;

-- vw_validacion_telegram_ordenes
CREATE OR REPLACE VIEW public.vw_validacion_telegram_ordenes AS
SELECT
    id as id_original,
    folio,
    estatus,
    fecha,
    hora,
    depto,
    maquina_id,
    tipo_falla_id,
    falla,
    hora_fin,
    cve_empl,
    nom_empl,
    turno,
    cve_atendio,
    nom_atendio,
    turno_atendio,
    obs,
    orden_trabajo,
    descripcion,
    enviado,
    obs_cierre,
    calidad,
    fecha_fin,
    fecha_carga,
    CASE 
        WHEN id IS NULL THEN FALSE
        WHEN maquina_id IS NULL OR maquina_id = '' THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN id IS NULL THEN 'Falta ID único original.'
        WHEN maquina_id IS NULL OR maquina_id = '' THEN 'Falta identificación de la máquina (maquina_id).'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_telegram_ordenes_telares;

-- vw_validacion_refacciones_por_maquina
CREATE OR REPLACE VIEW public.vw_validacion_refacciones_por_maquina AS
SELECT
    id_stg,
    fecha,
    maquina_id,
    destino,
    codigo_articulo,
    nombre_articulo,
    cantidad_estandar,
    precio_costo_unitario,
    importe_costo_origen,
    archivo_origen,
    fecha_carga,
    id_carga,
    CASE 
        WHEN codigo_articulo IS NULL OR codigo_articulo = '' THEN FALSE
        WHEN NOT EXISTS (SELECT 1 FROM public.cat_refacciones r WHERE r.codigo_articulo = codigo_articulo) THEN FALSE
        WHEN COALESCE(maquina_id, destino) IS NULL OR COALESCE(maquina_id, destino) = '' THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN codigo_articulo IS NULL OR codigo_articulo = '' THEN 'Falta código de artículo.'
        WHEN NOT EXISTS (SELECT 1 FROM public.cat_refacciones r WHERE r.codigo_articulo = codigo_articulo) THEN 'El artículo no existe en catálogo de refacciones.'
        WHEN COALESCE(maquina_id, destino) IS NULL OR COALESCE(maquina_id, destino) = '' THEN 'Falta identificar la máquina de destino.'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_refacciones_por_maquina_excel;

-- vw_validacion_inventario_refacciones
CREATE OR REPLACE VIEW public.vw_validacion_inventario_refacciones AS
SELECT
    id_stg,
    codigo_articulo,
    codigo_proveedor,
    stock_actual,
    stock_minimo,
    stock_maximo,
    unidad_medida,
    ubicacion,
    costo_unitario,
    moneda,
    observaciones,
    archivo_origen,
    fecha_carga,
    id_carga,
    CASE 
        WHEN codigo_articulo IS NULL OR codigo_articulo = '' THEN FALSE
        WHEN NOT EXISTS (SELECT 1 FROM public.cat_refacciones r WHERE r.codigo_articulo = codigo_articulo) THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN codigo_articulo IS NULL OR codigo_articulo = '' THEN 'Falta código de artículo.'
        WHEN NOT EXISTS (SELECT 1 FROM public.cat_refacciones r WHERE r.codigo_articulo = codigo_articulo) THEN 'El artículo no existe en catálogo de refacciones.'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_inventario_refacciones_excel;

-- vw_validacion_costos_mano_obra
CREATE OR REPLACE VIEW public.vw_validacion_costos_mano_obra AS
SELECT
    id_stg,
    cve_tecnico,
    nombre_tecnico,
    costo_hora,
    moneda,
    fecha_inicio_vigencia,
    fecha_fin_vigencia,
    observaciones,
    archivo_origen,
    fecha_carga,
    id_carga,
    CASE 
        WHEN cve_tecnico IS NULL OR cve_tecnico = '' THEN FALSE
        WHEN NOT EXISTS (SELECT 1 FROM public.cat_tecnicos t WHERE t.cve_tecnico = cve_tecnico) THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN cve_tecnico IS NULL OR cve_tecnico = '' THEN 'Falta clave de técnico.'
        WHEN NOT EXISTS (SELECT 1 FROM public.cat_tecnicos t WHERE t.cve_tecnico = cve_tecnico) THEN 'El técnico no existe en catálogo de mantenimiento.'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_costos_mano_obra_excel;

-- Safe validation helper functions
CREATE OR REPLACE FUNCTION public.safe_is_date(val TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF val IS NULL THEN RETURN FALSE; END IF;
  PERFORM val::DATE;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.safe_is_numeric(val TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF val IS NULL THEN RETURN FALSE; END IF;
  PERFORM val::NUMERIC;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- vw_validacion_segundas_por_rollo
-- Soporta registros de CUALQUIER origen (Excel manual, API externa, integración automática).
-- La resolución de maquina_id es el paso central de validación: busca coincidencias en
-- cat_maquinas a través de todas las columnas candidatas del registro crudo.
-- Registros inválidos se muestran a los admins con su detalle; solo los válidos pasan a
-- segundas_por_rollo mediante upsert.
CREATE OR REPLACE VIEW public.vw_validacion_segundas_por_rollo AS
SELECT 
    s.*,
    COALESCE(
        (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.maquina_id_detectada LIMIT 1),
        (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.produccion LIMIT 1),
        (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.nombre LIMIT 1),
        (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.numero_serie LIMIT 1),
        (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.id_flog LIMIT 1),
        (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.salon LIMIT 1)
    ) as maquina_id_resuelta,
    CASE 
        WHEN s.id_carga IS NULL THEN FALSE
        WHEN s.defecto IS NULL OR s.defecto = '' THEN FALSE
        WHEN NOT public.safe_is_date(s.fecha) THEN FALSE
        WHEN NOT public.safe_is_numeric(s.cantidad) THEN FALSE
        WHEN COALESCE(
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.maquina_id_detectada LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.produccion LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.nombre LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.numero_serie LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.id_flog LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.salon LIMIT 1)
        ) IS NULL THEN FALSE
        WHEN public.safe_is_date(s.fecha) AND EXISTS (
            SELECT 1 FROM public.segundas_por_rollo r 
            WHERE r.fecha = s.fecha::DATE 
              AND r.produccion = s.produccion 
              AND r.codigo_defecto = s.codigo_defecto 
              AND r.numero_serie = COALESCE(s.numero_serie, '') 
              AND r.turno_tejido = COALESCE(s.turno_tejido, '')
        ) THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN s.id_carga IS NULL
            THEN 'Falta ID de carga de control.'
        WHEN s.defecto IS NULL OR s.defecto = ''
            THEN 'Falta descripción del defecto.'
        WHEN NOT public.safe_is_date(s.fecha)
            THEN 'Fecha inválida o no convertible.'
        WHEN NOT public.safe_is_numeric(s.cantidad)
            THEN 'Cantidad de defecto no es un valor numérico válido.'
        WHEN COALESCE(
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.maquina_id_detectada LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.produccion LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.nombre LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.numero_serie LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.id_flog LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.salon LIMIT 1)
        ) IS NULL
            THEN 'No se pudo identificar un telar válido en las columnas de máquina.'
        WHEN public.safe_is_date(s.fecha) AND EXISTS (
            SELECT 1 FROM public.segundas_por_rollo r 
            WHERE r.fecha = s.fecha::DATE 
              AND r.produccion = s.produccion 
              AND r.codigo_defecto = s.codigo_defecto 
              AND r.numero_serie = COALESCE(s.numero_serie, '') 
              AND r.turno_tejido = COALESCE(s.turno_tejido, '')
        ) THEN 'El registro ya existe en el histórico de Segundas por Rollo (Duplicado).'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_segundas_por_rollo_excel s;

-- ============================================================================
-- 5. QUALITY & MAINTENANCE ANALYTICAL VIEWS
-- ============================================================================

-- vw_ranking_semanal_segundas_telares
CREATE OR REPLACE VIEW public.vw_ranking_semanal_segundas_telares AS
SELECT 
    maquina_id, 
    anio, 
    semana, 
    SUM(pzas_rollo) as total_piezas, 
    SUM(cantidad_defecto) as total_defectos,
    DENSE_RANK() OVER (PARTITION BY anio, semana ORDER BY SUM(cantidad_defecto) DESC) as ranking_defecto
FROM public.segundas_por_rollo
WHERE activo = TRUE
GROUP BY maquina_id, anio, semana;

-- vw_defectos_por_telar
CREATE OR REPLACE VIEW public.vw_defectos_por_telar AS
WITH ranked_defectos AS (
    SELECT 
        maquina_id, 
        defecto, 
        SUM(cantidad_defecto) as total_defecto,
        ROW_NUMBER() OVER (PARTITION BY maquina_id ORDER BY SUM(cantidad_defecto) DESC) as rn
    FROM public.segundas_por_rollo
    WHERE activo = TRUE
    GROUP BY maquina_id, defecto
)
SELECT 
    maquina_id, 
    defecto as defecto_principal, 
    total_defecto
FROM ranked_defectos 
WHERE rn = 1;

-- vw_segundas_vs_fallas_maquina
CREATE OR REPLACE VIEW public.vw_segundas_vs_fallas_maquina AS
SELECT 
    s.maquina_id,
    s.anio,
    s.semana,
    SUM(s.cantidad_defecto) as total_segundas,
    SUM(s.pzas_rollo) as total_piezas,
    (SELECT d.defecto_principal FROM public.vw_defectos_por_telar d WHERE d.maquina_id = s.maquina_id) as defecto_principal,
    COALESCE(COUNT(DISTINCT f.id_falla), 0) as total_fallas,
    COALESCE(
        (SELECT f2.categoria_falla FROM public.fallas_por_maquina f2 
         WHERE f2.maquina_id = s.maquina_id 
         GROUP BY f2.categoria_falla ORDER BY COUNT(*) DESC LIMIT 1), 
        'Sin clasificar'
    ) as falla_principal,
    CASE 
        WHEN SUM(s.cantidad_defecto) > 10 AND COUNT(DISTINCT f.id_falla) > 0 THEN 'Alta'
        WHEN SUM(s.cantidad_defecto) > 5 OR COUNT(DISTINCT f.id_falla) > 0 THEN 'Media'
        ELSE 'Baja'
    END as coincidencia_calidad_mantenimiento,
    CASE 
        WHEN SUM(s.cantidad_defecto) > 10 AND COUNT(DISTINCT f.id_falla) > 0 THEN 'Programar mantenimiento predictivo urgente y revisar guías.'
        WHEN SUM(s.cantidad_defecto) > 5 THEN 'Programar inspección autónoma semanal.'
        ELSE 'Monitorear comportamiento.'
    END as recomendacion
FROM public.segundas_por_rollo s
LEFT JOIN public.fallas_por_maquina f ON f.maquina_id = s.maquina_id AND EXTRACT(WEEK FROM f.fecha_hora_creada) = s.semana AND EXTRACT(YEAR FROM f.fecha_hora_creada) = s.anio
WHERE s.activo = TRUE
GROUP BY s.maquina_id, s.anio, s.semana;

-- vw_segundas_vs_ordenes_telegram
CREATE OR REPLACE VIEW public.vw_segundas_vs_ordenes_telegram AS
SELECT 
    s.maquina_id,
    s.fecha as fecha_segundas,
    s.semana,
    s.defecto,
    s.turno_tejido,
    s.salon,
    o.folio as folio_ot,
    o.falla as falla_telegram,
    o.estatus as estatus_ot,
    o.fecha_inicio as fecha_ot,
    o.nombre_atendio as tecnico_atendio
FROM public.segundas_por_rollo s
LEFT JOIN public.ordenes_trabajo o ON o.maquina_id = s.maquina_id AND o.fecha_inicio = s.fecha
WHERE s.activo = TRUE;

-- vw_segundas_vs_fallas_maquina_mensual
CREATE OR REPLACE VIEW public.vw_segundas_vs_fallas_maquina_mensual AS
SELECT 
    s.maquina_id,
    s.anio,
    s.mes,
    SUM(s.cantidad_defecto) as total_segundas,
    SUM(s.pzas_rollo) as total_piezas,
    COALESCE(
        (SELECT d.defecto_principal FROM public.vw_defectos_por_telar d WHERE d.maquina_id = s.maquina_id LIMIT 1),
        'Sin clasificar'
    ) as defecto_principal,
    COALESCE(COUNT(DISTINCT f.id_falla), 0) as total_fallas,
    COALESCE(
        (SELECT f2.categoria_falla FROM public.fallas_por_maquina f2 
         WHERE f2.maquina_id = s.maquina_id 
         GROUP BY f2.categoria_falla ORDER BY COUNT(*) DESC LIMIT 1), 
        'Sin clasificar'
    ) as falla_principal,
    CASE 
        WHEN SUM(s.cantidad_defecto) > 10 AND COUNT(DISTINCT f.id_falla) > 0 THEN 'Alta'
        WHEN SUM(s.cantidad_defecto) > 5 OR COUNT(DISTINCT f.id_falla) > 0 THEN 'Media'
        ELSE 'Baja'
    END as coincidencia_calidad_mantenimiento,
    CASE 
        WHEN SUM(s.cantidad_defecto) > 10 AND COUNT(DISTINCT f.id_falla) > 0 THEN 'Programar mantenimiento predictivo urgente y revisar guías.'
        WHEN SUM(s.cantidad_defecto) > 5 THEN 'Programar inspección autónoma semanal.'
        ELSE 'Monitorear comportamiento.'
    END as recomendacion
FROM public.segundas_por_rollo s
LEFT JOIN public.fallas_por_maquina f ON f.maquina_id = s.maquina_id 
    AND EXTRACT(MONTH FROM f.fecha_hora_creada) = s.mes 
    AND EXTRACT(YEAR FROM f.fecha_hora_creada) = s.anio
WHERE s.activo = TRUE
GROUP BY s.maquina_id, s.anio, s.mes;

-- vw_refacciones_sugeridas_por_calendario
CREATE OR REPLACE VIEW public.vw_refacciones_sugeridas_por_calendario AS
SELECT 
    rm.maquina_id,
    'Predictivo/Autónomo' as tipo_mantenimiento,
    rm.codigo_articulo,
    rm.nombre_articulo,
    rm.cantidad_estandar,
    COALESCE(i.stock_actual, 0) as stock_actual,
    COALESCE(i.stock_minimo, 0) as stock_minimo,
    CASE 
        WHEN COALESCE(i.stock_actual, 0) <= 0 THEN 'Crítico'
        WHEN COALESCE(i.stock_actual, 0) < COALESCE(i.stock_minimo, 0) THEN 'Bajo'
        ELSE 'OK'
    END as riesgo_stock,
    COALESCE(i.costo_unitario, rm.precio_costo_unitario) as costo_estimado
FROM public.refacciones_por_maquina rm
LEFT JOIN public.inventario_refacciones i ON i.codigo_articulo = rm.codigo_articulo;

-- ============================================================================
-- ============================================================================
-- 6. CALENDAR VIEWS
-- ============================================================================

-- vw_calendario_preventivo_anual
CREATE OR REPLACE VIEW public.vw_calendario_preventivo_anual AS
SELECT 
    EXTRACT(YEAR FROM p.proxima_ejecucion)::int as anio,
    EXTRACT(MONTH FROM p.proxima_ejecucion)::int as periodo,
    p.maquina_id,
    p.codigo_servicio,
    p.nombre_plan as actividad_sugerida,
    p.proxima_ejecucion as fecha_programada,
    p.responsable as cve_tecnico,
    'PREVENTIVO'::varchar as tipo_mantenimiento,
    'Media'::varchar as prioridad,
    0.00::numeric as score_riesgo,
    'Bajo'::varchar as nivel_riesgo_calidad
FROM public.planes_mantenimiento_preventivo p
WHERE p.activo = TRUE;

-- vw_calendario_predictivo_mensual
CREATE OR REPLACE VIEW public.vw_calendario_predictivo_mensual AS
SELECT 
    s.anio,
    s.mes as periodo,
    s.maquina_id,
    'PREDICTIVO'::varchar as tipo_mantenimiento,
    s.recomendacion as actividad_sugerida,
    (CURRENT_DATE + INTERVAL '1 month')::date as fecha_programada,
    NULL::varchar as cve_tecnico,
    CASE 
        WHEN s.coincidencia_calidad_mantenimiento = 'Alta' THEN 'Alta'::varchar
        WHEN s.coincidencia_calidad_mantenimiento = 'Media' THEN 'Media'::varchar
        ELSE 'Baja'::varchar
    END as prioridad,
    CASE 
        WHEN s.coincidencia_calidad_mantenimiento = 'Alta' THEN 90.00
        WHEN s.coincidencia_calidad_mantenimiento = 'Media' THEN 65.00
        ELSE 30.00
    END as score_riesgo,
    s.coincidencia_calidad_mantenimiento as nivel_riesgo_calidad
FROM public.vw_segundas_vs_fallas_maquina_mensual s;

-- vw_calendario_autonomo_semanal
CREATE OR REPLACE VIEW public.vw_calendario_autonomo_semanal AS
SELECT 
    s.anio,
    s.semana as periodo,
    s.maquina_id,
    'AUTONOMO'::varchar as tipo_mantenimiento,
    COALESCE(
        (SELECT r.actividad_autonoma_sugerida FROM public.cat_relacion_defecto_falla r WHERE r.defecto_calidad = s.defecto LIMIT 1),
        'Realizar inspección autónoma general'
    ) as actividad_sugerida,
    (CURRENT_DATE + INTERVAL '7 days')::date as fecha_programada,
    NULL::varchar as cve_tecnico,
    SUM(s.pzas_rollo) as total_piezas,
    SUM(s.cantidad_defecto) as total_segundas,
    CASE 
        WHEN SUM(s.cantidad_defecto) > 10 THEN 'Alta'::varchar
        WHEN SUM(s.cantidad_defecto) > 5 THEN 'Media'::varchar
        ELSE 'Baja'::varchar
    END as prioridad,
    (SUM(s.cantidad_defecto) * 5 + COALESCE((SELECT COUNT(*) FROM public.fallas_por_maquina f WHERE f.maquina_id = s.maquina_id AND EXTRACT(WEEK FROM f.fecha_hora_creada) = s.semana), 0) * 10) as score_riesgo,
    CASE 
        WHEN SUM(s.cantidad_defecto) > 10 THEN 'Alto'::varchar
        WHEN SUM(s.cantidad_defecto) > 5 THEN 'Medio'::varchar
        ELSE 'Baja'::varchar
    END as nivel_riesgo_calidad
FROM public.segundas_por_rollo s
WHERE s.activo = TRUE
GROUP BY s.anio, s.semana, s.maquina_id, s.turno_tejido, s.defecto;

-- vw_calendario_mantenimiento_general
CREATE OR REPLACE VIEW public.vw_calendario_mantenimiento_general AS
SELECT 
    id_detalle,
    id_calendario,
    maquina_id,
    fecha_programada,
    turno_sugerido,
    tipo_mantenimiento,
    prioridad,
    actividad_sugerida,
    responsable_sugerido,
    fuente_principal,
    score_riesgo,
    estatus_detalle,
    requiere_ot,
    id_orden_generada
FROM public.calendario_mantenimiento_detalle;

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS Policies for Admins and Maintenance)
-- ============================================================================

-- Create helper function for role verification if not exists
CREATE OR REPLACE FUNCTION public.check_user_role(required_role VARCHAR)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.cat_usuarios_roles
    WHERE correo = auth.jwt()->>'email'
      AND rol = required_role
      AND activo = TRUE
  );
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on Clean Tables
ALTER TABLE public.segundas_por_rollo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_relacion_defecto_falla ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendarios_mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_mantenimiento_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_mantenimiento_fuentes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS super_admin_all ON public.segundas_por_rollo;
DROP POLICY IF EXISTS mantenimiento_select ON public.segundas_por_rollo;
DROP POLICY IF EXISTS super_admin_all ON public.cat_relacion_defecto_falla;
DROP POLICY IF EXISTS mantenimiento_select ON public.cat_relacion_defecto_falla;
DROP POLICY IF EXISTS super_admin_all ON public.calendarios_mantenimiento;
DROP POLICY IF EXISTS mantenimiento_select ON public.calendarios_mantenimiento;
DROP POLICY IF EXISTS super_admin_all ON public.calendario_mantenimiento_detalle;
DROP POLICY IF EXISTS mantenimiento_select ON public.calendario_mantenimiento_detalle;
DROP POLICY IF EXISTS super_admin_all ON public.calendario_mantenimiento_fuentes;
DROP POLICY IF EXISTS mantenimiento_select ON public.calendario_mantenimiento_fuentes;

-- Create Policies for Clean Tables
CREATE POLICY super_admin_all ON public.segundas_por_rollo FOR ALL TO authenticated USING (public.check_user_role('SUPER_ADMINISTRADOR')) WITH CHECK (public.check_user_role('SUPER_ADMINISTRADOR'));
CREATE POLICY mantenimiento_select ON public.segundas_por_rollo FOR SELECT TO authenticated USING (public.check_user_role('MANTENIMIENTO') OR public.check_user_role('SUPER_ADMINISTRADOR'));

CREATE POLICY super_admin_all ON public.cat_relacion_defecto_falla FOR ALL TO authenticated USING (public.check_user_role('SUPER_ADMINISTRADOR')) WITH CHECK (public.check_user_role('SUPER_ADMINISTRADOR'));
CREATE POLICY mantenimiento_select ON public.cat_relacion_defecto_falla FOR SELECT TO authenticated USING (public.check_user_role('MANTENIMIENTO') OR public.check_user_role('SUPER_ADMINISTRADOR'));

CREATE POLICY super_admin_all ON public.calendarios_mantenimiento FOR ALL TO authenticated USING (public.check_user_role('SUPER_ADMINISTRADOR')) WITH CHECK (public.check_user_role('SUPER_ADMINISTRADOR'));
CREATE POLICY mantenimiento_select ON public.calendarios_mantenimiento FOR SELECT TO authenticated USING (public.check_user_role('MANTENIMIENTO') OR public.check_user_role('SUPER_ADMINISTRADOR'));

CREATE POLICY super_admin_all ON public.calendario_mantenimiento_detalle FOR ALL TO authenticated USING (public.check_user_role('SUPER_ADMINISTRADOR')) WITH CHECK (public.check_user_role('SUPER_ADMINISTRADOR'));
CREATE POLICY mantenimiento_select ON public.calendario_mantenimiento_detalle FOR SELECT TO authenticated USING (public.check_user_role('MANTENIMIENTO') OR public.check_user_role('SUPER_ADMINISTRADOR'));

CREATE POLICY super_admin_all ON public.calendario_mantenimiento_fuentes FOR ALL TO authenticated USING (public.check_user_role('SUPER_ADMINISTRADOR')) WITH CHECK (public.check_user_role('SUPER_ADMINISTRADOR'));
CREATE POLICY mantenimiento_select ON public.calendario_mantenimiento_fuentes FOR SELECT TO authenticated USING (public.check_user_role('MANTENIMIENTO') OR public.check_user_role('SUPER_ADMINISTRADOR'));

-- Disable RLS en todas las tablas staging para permitir la carga masiva desde el cliente sin sesión de Supabase Auth.
ALTER TABLE public.stg_maquinas_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_refacciones_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_tecnicos_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_empleados_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_refacciones_por_maquina_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_historico_precios_refacciones_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_inventario_refacciones_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_costos_mano_obra_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_fallas_por_maquina_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_segundas_por_rollo_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_telegram_ordenes_telares DISABLE ROW LEVEL SECURITY;

-- Limpieza de políticas anteriores
DROP POLICY IF EXISTS super_admin_staging ON public.stg_maquinas_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_refacciones_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_tecnicos_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_empleados_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_refacciones_por_maquina_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_historico_precios_refacciones_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_inventario_refacciones_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_costos_mano_obra_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_segundas_por_rollo_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_fallas_por_maquina_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_telegram_ordenes_telares;
DROP POLICY IF EXISTS telegram_admin_select ON public.stg_telegram_ordenes_telares;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_segundas_por_rollo_excel;
DROP POLICY IF EXISTS segundas_admin_select ON public.stg_segundas_por_rollo_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_telegram_ordenes_telares;
DROP POLICY IF EXISTS telegram_admin_select ON public.stg_telegram_ordenes_telares;



