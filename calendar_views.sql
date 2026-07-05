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
-- VISTA 2: PREDICTIVO MENSUAL (Con Estacionalidad y Tendencias)
-- Fuente: fallas_por_maquina + stg_telegram_ordenes_telares
-- Se genera una vez al mes. Analiza:
--   A) Repetibilidad actual (fallas este mes)
--   B) Estacionalidad (máquinas que históricamente fallan más en el mes actual)
--   C) Tendencia de paros (meses con exceso de paros vs promedio histórico)
-- ============================================================
CREATE OR REPLACE VIEW vw_predictivo_mensual AS
WITH
-- A) Fallas del mes actual (Excel histórico)
fallas_mes_actual AS (
    SELECT
        maquina_id,
        categoria_falla,
        COUNT(*) AS total_este_mes
    FROM fallas_por_maquina
    WHERE fecha_creada >= DATE_TRUNC('month', CURRENT_DATE)
      AND fecha_creada <  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    GROUP BY maquina_id, categoria_falla
),
-- A) Fallas del mes actual (Telegram)
fallas_telegram_mes AS (
    SELECT
        maquina_id,
        tipo_falla_id AS categoria_falla,
        COUNT(*) AS total_telegram
    FROM stg_telegram_ordenes_telares
    WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE)::DATE
      AND fecha <  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE
    GROUP BY maquina_id, tipo_falla_id
),
-- A) Consolidado mes actual
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

-- B) ESTACIONALIDAD: Promedio histórico de fallas para el mes actual del año
--    Agrupa todos los años anteriores por (máquina, número de mes)
--    para detectar si el mes actual es históricamente problemático.
estacionalidad AS (
    SELECT
        maquina_id,
        EXTRACT(MONTH FROM fecha_creada)::INT AS numero_mes,
        COUNT(*)                               AS total_fallas_historicas,
        COUNT(DISTINCT EXTRACT(YEAR FROM fecha_creada)) AS anios_con_datos,
        -- Promedio de fallas por año para ese mes
        ROUND(COUNT(*) / NULLIF(COUNT(DISTINCT EXTRACT(YEAR FROM fecha_creada)), 0), 1) AS promedio_fallas_ese_mes
    FROM fallas_por_maquina
    WHERE fecha_creada < DATE_TRUNC('month', CURRENT_DATE) -- Solo años anteriores
      AND maquina_id IS NOT NULL
    GROUP BY maquina_id, EXTRACT(MONTH FROM fecha_creada)::INT
),
-- Marcar como "mes peligroso" si el promedio histórico en ese mes es >= 5 fallas
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
      AND promedio_fallas_ese_mes >= 3  -- Umbral mínimo: al menos 3 fallas/año en este mes
),

-- C) TENDENCIA DE PAROS EXCESIVOS:
--    Detecta máquinas donde los últimos 3 meses tuvieron más paros que su media anual
tendencia_paros AS (
    SELECT
        maquina_id,
        -- Fallas en últimos 3 meses
        COUNT(*) FILTER (
            WHERE fecha_creada >= CURRENT_DATE - INTERVAL '90 days'
        ) AS fallas_ultimos_3_meses,
        -- Fallas en el año completo
        COUNT(*) FILTER (
            WHERE EXTRACT(YEAR FROM fecha_creada) = EXTRACT(YEAR FROM CURRENT_DATE)
        ) AS fallas_anio_actual,
        -- Promedio mensual esperado (fallas_anio / meses_transcurridos)
        ROUND(
            COUNT(*) FILTER (
                WHERE EXTRACT(YEAR FROM fecha_creada) = EXTRACT(YEAR FROM CURRENT_DATE)
            )::NUMERIC
            / NULLIF(EXTRACT(MONTH FROM CURRENT_DATE), 0), 1
        ) AS promedio_mensual_anio,
        COUNT(*) FILTER (
            WHERE fecha_creada >= CURRENT_DATE - INTERVAL '90 days'
        ) / 3.0 AS promedio_ultimos_3_meses
    FROM fallas_por_maquina
    WHERE maquina_id IS NOT NULL
    GROUP BY maquina_id
    -- Solo incluir si los últimos 3 meses superan 1.5x el promedio del año (paros excesivos)
    HAVING COUNT(*) FILTER (
        WHERE fecha_creada >= CURRENT_DATE - INTERVAL '90 days'
    ) / 3.0 > 1.5 * ROUND(
        COUNT(*) FILTER (
            WHERE EXTRACT(YEAR FROM fecha_creada) = EXTRACT(YEAR FROM CURRENT_DATE)
        )::NUMERIC / NULLIF(EXTRACT(MONTH FROM CURRENT_DATE), 0), 1
    )
    AND COUNT(*) FILTER (
        WHERE fecha_creada >= CURRENT_DATE - INTERVAL '90 days'
    ) >= 3 -- Al menos 3 fallas en los últimos 3 meses
)

