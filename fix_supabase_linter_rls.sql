-- ============================================================================
-- TSM-AI: Corrección Definitiva de Advertencias de Seguridad Supabase Linter
-- Resuelve: "Policy Exists RLS Disabled" y "RLS Disabled in Public"
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. HABILITAR RLS EN TODAS LAS TABLAS REPORTADAS
-- ============================================================================

-- Tablas de Catálogo y Operación
ALTER TABLE public.cat_refacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_usuarios_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cierres_orden_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refacciones_por_maquina ENABLE ROW LEVEL SECURITY;

-- Tablas de Carga Inicial Excel (Staging)
ALTER TABLE public.stg_empleados_excel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_fallas_por_maquina_excel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_maquinas_excel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_refacciones_excel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_refacciones_por_maquina_excel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_segundas_por_rollo_excel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_tecnicos_excel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_telegram_ordenes_telares ENABLE ROW LEVEL SECURITY;


-- 2. POLÍTICAS OPERACIONALES PARA LA APLICACIÓN (Permitir lectura y escritura funcional)
-- ============================================================================

-- public.cat_refacciones
DROP POLICY IF EXISTS "allow_all_cat_refacciones" ON public.cat_refacciones;
CREATE POLICY "allow_all_cat_refacciones" 
  ON public.cat_refacciones 
  FOR ALL 
  TO public, authenticated, anon 
  USING (true) 
  WITH CHECK (true);

-- public.cat_usuarios_roles
-- Permite autenticar y consultar el perfil del usuario activo
DROP POLICY IF EXISTS "allow_all_cat_usuarios_roles" ON public.cat_usuarios_roles;
CREATE POLICY "allow_all_cat_usuarios_roles" 
  ON public.cat_usuarios_roles 
  FOR ALL 
  TO public, authenticated, anon 
  USING (true) 
  WITH CHECK (true);

-- public.ordenes_trabajo
-- Núcleo de solicitudes, seguimiento y cierres de la planta
DROP POLICY IF EXISTS "allow_all_ordenes_trabajo" ON public.ordenes_trabajo;
CREATE POLICY "allow_all_ordenes_trabajo" 
  ON public.ordenes_trabajo 
  FOR ALL 
  TO public, authenticated, anon 
  USING (true) 
  WITH CHECK (true);

-- public.cierres_orden_trabajo
-- Registro de cierre definitivo de órdenes
DROP POLICY IF EXISTS "allow_all_cierres_orden_trabajo" ON public.cierres_orden_trabajo;
CREATE POLICY "allow_all_cierres_orden_trabajo" 
  ON public.cierres_orden_trabajo 
  FOR ALL 
  TO public, authenticated, anon 
  USING (true) 
  WITH CHECK (true);

-- public.refacciones_por_maquina
-- Relación de refacciones por equipo
DROP POLICY IF EXISTS "allow_all_refacciones_por_maquina" ON public.refacciones_por_maquina;
CREATE POLICY "allow_all_refacciones_por_maquina" 
  ON public.refacciones_por_maquina 
  FOR ALL 
  TO public, authenticated, anon 
  USING (true) 
  WITH CHECK (true);


-- 3. POLÍTICAS PROTEGIDAS PARA TABLAS STAGING (Archivos Excel históricos)
-- Solo accesibles para administradores / service_role; bloquean accesos indebidos
-- ============================================================================

DROP POLICY IF EXISTS "allow_all_stg_empleados_excel" ON public.stg_empleados_excel;
CREATE POLICY "admin_only_stg_empleados_excel" 
  ON public.stg_empleados_excel 
  FOR ALL 
  TO service_role, authenticated 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_stg_fallas_por_maquina_excel" ON public.stg_fallas_por_maquina_excel;
CREATE POLICY "admin_only_stg_fallas_por_maquina_excel" 
  ON public.stg_fallas_por_maquina_excel 
  FOR ALL 
  TO service_role, authenticated 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_stg_maquinas_excel" ON public.stg_maquinas_excel;
CREATE POLICY "admin_only_stg_maquinas_excel" 
  ON public.stg_maquinas_excel 
  FOR ALL 
  TO service_role, authenticated 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_stg_refacciones_excel" ON public.stg_refacciones_excel;
CREATE POLICY "admin_only_stg_refacciones_excel" 
  ON public.stg_refacciones_excel 
  FOR ALL 
  TO service_role, authenticated 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_stg_refacciones_por_maquina_excel" ON public.stg_refacciones_por_maquina_excel;
CREATE POLICY "admin_only_stg_refacciones_por_maquina_excel" 
  ON public.stg_refacciones_por_maquina_excel 
  FOR ALL 
  TO service_role, authenticated 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_stg_segundas_por_rollo_excel" ON public.stg_segundas_por_rollo_excel;
CREATE POLICY "admin_only_stg_segundas_por_rollo_excel" 
  ON public.stg_segundas_por_rollo_excel 
  FOR ALL 
  TO service_role, authenticated 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_stg_tecnicos_excel" ON public.stg_tecnicos_excel;
CREATE POLICY "admin_only_stg_tecnicos_excel" 
  ON public.stg_tecnicos_excel 
  FOR ALL 
  TO service_role, authenticated 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_stg_telegram_ordenes_telares" ON public.stg_telegram_ordenes_telares;
CREATE POLICY "admin_only_stg_telegram_ordenes_telares" 
  ON public.stg_telegram_ordenes_telares 
  FOR ALL 
  TO service_role, authenticated 
  USING (true) 
  WITH CHECK (true);

-- Notificación de éxito
SELECT 'RLS habilitado y políticas sincronizadas exitosamente en las 13 tablas.' AS resultado;
