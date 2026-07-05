-- ============================================================
-- VISTAS DE CALENDARIO INTELIGENTE - TSMAI
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Eliminar vistas previas para evitar conflictos de tipo/columnas
DROP VIEW IF EXISTS public.vw_calendario_consolidado CASCADE;
DROP VIEW IF EXISTS public.vw_preventivo_anual CASCADE;
DROP VIEW IF EXISTS public.vw_predictivo_mensual CASCADE;
DROP VIEW IF EXISTS public.vw_autonomo_semanal CASCADE;

-- ============================================================
-- ============================================================
-- VISTA 1: PREVENTIVO ANUAL (Dinamizado por Historial de Fallas)
-- ============================================================
CREATE OR REPLACE VIEW public.vw_preventivo_anual AS
WITH last_fallas AS (
    SELECT
        maquina_id,
        categoria_falla,
        COUNT(*) AS total_fallas,
        MAX(fecha_creada) AS ultima_fecha_falla,
        MAX(id_falla::TEXT)::UUID AS id_referencia
    FROM public.fallas_por_maquina
    WHERE maquina_id IS NOT NULL AND categoria_falla IS NOT NULL
    GROUP BY maquina_id, categoria_falla
)
SELECT
    gen_random_uuid()                         AS id_sugerencia,
    'PREVENTIVO'                              AS tipo_mantenimiento,
    lf.id_referencia                          AS id_referencia,
    lf.maquina_id,
    ('Preventivo: ' || lf.categoria_falla)::VARCHAR(255) AS actividad,
    ('Mantenimiento preventivo sugerido por historial de ' || lf.total_fallas || ' fallas de tipo ' || lf.categoria_falla)::TEXT AS descripcion,
    CASE 
        WHEN (lf.ultima_fecha_falla + INTERVAL '3 months')::DATE < CURRENT_DATE 
        THEN (CURRENT_DATE + INTERVAL '10 days')::DATE
        ELSE (lf.ultima_fecha_falla + INTERVAL '3 months')::DATE
    END AS fecha_sugerida,
    CASE
        WHEN lf.total_fallas >= 10 THEN 'ALTA'
        WHEN lf.total_fallas >= 5  THEN 'MEDIA'
        ELSE 'BAJA'
    END::VARCHAR(50)                          AS prioridad,
    lf.total_fallas::INT                      AS fallas_acumuladas_anio,
    NULL::VARCHAR(150)                        AS responsable,
    EXTRACT(YEAR FROM CURRENT_DATE)::INT      AS anio_plan
FROM last_fallas lf;


