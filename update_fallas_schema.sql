-- 0. Eliminar vistas dependientes antes de alterar tipos
DROP VIEW IF EXISTS public.vw_validacion_fallas_por_maquina CASCADE;

-- 1. Modificar tabla de staging
ALTER TABLE public.stg_fallas_por_maquina_excel 
ADD COLUMN IF NOT EXISTS area VARCHAR(50);

ALTER TABLE public.stg_fallas_por_maquina_excel 
ADD COLUMN IF NOT EXISTS id_carga UUID;

ALTER TABLE public.stg_fallas_por_maquina_excel
ALTER COLUMN creada TYPE VARCHAR(255);

-- 2. Modificar tabla de producción
ALTER TABLE public.fallas_por_maquina
ADD COLUMN IF NOT EXISTS area VARCHAR(50);

CREATE OR REPLACE VIEW public.vw_validacion_fallas_por_maquina AS
SELECT
    id,
    area,
    maquina_id,
    descripcion,
    creada,
    archivo_origen,
    id_carga,
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
