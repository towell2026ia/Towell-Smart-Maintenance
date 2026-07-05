-- Eliminar vistas o tablas que dependan de estas (CASCADE)
DROP TABLE IF EXISTS public.inventario_refacciones CASCADE;
DROP TABLE IF EXISTS public.stg_inventario_refacciones_excel CASCADE;

DROP TABLE IF EXISTS public.historico_precios_refacciones CASCADE;
DROP TABLE IF EXISTS public.stg_historico_precios_refacciones_excel CASCADE;

DROP TABLE IF EXISTS public.costos_mano_obra CASCADE;
DROP TABLE IF EXISTS public.stg_costos_mano_obra_excel CASCADE;

DROP TABLE IF EXISTS public.cat_proveedores CASCADE;
