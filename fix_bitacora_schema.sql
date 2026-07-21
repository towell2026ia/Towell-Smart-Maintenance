-- Fix bitacora_mantenimiento column types and constraints
ALTER TABLE public.bitacora_mantenimiento DROP CONSTRAINT IF EXISTS bitacora_mantenimiento_cve_tecnico_fkey;
ALTER TABLE public.bitacora_mantenimiento DROP CONSTRAINT IF EXISTS bitacora_mantenimiento_area_fkey;
ALTER TABLE public.bitacora_mantenimiento DROP CONSTRAINT IF EXISTS bitacora_mantenimiento_maquina_id_fkey;
ALTER TABLE public.bitacora_mantenimiento DROP CONSTRAINT IF EXISTS bitacora_mantenimiento_id_orden_fkey;

ALTER TABLE public.bitacora_mantenimiento ALTER COLUMN cve_tecnico TYPE VARCHAR(100);
ALTER TABLE public.bitacora_mantenimiento ALTER COLUMN area TYPE VARCHAR(50);
ALTER TABLE public.bitacora_mantenimiento ALTER COLUMN maquina_id TYPE VARCHAR(100);
ALTER TABLE public.bitacora_mantenimiento ALTER COLUMN cve_tecnico DROP NOT NULL;
ALTER TABLE public.bitacora_mantenimiento ALTER COLUMN area DROP NOT NULL;
