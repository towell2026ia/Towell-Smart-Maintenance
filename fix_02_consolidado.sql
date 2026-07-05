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