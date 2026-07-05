-- ============================================================
-- VISTAS DE CALENDARIO INTELIGENTE - TSMAI
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- ============================================================
-- VISTA 1: PREVENTIVO ANUAL
-- Fuente: planes_mantenimiento_preventivo + fallas_por_maquina
-- Se genera una vez al año. La IA ajusta la prioridad
-- según el historial de fallas por máquina.
-- ============================================================
CREATE OR REPLACE VIEW vw_preventivo_anual AS
WITH conteo_fallas AS (
    -- Contar fallas del año en curso por máquina
    SELECT
        maquina_id,
        COUNT(*) AS total_fallas_anio,
        -- IA determina la prioridad: >50 = CRITICA, >20 = ALTA, >5 = MEDIA, <=5 = BAJA
        CASE
            WHEN COUNT(*) > 50 THEN 'CRITICA'
            WHEN COUNT(*) > 20 THEN 'ALTA'
            WHEN COUNT(*) > 5  THEN 'MEDIA'
            ELSE 'BAJA'
        END AS prioridad_ia
    FROM fallas_por_maquina
    WHERE EXTRACT(YEAR FROM fecha_creada) = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY maquina_id
),
planes AS (
    SELECT
        p.id_plan,
        p.maquina_id,
        p.nombre_plan,
        p.descripcion,
        p.frecuencia,
        p.unidad_frecuencia,
        p.ultima_ejecucion,
        -- Calcular próxima ejecución según frecuencia
        CASE p.unidad_frecuencia
            WHEN 'DIAS'   THEN p.ultima_ejecucion + (p.frecuencia || ' days')::INTERVAL
            WHEN 'MESES'  THEN p.ultima_ejecucion + (p.frecuencia || ' months')::INTERVAL
            WHEN 'ANIOS'  THEN p.ultima_ejecucion + (p.frecuencia || ' years')::INTERVAL
            ELSE p.ultima_ejecucion + INTERVAL '1 year'
        END AS proxima_ejecucion_calculada,
        p.responsable,
        p.activo
    FROM planes_mantenimiento_preventivo p
    WHERE p.activo = TRUE
)
SELECT
    gen_random_uuid()                         AS id_sugerencia,
    'PREVENTIVO'                              AS tipo_mantenimiento,
    pl.id_plan                                AS id_referencia,
    pl.maquina_id,
    pl.nombre_plan                            AS actividad,
    pl.descripcion,
    pl.proxima_ejecucion_calculada            AS fecha_sugerida,
    -- Si la IA detectó alta falla, sube la prioridad del plan
    COALESCE(cf.prioridad_ia, 'BAJA')         AS prioridad,
    COALESCE(cf.total_fallas_anio, 0)         AS fallas_acumuladas_anio,
    pl.responsable,
    EXTRACT(YEAR FROM CURRENT_DATE)           AS anio_plan
FROM planes pl
LEFT JOIN conteo_fallas cf ON cf.maquina_id = pl.maquina_id
-- Solo mostrar planes que se deben ejecutar en el año actual
WHERE EXTRACT(YEAR FROM pl.proxima_ejecucion_calculada) = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY cf.total_fallas_anio DESC NULLS LAST, pl.proxima_ejecucion_calculada ASC;


