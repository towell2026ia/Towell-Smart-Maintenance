-- =============================================================================
-- Migration: 20260821_006_ag011_technical_memory_tables_v10.sql
-- Agent: AG-011 — Memoria Técnica (v1.0)
-- Subphase: AG-011.2 — Deterministic Technical Memory Construction & Retrieval Engine
-- Token de Freeze: AG011-MEMORY-ENGINE-001
-- Invariant: Exactly Four Tables for Technical Memory Governance & Lifecycle
-- =============================================================================

-- 1. Tabla: public.memorias_tecnicas (Identidad, metadatos y estado activo)
CREATE TABLE IF NOT EXISTS public.memorias_tecnicas (
    id_memoria VARCHAR(64) PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    tipo_memoria VARCHAR(64) NOT NULL CHECK (tipo_memoria IN (
        'CONFIRMED_ROOT_CAUSE',
        'VALIDATED_REPAIR',
        'VALIDATED_DIAGNOSTIC_CHECK',
        'RECURRING_FAILURE_GUIDANCE',
        'COMPONENT_LESSON',
        'MAINTENANCE_LESSON',
        'SAFETY_REFERENCE',
        'KNOWN_LIMITATION'
    )),
    estatus VARCHAR(32) NOT NULL DEFAULT 'CANDIDATE' CHECK (estatus IN (
        'CANDIDATE',
        'REVIEW_REQUIRED',
        'APPROVED',
        'SUPERSEDED',
        'RETIRED',
        'REJECTED'
    )),
    calidad VARCHAR(32) NOT NULL DEFAULT 'ADEQUATE' CHECK (calidad IN (
        'STRONG',
        'ADEQUATE',
        'PARTIAL',
        'CONFLICTING',
        'INSUFFICIENT'
    )),
    nivel_alcance VARCHAR(32) NOT NULL DEFAULT 'ASSET_SPECIFIC' CHECK (nivel_alcance IN (
        'ASSET_SPECIFIC',
        'MACHINE_MODEL',
        'MACHINE_FAMILY',
        'COMPONENT',
        'DEPARTMENT',
        'GENERAL'
    )),
    id_activo VARCHAR(64) REFERENCES public.cat_maquinas(id_maquina) ON DELETE SET NULL,
    modelo_maquina VARCHAR(128),
    familia_maquina VARCHAR(128),
    id_componente VARCHAR(128),
    departamento VARCHAR(64),
    version_activa VARCHAR(16) NOT NULL DEFAULT '1.0',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla: public.memoria_versiones (Contenido técnico inmutable y vigencias)
CREATE TABLE IF NOT EXISTS public.memoria_versiones (
    id_version VARCHAR(64) PRIMARY KEY,
    id_memoria VARCHAR(64) NOT NULL REFERENCES public.memorias_tecnicas(id_memoria) ON DELETE CASCADE,
    numero_version VARCHAR(16) NOT NULL,
    descripcion_condicion TEXT NOT NULL,
    observaciones_validadas JSONB NOT NULL DEFAULT '[]'::jsonb,
    causa_raiz_confirmada TEXT,
    procedimiento_validado TEXT NOT NULL,
    resultado_esperado TEXT NOT NULL,
    repuestos_requeridos JSONB NOT NULL DEFAULT '[]'::jsonb,
    herramientas_requeridas JSONB NOT NULL DEFAULT '[]'::jsonb,
    advertencias_seguridad JSONB NOT NULL DEFAULT '[]'::jsonb,
    limitaciones JSONB NOT NULL DEFAULT '[]'::jsonb,
    condiciones_requeridas JSONB NOT NULL DEFAULT '[]'::jsonb,
    condiciones_excluidas JSONB NOT NULL DEFAULT '[]'::jsonb,
    casos_origen JSONB NOT NULL DEFAULT '[]'::jsonb,
    analisis_origen JSONB NOT NULL DEFAULT '[]'::jsonb,
    vigente_desde TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    vigente_hasta TIMESTAMPTZ,
    reemplaza_a_version VARCHAR(64),
    reemplazada_por_version VARCHAR(64),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabla: public.memoria_evidencias (Vínculos de trazabilidad a OTs, hallazgos y RCA)
CREATE TABLE IF NOT EXISTS public.memoria_evidencias (
    id_evidencia VARCHAR(64) PRIMARY KEY,
    id_memoria VARCHAR(64) NOT NULL REFERENCES public.memorias_tecnicas(id_memoria) ON DELETE CASCADE,
    id_version VARCHAR(64) NOT NULL REFERENCES public.memoria_versiones(id_version) ON DELETE CASCADE,
    clase_evidencia VARCHAR(64) NOT NULL CHECK (clase_evidencia IN (
        'CERTIFIED_FACT',
        'HUMAN_CONFIRMED_CAUSE',
        'VALIDATED_INTERVENTION',
        'DOCUMENTED_OUTCOME',
        'DERIVED_SIGNAL',
        'TECHNICIAN_STATEMENT',
        'OPERATOR_STATEMENT',
        'MODEL_HYPOTHESIS'
    )),
    tipo_fuente VARCHAR(64) NOT NULL CHECK (tipo_fuente IN (
        'WORK_ORDER',
        'FINDING',
        'TELEGRAM_MSG',
        'AG010_RCA',
        'AG008_SIGNAL',
        'TECHNICAL_MANUAL'
    )),
    id_fuente VARCHAR(128) NOT NULL,
    declaracion_hecho TEXT NOT NULL,
    fecha_evento TIMESTAMPTZ NOT NULL,
    tabla_fuente VARCHAR(128),
    puntuacion_confiabilidad NUMERIC(5,2) DEFAULT 100.00,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabla: public.memoria_aprobaciones (Registro de auditoría de revisión humana)
CREATE TABLE IF NOT EXISTS public.memoria_aprobaciones (
    id_aprobacion VARCHAR(64) PRIMARY KEY,
    id_memoria VARCHAR(64) NOT NULL REFERENCES public.memorias_tecnicas(id_memoria) ON DELETE CASCADE,
    id_version VARCHAR(64) NOT NULL REFERENCES public.memoria_versiones(id_version) ON DELETE CASCADE,
    email_revisor VARCHAR(255) NOT NULL,
    rol_revisor VARCHAR(64) NOT NULL,
    decision VARCHAR(32) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'REVISE')),
    notas_aprobacion TEXT NOT NULL,
    hash_evidencia_evaluada VARCHAR(64) NOT NULL,
    revisado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de Rendimiento y Búsqueda Determinística
CREATE INDEX IF NOT EXISTS idx_memorias_estatus ON public.memorias_tecnicas(estatus);
CREATE INDEX IF NOT EXISTS idx_memorias_activo ON public.memorias_tecnicas(id_activo);
CREATE INDEX IF NOT EXISTS idx_memorias_modelo ON public.memorias_tecnicas(modelo_maquina);
CREATE INDEX IF NOT EXISTS idx_memoria_versiones_vigencia ON public.memoria_versiones(vigente_desde, vigente_hasta);
CREATE INDEX IF NOT EXISTS idx_memoria_evidencias_fuente ON public.memoria_evidencias(tipo_fuente, id_fuente);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.memorias_tecnicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memoria_versiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memoria_evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memoria_aprobaciones ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS: Lectura autenticada, Escritura exclusiva Service Role / AG-001
CREATE POLICY "Permitir lectura de memorias tecnicas a usuarios autenticados"
    ON public.memorias_tecnicas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir lectura de versiones de memoria a usuarios autenticados"
    ON public.memoria_versiones FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir lectura de evidencias de memoria a usuarios autenticados"
    ON public.memoria_evidencias FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir lectura de aprobaciones a usuarios autenticados"
    ON public.memoria_aprobaciones FOR SELECT TO authenticated USING (true);
