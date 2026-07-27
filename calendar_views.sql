-- ============================================================
-- VISTAS DE CALENDARIO INTELIGENTE CONSOLIDADAS - TSMAI (Puntos 1 al 18)
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Eliminar vistas previas para evitar conflictos de estructura
DROP VIEW IF EXISTS public.vw_calendario_consolidado CASCADE;
DROP VIEW IF EXISTS public.vw_preventivo_anual CASCADE;
DROP VIEW IF EXISTS public.vw_predictivo_mensual CASCADE;
DROP VIEW IF EXISTS public.vw_autonomo_semanal CASCADE;

-- ============================================================
-- VISTA 1: PREVENTIVO ANUAL (Cobertura 100% Máquinas Activas)
-- ============================================================
CREATE OR REPLACE VIEW public.vw_preventivo_anual AS
WITH fallas_historicas AS (
    SELECT
        maquina_id,
        COUNT(*) AS total_fallas,
        MAX(fecha_creada) AS ultima_falla
    FROM public.fallas_por_maquina
    WHERE maquina_id IS NOT NULL
    GROUP BY maquina_id
)
SELECT
    gen_random_uuid()                         AS id_sugerencia,
    'PREVENTIVO'                              AS tipo_mantenimiento,
    m.equipo_towell                           AS maquina_id,
    COALESCE(m.area, m.departamento_codigo, 'PF') AS area,
    ('Preventivo Anual - ' || m.equipo_towell)::VARCHAR(255) AS actividad,
    ('Mantenimiento preventivo anual programado para equipo ' || m.equipo_towell || ' (Área: ' || COALESCE(m.area, m.departamento_codigo, 'PF') || '). Historial: ' || COALESCE(fh.total_fallas, 0) || ' fallas.')::TEXT AS descripcion,
    CASE 
        WHEN fh.ultima_falla IS NOT NULL AND (fh.ultima_falla + INTERVAL '3 months')::DATE < CURRENT_DATE 
        THEN (CURRENT_DATE + INTERVAL '14 days')::DATE
        ELSE (CURRENT_DATE + INTERVAL '30 days')::DATE
    END AS fecha_sugerida,
    CASE
        WHEN COALESCE(fh.total_fallas, 0) >= 10 THEN 'ALTA'
        WHEN COALESCE(fh.total_fallas, 0) >= 5  THEN 'MEDIA'
        ELSE 'BAJA'
    END::VARCHAR(50)                          AS prioridad,
    COALESCE(fh.total_fallas, 0)::INT         AS fallas_acumuladas_anio,
    EXTRACT(YEAR FROM CURRENT_DATE)::INT      AS anio_plan
FROM public.cat_maquinas m
LEFT JOIN fallas_historicas fh ON m.equipo_towell = fh.maquina_id;