-- ============================================================
-- RESULTADO FINAL: Unión de los 3 motores
-- ============================================================
SELECT
    gen_random_uuid()                AS id_sugerencia,
    'PREDICTIVO'                     AS tipo_mantenimiento,
    c.maquina_id,
    c.categoria_falla                AS actividad,
    'Intervención predictiva: repetibilidad de fallas este mes' AS descripcion,
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE AS fecha_sugerida,
    CASE
        WHEN c.total_fallas_mes >= 10 THEN 'CRITICA'
        WHEN c.total_fallas_mes >= 5  THEN 'ALTA'
        WHEN c.total_fallas_mes >= 3  THEN 'MEDIA'
        ELSE 'BAJA'
    END AS prioridad,
    c.fallas_excel,
    c.fallas_telegram,
    c.total_fallas_mes,
    NULL::NUMERIC                    AS promedio_historico_mes,
    NULL::INT                        AS anios_con_datos,
    'REPETIBILIDAD_ACTUAL'           AS fuente_predictiva,
    EXTRACT(YEAR FROM CURRENT_DATE)  AS anio_plan,
    EXTRACT(MONTH FROM CURRENT_DATE) AS mes_plan
FROM consolidado_mes c
WHERE c.total_fallas_mes >= 2

UNION ALL

-- Motor B: Estacionalidad (máquina históricamente peligrosa en este mes)
SELECT
    gen_random_uuid()                AS id_sugerencia,
    'PREDICTIVO'                     AS tipo_mantenimiento,
    mp.maquina_id,
    'Estacionalidad: Mes históricamente crítico' AS actividad,
    FORMAT('Este mes es históricamente problemático para esta máquina. Promedio de %.1f fallas/año en %s meses analizados.',
        mp.promedio_fallas_ese_mes,
        mp.anios_con_datos
    )                                AS descripcion,
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '15 days')::DATE AS fecha_sugerida,
    mp.prioridad_estacional          AS prioridad,
    NULL::INT                        AS fallas_excel,
    NULL::INT                        AS fallas_telegram,
    NULL::INT                        AS total_fallas_mes,
    mp.promedio_fallas_ese_mes       AS promedio_historico_mes,
    mp.anios_con_datos               AS anios_con_datos,
    'ESTACIONALIDAD'                 AS fuente_predictiva,
    EXTRACT(YEAR FROM CURRENT_DATE)  AS anio_plan,
    EXTRACT(MONTH FROM CURRENT_DATE) AS mes_plan
FROM mes_peligroso mp
-- Excluir si ya aparece en el motor de repetibilidad para no duplicar
WHERE mp.maquina_id NOT IN (SELECT maquina_id FROM consolidado_mes WHERE total_fallas_mes >= 2)

UNION ALL

-- Motor C: Tendencia de paros excesivos (últimos 3 meses vs promedio anual)
SELECT
    gen_random_uuid()                AS id_sugerencia,
    'PREDICTIVO'                     AS tipo_mantenimiento,
    tp.maquina_id,
    'Tendencia de Paros: Exceso de paros en últimos 3 meses' AS actividad,
    FORMAT('Promedio últimos 3 meses: %.1f fallas/mes vs promedio anual: %.1f fallas/mes. Tendencia alcista detectada.',
        tp.promedio_ultimos_3_meses,
        tp.promedio_mensual_anio
    )                                AS descripcion,
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '7 days')::DATE AS fecha_sugerida,
    CASE
        WHEN tp.fallas_ultimos_3_meses >= 30 THEN 'CRITICA'
        WHEN tp.fallas_ultimos_3_meses >= 15 THEN 'ALTA'
        ELSE 'MEDIA'
    END                              AS prioridad,
    NULL::INT                        AS fallas_excel,
    NULL::INT                        AS fallas_telegram,
    tp.fallas_ultimos_3_meses        AS total_fallas_mes,
    tp.promedio_mensual_anio         AS promedio_historico_mes,
    NULL::INT                        AS anios_con_datos,
    'TENDENCIA_PAROS'                AS fuente_predictiva,
    EXTRACT(YEAR FROM CURRENT_DATE)  AS anio_plan,
    EXTRACT(MONTH FROM CURRENT_DATE) AS mes_plan
FROM tendencia_paros tp

ORDER BY prioridad DESC, total_fallas_mes DESC NULLS LAST;


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