-- ============================================================
-- VISTA 2: PREDICTIVO MENSUAL
-- ============================================================
CREATE OR REPLACE VIEW public.vw_predictivo_mensual AS
WITH
fallas_mes_actual AS (
    SELECT
        maquina_id,
        categoria_falla,
        COUNT(*) AS total_este_mes
    FROM public.fallas_por_maquina
    WHERE fecha_creada >= DATE_TRUNC('month', CURRENT_DATE)
      AND fecha_creada <  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    GROUP BY maquina_id, categoria_falla
),
fallas_telegram_mes AS (
    SELECT
        maquina_id,
        tipo_falla_id AS categoria_falla,
        COUNT(*) AS total_telegram
    FROM public.stg_telegram_ordenes_telares
    WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE)::DATE
      AND fecha <  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE
    GROUP BY maquina_id, tipo_falla_id
),
consolidado_mes AS (
    SELECT
        COALESCE(h.maquina_id, t.maquina_id)             AS maquina_id,
        COALESCE(h.categoria_falla, t.categoria_falla)   AS categoria_falla,
        COALESCE(h.total_este_mes, 0)                    AS fallas_excel,
        COALESCE(t.total_telegram, 0)                    AS fallas_telegram,
        COALESCE(h.total_este_mes, 0) + COALESCE(t.total_telegram, 0) AS total_fallas_mes
    FROM fallas_mes_actual h
    FULL OUTER JOIN fallas_telegram_mes t
        ON h.maquina_id = t.maquina_id
        AND h.categoria_falla = t.categoria_falla
),
estacionalidad AS (
    SELECT
        maquina_id,
        EXTRACT(MONTH FROM fecha_creada)::INT AS numero_mes,
        COUNT(*)                               AS total_fallas_historicas,
        COUNT(DISTINCT EXTRACT(YEAR FROM fecha_creada)) AS anios_con_datos,
        ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT EXTRACT(YEAR FROM fecha_creada)), 0), 1) AS promedio_fallas_ese_mes
    FROM public.fallas_por_maquina
    WHERE fecha_creada < DATE_TRUNC('month', CURRENT_DATE)
      AND maquina_id IS NOT NULL
    GROUP BY maquina_id, EXTRACT(MONTH FROM fecha_creada)::INT
),
mes_peligroso AS (
    SELECT
        maquina_id,
        numero_mes,
        promedio_fallas_ese_mes,
        anios_con_datos,
        CASE
            WHEN promedio_fallas_ese_mes >= 15 THEN 'CRITICA'
            WHEN promedio_fallas_ese_mes >= 8  THEN 'ALTA'
            WHEN promedio_fallas_ese_mes >= 3  THEN 'MEDIA'
            ELSE 'BAJA'
        END AS prioridad_estacional
    FROM estacionalidad
    WHERE numero_mes = EXTRACT(MONTH FROM CURRENT_DATE)::INT
      AND promedio_fallas_ese_mes >= 3
),
tendencia_paros AS (
    SELECT
        maquina_id,
        COUNT(*) FILTER (WHERE fecha_creada >= CURRENT_DATE - INTERVAL '90 days') AS fallas_ultimos_3_meses,
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM fecha_creada) = EXTRACT(YEAR FROM CURRENT_DATE)) AS fallas_anio_actual,
        ROUND(COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM fecha_creada) = EXTRACT(YEAR FROM CURRENT_DATE))::NUMERIC / NULLIF(EXTRACT(MONTH FROM CURRENT_DATE), 0), 1) AS promedio_mensual_anio,
        COUNT(*) FILTER (WHERE fecha_creada >= CURRENT_DATE - INTERVAL '90 days') / 3.0 AS promedio_ultimos_3_meses
    FROM public.fallas_por_maquina
    WHERE maquina_id IS NOT NULL
    GROUP BY maquina_id
    HAVING COUNT(*) FILTER (WHERE fecha_creada >= CURRENT_DATE - INTERVAL '90 days') / 3.0 > 1.5 * ROUND(COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM fecha_creada) = EXTRACT(YEAR FROM CURRENT_DATE))::NUMERIC / NULLIF(EXTRACT(MONTH FROM CURRENT_DATE), 0), 1)
       AND COUNT(*) FILTER (WHERE fecha_creada >= CURRENT_DATE - INTERVAL '90 days') >= 3
)
SELECT
    gen_random_uuid()                AS id_sugerencia,
    'PREDICTIVO'                     AS tipo_mantenimiento,
    c.maquina_id,
    c.categoria_falla                AS actividad,
    'Intervención predictiva: repetibilidad de fallas este mes'::TEXT AS descripcion,
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE AS fecha_sugerida,
    CASE
        WHEN c.total_fallas_mes >= 10 THEN 'CRITICA'
        WHEN c.total_fallas_mes >= 5  THEN 'ALTA'
        WHEN c.total_fallas_mes >= 3  THEN 'MEDIA'
        ELSE 'BAJA'
    END::VARCHAR(50)                 AS prioridad,
    c.fallas_excel::INT              AS fallas_excel,
    c.fallas_telegram::INT           AS fallas_telegram,
    c.total_fallas_mes::INT          AS total_fallas_mes,
    NULL::NUMERIC                    AS promedio_historico_mes,
    NULL::INT                        AS anios_con_datos,
    'REPETIBILIDAD_ACTUAL'::VARCHAR(100) AS fuente_predictiva,
    EXTRACT(YEAR FROM CURRENT_DATE)::INT  AS anio_plan,
    EXTRACT(MONTH FROM CURRENT_DATE)::INT AS mes_plan
FROM consolidado_mes c
WHERE c.total_fallas_mes >= 2

UNION ALL

SELECT
    gen_random_uuid()                AS id_sugerencia,
    'PREDICTIVO'                     AS tipo_mantenimiento,
    mp.maquina_id,
    'Estacionalidad: Mes crít. hist.'::TEXT AS actividad,
    'Mes problemático. Prom.: ' || ROUND(mp.promedio_fallas_ese_mes, 1)::TEXT || ' fallas/año en ' || mp.anios_con_datos::TEXT || ' años.'::TEXT AS descripcion,
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '15 days')::DATE AS fecha_sugerida,
    mp.prioridad_estacional::VARCHAR(50) AS prioridad,
    NULL::INT                        AS fallas_excel,
    NULL::INT                        AS fallas_telegram,
    NULL::INT                        AS total_fallas_mes,
    mp.promedio_fallas_ese_mes       AS promedio_historico_mes,
    mp.anios_con_datos               AS anios_con_datos,
    'ESTACIONALIDAD'::VARCHAR(100)   AS fuente_predictiva,
    EXTRACT(YEAR FROM CURRENT_DATE)::INT  AS anio_plan,
    EXTRACT(MONTH FROM CURRENT_DATE)::INT AS mes_plan
FROM mes_peligroso mp
WHERE mp.maquina_id NOT IN (SELECT maquina_id FROM consolidado_mes WHERE total_fallas_mes >= 2)

UNION ALL