-- ============================================================
-- VISTA 2: PREDICTIVO MENSUAL (Exclusivo PF - Basado en Segundas Semanales)
-- ============================================================
CREATE OR REPLACE VIEW public.vw_predictivo_mensual AS
WITH segundas_semanales AS (
    SELECT
        s.maquina_id,
        SUM(s.cantidad_defecto) AS total_segundas,
        COUNT(DISTINCT s.codigo_defecto) AS variedades_defecto,
        MAX(s.fecha) AS ultima_fecha
    FROM public.segundas_por_rollo s
    JOIN public.cat_maquinas m ON s.maquina_id = m.equipo_towell
    WHERE COALESCE(m.area, m.departamento_codigo, 'PF') = 'PF' 
      AND s.activo = TRUE
      AND s.fecha >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY s.maquina_id
),
ranking_telares AS (
    SELECT
        ss.maquina_id,
        ss.total_segundas,
        ss.variedades_defecto,
        DENSE_RANK() OVER (ORDER BY ss.total_segundas DESC) AS rank_peor_telar
    FROM segundas_semanales ss
)
SELECT
    gen_random_uuid()                AS id_sugerencia,
    'PREDICTIVO'                     AS tipo_mantenimiento,
    rt.maquina_id,
    'PF'                             AS area,
    ('Intervención Predictiva PF: Telar #' || rt.rank_peor_telar || ' en segundas')::VARCHAR(255) AS actividad,
    ('Levantamiento predictivo priorizado por ' || rt.total_segundas || ' segundas detectadas en los últimos 30 días.')::TEXT AS descripcion,
    (DATE_TRUNC('month', CURRENT_DATE) + (rt.rank_peor_telar * INTERVAL '7 days'))::DATE AS fecha_sugerida,
    CASE
        WHEN rt.rank_peor_telar = 1 THEN 'CRITICA'
        WHEN rt.rank_peor_telar <= 3 THEN 'ALTA'
        ELSE 'MEDIA'
    END::VARCHAR(50)                 AS prioridad,
    rt.total_segundas::INT           AS fallas_excel,
    'SEGUNDAS_SEMANALES'::VARCHAR(100) AS fuente_predictiva,
    EXTRACT(YEAR FROM CURRENT_DATE)::INT  AS anio_plan,
    EXTRACT(MONTH FROM CURRENT_DATE)::INT AS mes_plan
FROM ranking_telares rt
WHERE rt.rank_peor_telar <= 4; -- Máximo 1 telar por semana (máx 4 por mes)


-- ============================================================
-- VISTA 3: AUTÓNOMO SEMANAL (PF, CF, AF, TF - Inspección de 5 Bloques)
-- ============================================================
CREATE OR REPLACE VIEW public.vw_autonomo_semanal AS
SELECT
    gen_random_uuid()               AS id_sugerencia,
    'AUTONOMO'                      AS tipo_mantenimiento,
    m.equipo_towell                 AS maquina_id,
    COALESCE(m.area, m.departamento_codigo, 'PF') AS area,
    ('Inspección Autónoma Semanal - ' || m.equipo_towell)::VARCHAR(255) AS actividad,
    'Revisión autónoma programada: Vibración (mm/s, Hz), Limpieza, Lubricación, Temperatura (°C) y Cableado.'::TEXT AS descripcion,
    (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '3 days')::DATE AS fecha_sugerida,
    'MEDIA'::VARCHAR(50)            AS prioridad,
    EXTRACT(YEAR FROM CURRENT_DATE)::INT  AS anio_plan,
    EXTRACT(WEEK FROM CURRENT_DATE)::INT  AS semana_plan
FROM public.cat_maquinas m;


-- ============================================================
-- VISTA MAESTRA: CALENDARIO CONSOLIDADO
-- ============================================================
CREATE OR REPLACE VIEW public.vw_calendario_consolidado AS
SELECT
    id_sugerencia,
    tipo_mantenimiento,
    maquina_id,
    area,
    actividad,
    descripcion,
    fecha_sugerida,
    prioridad,
    anio_plan    AS anio,
    NULL::INT    AS mes,
    NULL::INT    AS semana,
    fallas_acumuladas_anio
FROM public.vw_preventivo_anual

UNION ALL

SELECT
    id_sugerencia,
    tipo_mantenimiento,
    maquina_id,
    area,
    actividad,
    descripcion,
    fecha_sugerida,
    prioridad,
    anio_plan   AS anio,
    mes_plan    AS mes,
    NULL::INT   AS semana,
    fallas_excel AS fallas_acumuladas_anio
FROM public.vw_predictivo_mensual

UNION ALL

SELECT
    id_sugerencia,
    tipo_mantenimiento,
    maquina_id,
    area,
    actividad,
    descripcion,
    fecha_sugerida,
    prioridad,
    anio_plan                           AS anio,
    EXTRACT(MONTH FROM fecha_sugerida)::INT AS mes,
    semana_plan                         AS semana,
    0                                   AS fallas_acumuladas_anio
FROM public.vw_autonomo_semanal;
