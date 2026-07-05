-- =========================================================================
-- TASK 2: LIMPIEZA DE TABLAS
-- =========================================================================
DROP TABLE IF EXISTS public.inventario_refacciones CASCADE;
DROP TABLE IF EXISTS public.stg_inventario_refacciones_excel CASCADE;

DROP TABLE IF EXISTS public.historico_precios_refacciones CASCADE;
DROP TABLE IF EXISTS public.stg_historico_precios_refacciones_excel CASCADE;

DROP TABLE IF EXISTS public.costos_mano_obra CASCADE;
DROP TABLE IF EXISTS public.stg_costos_mano_obra_excel CASCADE;

DROP TABLE IF EXISTS public.cat_proveedores CASCADE;

-- =========================================================================
-- TASK 4: COMMIT SEGUNDAS POR ROLLO (STAGING -> PROD)
-- El ID corresponde a la carga actual de Segundas en Staging
-- =========================================================================
SELECT public.commit_segundas_por_rollo('a92a9c05-149a-4201-b906-3d971b744856');

-- =========================================================================
-- TASK 5: POBLACIÓN DE TABLAS ANALÍTICAS
-- =========================================================================
TRUNCATE TABLE public.analisis_repetibilidad_fallas CASCADE;

INSERT INTO public.analisis_repetibilidad_fallas (
    maquina_id,
    categoria_falla,
    cantidad_repeticiones,
    periodo_dias,
    fecha_primera_falla,
    fecha_ultima_falla,
    nivel_riesgo
)
SELECT 
    maquina_id,
    categoria_falla,
    COUNT(*) as cantidad_repeticiones,
    EXTRACT(DAY FROM (MAX(fecha_hora_creada) - MIN(fecha_hora_creada))) as periodo_dias,
    MIN(fecha_hora_creada)::DATE as fecha_primera_falla,
    MAX(fecha_hora_creada)::DATE as fecha_ultima_falla,
    CASE 
        WHEN COUNT(*) > 10 THEN 'Alto'
        WHEN COUNT(*) > 5 THEN 'Medio'
        ELSE 'Bajo'
    END as nivel_riesgo
FROM public.fallas_por_maquina
WHERE categoria_falla IS NOT NULL
GROUP BY maquina_id, categoria_falla
HAVING COUNT(*) > 1;