SELECT
    gen_random_uuid()                AS id_sugerencia,
    'PREDICTIVO'                     AS tipo_mantenimiento,
    tp.maquina_id,
    'Tendencia Paros: Exceso fallas'::TEXT AS actividad,
    'Prom. últimos 3 meses: ' || ROUND(tp.promedio_ultimos_3_meses::NUMERIC, 1)::TEXT || ' fallas/mes vs prom. anual: ' || ROUND(tp.promedio_mensual_anio, 1)::TEXT || ' fallas/mes.'::TEXT AS descripcion,
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '7 days')::DATE AS fecha_sugerida,
    CASE
        WHEN tp.fallas_ultimos_3_meses >= 30 THEN 'CRITICA'
        WHEN tp.fallas_ultimos_3_meses >= 15 THEN 'ALTA'
        ELSE 'MEDIA'
    END::VARCHAR(50)                 AS prioridad,
    NULL::INT                        AS fallas_excel,
    NULL::INT                        AS fallas_telegram,
    tp.fallas_ultimos_3_meses::INT   AS total_fallas_mes,
    tp.promedio_mensual_anio         AS promedio_historico_mes,
    NULL::INT                        AS anios_con_datos,
    'TENDENCIA_PAROS'::VARCHAR(100)  AS fuente_predictiva,
    EXTRACT(YEAR FROM CURRENT_DATE)::INT  AS anio_plan,
    EXTRACT(MONTH FROM CURRENT_DATE)::INT AS mes_plan
FROM tendencia_paros tp;


-- ============================================================
-- VISTA 3: AUTÓNOMO SEMANAL
-- ============================================================
CREATE OR REPLACE VIEW public.vw_autonomo_semanal AS
WITH semana_anterior AS (
    SELECT
        s.maquina_id,
        s.codigo_defecto,
        s.defecto,
        SUM(s.cantidad_defecto) AS total_defectos
    FROM public.segundas_por_rollo s
    WHERE s.fecha >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days'
      AND s.fecha <  DATE_TRUNC('week', CURRENT_DATE)
      AND s.activo = TRUE
    GROUP BY s.maquina_id, s.codigo_defecto, s.defecto
)
SELECT
    gen_random_uuid()               AS id_sugerencia,
    'AUTONOMO'                      AS tipo_mantenimiento,
    sa.maquina_id,
    COALESCE(r.actividad_autonoma_sugerida, 'Inspección autónoma: ' || sa.defecto)::VARCHAR(255) AS actividad,
    'Tarea autónoma generada por defecto de calidad detectado la semana anterior'::TEXT AS descripcion,
    (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '4 days')::DATE AS fecha_sugerida,
    CASE
        WHEN sa.total_defectos >= 20 THEN 'ALTA'
        WHEN sa.total_defectos >= 10 THEN 'MEDIA'
        ELSE 'BAJA'
    END::VARCHAR(50)                AS prioridad,
    sa.codigo_defecto::VARCHAR(100) AS codigo_defecto,
    sa.defecto::VARCHAR(255)        AS defecto,
    sa.total_defectos::NUMERIC      AS total_defectos,
    COALESCE(r.componente_sugerido, 'Por determinar en inspección')::VARCHAR(150) AS componente_sugerido,
    r.actividad_mantenimiento_sugerida::TEXT AS actividad_mantenimiento_referencia
FROM semana_anterior sa
LEFT JOIN public.cat_relacion_defecto_falla r
    ON r.codigo_defecto = sa.codigo_defecto
    AND r.activo = TRUE;


-- ============================================================
-- VISTA MAESTRA: CALENDARIO CONSOLIDADO
-- ============================================================
CREATE OR REPLACE VIEW public.vw_calendario_consolidado AS
SELECT
    id_sugerencia,
    tipo_mantenimiento,
    maquina_id,
    actividad,
    descripcion,
    fecha_sugerida,
    prioridad,
    anio_plan    AS anio,
    NULL::INT    AS mes,
    NULL::INT    AS semana,
    fallas_acumuladas_anio,
    NULL::INT    AS total_fallas_mes,
    NULL::TEXT   AS codigo_defecto,
    NULL::NUMERIC AS total_defectos
FROM public.vw_preventivo_anual

UNION ALL

SELECT
    id_sugerencia,
    tipo_mantenimiento,
    maquina_id,
    actividad,
    descripcion,
    fecha_sugerida,
    prioridad,
    anio_plan   AS anio,
    mes_plan    AS mes,
    NULL::INT   AS semana,
    NULL::INT   AS fallas_acumuladas_anio,
    total_fallas_mes,
    NULL::TEXT  AS codigo_defecto,
    NULL::NUMERIC AS total_defectos
FROM public.vw_predictivo_mensual

UNION ALL

SELECT
    id_sugerencia,
    tipo_mantenimiento,
    maquina_id,
    actividad,
    descripcion,
    fecha_sugerida,
    prioridad,
    EXTRACT(YEAR FROM fecha_sugerida)::INT  AS anio,
    EXTRACT(MONTH FROM fecha_sugerida)::INT AS mes,
    EXTRACT(WEEK FROM fecha_sugerida)::INT  AS semana,
    NULL::INT                               AS fallas_acumuladas_anio,
    NULL::INT                               AS total_fallas_mes,
    codigo_defecto,
    total_defectos
FROM public.vw_autonomo_semanal;
