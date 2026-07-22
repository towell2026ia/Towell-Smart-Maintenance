-- ============================================================================
-- SCRIPT DE ACTUALIZACIÓN FASE 2.1: REFACCIONES POR SERVICIO (SIN STOCK)
-- ============================================================================

-- 1. Deshabilitar RLS en tablas de refacciones
ALTER TABLE public.cat_refacciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.refacciones_por_maquina DISABLE ROW LEVEL SECURITY;

-- 2. Asegurar estructura en cat_refacciones sin restricciones de stock
ALTER TABLE public.cat_refacciones 
    ADD COLUMN IF NOT EXISTS precio_costo_unitario NUMERIC(12,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

-- 3. Asegurar estructura en refacciones_por_maquina (Relación Máquina - Refacción con Cantidad Estándar)
ALTER TABLE public.refacciones_por_maquina
    ADD COLUMN IF NOT EXISTS maquina_id VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS codigo_articulo VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS nombre_articulo TEXT NULL,
    ADD COLUMN IF NOT EXISTS cantidad_estandar NUMERIC(12,4) DEFAULT 1,
    ADD COLUMN IF NOT EXISTS precio_costo_unitario NUMERIC(12,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS importe_costo_calculado NUMERIC(12,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

-- 4. Crear índices para búsquedas ultra rápidas por máquina
CREATE INDEX IF NOT EXISTS idx_refacc_maq_clave ON public.refacciones_por_maquina(maquina_id);
CREATE INDEX IF NOT EXISTS idx_refacc_maq_codigo ON public.refacciones_por_maquina(codigo_articulo);
