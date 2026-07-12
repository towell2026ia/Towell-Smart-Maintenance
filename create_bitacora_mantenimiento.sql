-- ── TABLA DE BITÁCORA DE MANTENIMIENTO ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bitacora_mantenimiento (
    id_bitacora UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden UUID NULL REFERENCES public.ordenes_trabajo(id_orden) ON DELETE SET NULL,
    cve_tecnico VARCHAR(30) NOT NULL REFERENCES public.cat_tecnicos(cve_tecnico) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombre_tecnico VARCHAR(150),
    area VARCHAR(15) NOT NULL REFERENCES public.cat_departamentos(codigo_departamento) ON UPDATE CASCADE ON DELETE RESTRICT,
    maquina_id VARCHAR(50) NULL REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE SET NULL,
    fecha_hora_inicio TIMESTAMP NOT NULL,
    fecha_hora_fin TIMESTAMP NOT NULL,
    descripcion_actividad TEXT NOT NULL,
    refacciones_usadas TEXT NULL, -- Almacena refacciones como texto descriptivo o JSON
    observaciones TEXT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- Deshabilitar Seguridad a Nivel de Fila (RLS) para permitir operaciones directas
ALTER TABLE public.bitacora_mantenimiento DISABLE ROW LEVEL SECURITY;

-- Crear índices para optimizar la velocidad de lectura
CREATE INDEX IF NOT EXISTS idx_bitacora_tecnico ON public.bitacora_mantenimiento(cve_tecnico);
CREATE INDEX IF NOT EXISTS idx_bitacora_orden ON public.bitacora_mantenimiento(id_orden);
CREATE INDEX IF NOT EXISTS idx_bitacora_maquina ON public.bitacora_mantenimiento(maquina_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha ON public.bitacora_mantenimiento(fecha_hora_inicio);