-- ============================================================
-- VISTA 2: PREDICTIVO MENSUAL
-- Fuente: fallas_por_maquina + stg_telegram_ordenes_telares
-- Se genera una vez al mes. Analiza tendencias de repetibilidad
-- cruzando fuentes históricas (Excel) y en vivo (Telegram).
-- ============================================================
CREATE OR REPLACE VIEW vw_predictivo_mensual AS
WITH fallas_historicas AS (
    -- Fallas del mes actual desde el historial Excel
    SELECT
        maquina_id,
        categoria_falla,
        COUNT(*) AS total_historico
    FROM fallas_por_maquina
    WHERE fecha_creada >= DATE_TRUNC('month', CURRENT_DATE)
      AND fecha_creada <  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    GROUP BY maquina_id, categoria_falla
),
fallas_telegram AS (
    -- Fallas del mes actual desde Telegram
    SELECT
        maquina_id,
        tipo_falla_id AS categoria_falla,
        COUNT(*) AS total_telegram
    FROM stg_telegram_ordenes_telares
    WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE)::DATE
    GROUP BY maquina_id, tipo_falla_id
),
consolidado AS (
    SELECT
        COALESCE(h.maquina_id, t.maquina_id)             AS maquina_id,
        COALESCE(h.categoria_falla, t.categoria_falla)   AS categoria_falla,
        COALESCE(h.total_historico, 0)                   AS fallas_excel,
        COALESCE(t.total_telegram, 0)                    AS fallas_telegram,
        COALESCE(h.total_historico, 0) + COALESCE(t.total_telegram, 0) AS total_fallas_mes
    FROM fallas_historicas h
    FULL OUTER JOIN fallas_telegram t
        ON h.maquina_id = t.maquina_id
        AND h.categoria_falla = t.categoria_falla
)
SELECT
    gen_random_uuid()                AS id_sugerencia,
    'PREDICTIVO'                     AS tipo_mantenimiento,
    c.maquina_id,
    c.categoria_falla                AS actividad,
    'Intervención predictiva recomendada por tendencia de fallas repetidas' AS descripcion,
    -- Fecha sugerida: último día del mes actual
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE AS fecha_sugerida,
    -- Prioridad basada en cantidad de fallas del mes
    CASE
        WHEN c.total_fallas_mes >= 10 THEN 'CRITICA'
        WHEN c.total_fallas_mes >= 5  THEN 'ALTA'
        WHEN c.total_fallas_mes >= 3  THEN 'MEDIA'
        ELSE 'BAJA'
    END AS prioridad,
    c.fallas_excel,
    c.fallas_telegram,
    c.total_fallas_mes,
    EXTRACT(YEAR FROM CURRENT_DATE)  AS anio_plan,
    EXTRACT(MONTH FROM CURRENT_DATE) AS mes_plan
FROM consolidado c
-- Solo mostrar si hay al menos 2 fallas combinadas en el mes (umbral mínimo)
WHERE c.total_fallas_mes >= 2
ORDER BY c.total_fallas_mes DESC;


-- ============================================================
-- VISTA 3: AUTÓNOMO SEMANAL (desfasado 1 semana)
-- Fuente: segundas_por_rollo + cat_relacion_defecto_falla
-- Se genera cada lunes. Los datos cargados la semana anterior
-- generan las tareas de la semana actual.
-- ============================================================
CREATE OR REPLACE VIEW vw_autonomo_semanal AS
WITH semana_anterior AS (
    -- Defectos de tela de la semana pasada (lunes a domingo anterior)
    SELECT
        s.maquina_id,
        s.codigo_defecto,
        s.defecto,
        SUM(s.cantidad_defecto) AS total_defectos
    FROM segundas_por_rollo s
    WHERE s.fecha >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days'
      AND s.fecha <  DATE_TRUNC('week', CURRENT_DATE)
      AND s.activo = TRUE
    GROUP BY s.maquina_id, s.codigo_defecto, s.defecto
)
SELECT
    gen_random_uuid()               AS id_sugerencia,
    'AUTONOMO'                      AS tipo_mantenimiento,
    sa.maquina_id,
    COALESCE(r.actividad_autonoma_sugerida,
        'Inspección autónoma: ' || sa.defecto) AS actividad,
    'Tarea autónoma generada por defecto de calidad detectado la semana anterior' AS descripcion,
    -- Fecha sugerida: viernes de la semana actual
    (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '4 days')::DATE AS fecha_sugerida,
    CASE
        WHEN sa.total_defectos >= 20 THEN 'ALTA'
        WHEN sa.total_defectos >= 10 THEN 'MEDIA'
        ELSE 'BAJA'
    END AS prioridad,
    sa.codigo_defecto,
    sa.defecto,
    sa.total_defectos,
    COALESCE(r.componente_sugerido, 'Por determinar en inspección') AS componente_sugerido,
    COALESCE(r.actividad_mantenimiento_sugerida, null)             AS actividad_mantenimiento_referencia
FROM semana_anterior sa
LEFT JOIN cat_relacion_defecto_falla r
    ON r.codigo_defecto = sa.codigo_defecto
    AND r.activo = TRUE
ORDER BY sa.total_defectos DESC;


-- ============================================================
-- VISTA MAESTRA: CALENDARIO CONSOLIDADO
-- Fusiona los 3 pilares en una sola vista lista para consumir
-- desde la App Web.
-- ============================================================
CREATE OR REPLACE VIEW vw_calendario_consolidado AS
-- Preventivo Anual
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
    NULL::INT    AS fallas_acumuladas_anio,
    NULL::INT    AS total_fallas_mes,
    NULL::TEXT   AS codigo_defecto,
    NULL::NUMERIC AS total_defectos
FROM vw_preventivo_anual

UNION ALL

-- Predictivo Mensual
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
FROM vw_predictivo_mensual

UNION ALL

-- Autónomo Semanal
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
FROM vw_autonomo_semanal

ORDER BY fecha_sugerida ASC, prioridad DESC;
