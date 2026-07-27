-- ============================================================
-- ESQUEMA CONSOLIDADO DE CALENDARIOS, LEVANTAMIENTOS Y CHECKLISTS
-- TSMAI - Puntos 1 al 18
-- ============================================================

-- 1. Asegurar tabla de refacciones por máquina si no existe
CREATE TABLE IF NOT EXISTS public.refacciones_por_maquina (
    id_refaccion_maquina UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE,
    maquina_id VARCHAR(100) REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE RESTRICT,
    destino VARCHAR(100),
    codigo_articulo VARCHAR(50),
    nombre_articulo VARCHAR(150),
    cantidad_estandar NUMERIC(18,4) DEFAULT 1,
    precio_costo_unitario NUMERIC(18,4) DEFAULT 0,
    importe_costo_calculado NUMERIC(18,4) DEFAULT 0,
    fecha_carga TIMESTAMP DEFAULT NOW()
);

-- 2. Asegurar columnas de área/departamento en cat_maquinas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cat_maquinas' AND column_name = 'departamento_codigo'
    ) THEN
        ALTER TABLE public.cat_maquinas ADD COLUMN departamento_codigo VARCHAR(50) DEFAULT 'PF';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cat_maquinas' AND column_name = 'area'
    ) THEN
        ALTER TABLE public.cat_maquinas ADD COLUMN area VARCHAR(50) DEFAULT 'PF';
    END IF;
END $$;

-- 3. Agregar columna anio_plan calculada en calendario_mantenimiento_detalle si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'calendario_mantenimiento_detalle' 
          AND column_name = 'anio_plan'
    ) THEN
        ALTER TABLE public.calendario_mantenimiento_detalle 
        ADD COLUMN anio_plan INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM fecha_programada)::INT) STORED;
    END IF;
END $$;

-- 4. Constraint de Unicidad para Preventivo Anual (1 por máquina por año)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_preventivo_maquina_anio'
    ) THEN
        ALTER TABLE public.calendario_mantenimiento_detalle 
        ADD CONSTRAINT uq_preventivo_maquina_anio UNIQUE (maquina_id, anio_plan, tipo_mantenimiento);
    END IF;
END $$;

-- 5. Tabla de Levantamientos Mantenimiento (Flujo 2: Predictivo y Autónomo)
CREATE TABLE IF NOT EXISTS public.levantamientos_mantenimiento (
    id_levantamiento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_detalle_calendario UUID REFERENCES public.calendario_mantenimiento_detalle(id_detalle) ON DELETE SET NULL,
    folio_levantamiento VARCHAR(50) UNIQUE NOT NULL,
    maquina_id VARCHAR(100) NOT NULL REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE RESTRICT,
    tipo_mantenimiento VARCHAR(50) NOT NULL, -- 'PREDICTIVO', 'AUTONOMO'
    estatus VARCHAR(50) DEFAULT 'PENDIENTE_ASIGNACION', -- 'PENDIENTE_ASIGNACION', 'ASIGNADA', 'EN_PROCESO', 'FINALIZADO', 'PENDIENTE_VALIDACION', 'CERRADA', 'REQUIERE_CORRECCION'
    prioridad VARCHAR(50) DEFAULT 'MEDIA',
    tecnico_id VARCHAR(150) NULL,
    fecha_programada DATE NOT NULL,
    fecha_hora_inicio TIMESTAMPTZ NULL,
    fecha_hora_fin TIMESTAMPTZ NULL,
    tiempo_atencion_min INT DEFAULT 0,
    motivo_seleccion TEXT NULL,
    condicion_encontrada TEXT NULL,
    hallazgos TEXT NULL,
    mediciones_resumen TEXT NULL,
    evidencia_url TEXT NULL,
    observaciones TEXT NULL,
    recomendacion_tecnica TEXT NULL,
    accion_sugerida VARCHAR(100) DEFAULT 'SIN_ACCION', -- 'SIN_ACCION', 'SEGUIMIENTO', 'AJUSTE_MENOR', 'REQUIERE_CORRECTIVO', 'REVISION_ESPECIALIZADA'
    solicitante_id VARCHAR(150) NULL,
    calificacion INT NULL,
    observaciones_cierre TEXT NULL,
    fecha_alta TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

-- Indexación para optimizar consultas de levantamientos
CREATE INDEX IF NOT EXISTS idx_levantamientos_maquina ON public.levantamientos_mantenimiento(maquina_id);
CREATE INDEX IF NOT EXISTS idx_levantamientos_estatus ON public.levantamientos_mantenimiento(estatus);
CREATE INDEX IF NOT EXISTS idx_levantamientos_tipo ON public.levantamientos_mantenimiento(tipo_mantenimiento);

-- 6. Respuestas de Checklist Predictivo (4 bloques: Electrónico, Mecánico, Limpieza, Lubricación)
CREATE TABLE IF NOT EXISTS public.respuestas_checklist_predictivo (
    id_respuesta UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_levantamiento UUID NOT NULL REFERENCES public.levantamientos_mantenimiento(id_levantamiento) ON DELETE CASCADE,
    -- Bloque Electrónico
    electronico_sensores VARCHAR(50) DEFAULT 'NORMAL',
    electronico_conexiones VARCHAR(50) DEFAULT 'NORMAL',
    electronico_senales VARCHAR(50) DEFAULT 'NORMAL',
    electronico_control VARCHAR(50) DEFAULT 'NORMAL',
    electronico_componentes VARCHAR(50) DEFAULT 'NORMAL',
    electronico_alarmas VARCHAR(50) DEFAULT 'NORMAL',
    -- Bloque Mecánico
    mecanico_holguras VARCHAR(50) DEFAULT 'NORMAL',
    mecanico_rodamientos VARCHAR(50) DEFAULT 'NORMAL',
    mecanico_alineacion VARCHAR(50) DEFAULT 'NORMAL',
    mecanico_transmision VARCHAR(50) DEFAULT 'NORMAL',
    mecanico_desgaste VARCHAR(50) DEFAULT 'NORMAL',
    mecanico_ajustes VARCHAR(50) DEFAULT 'NORMAL',
    -- Bloque Limpieza
    limpieza_acumulaciones VARCHAR(50) DEFAULT 'CONFORME',
    limpieza_residuos VARCHAR(50) DEFAULT 'CONFORME',
    limpieza_contaminacion VARCHAR(50) DEFAULT 'CONFORME',
    limpieza_zonas_criticas VARCHAR(50) DEFAULT 'CONFORME',
    -- Bloque Lubricación
    lubricacion_nivel VARCHAR(50) DEFAULT 'CORRECTO',
    lubricacion_estado VARCHAR(50) DEFAULT 'BUENO',
    lubricacion_contaminacion VARCHAR(50) DEFAULT 'SIN_CONTAMINACION',
    lubricacion_fugas VARCHAR(50) DEFAULT 'SIN_FUGAS',
    lubricacion_puntos VARCHAR(50) DEFAULT 'COMPLETOS',
    observaciones TEXT NULL,
    fecha_alta TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Respuestas de Checklist Autónomo (5 bloques: Vibración, Limpieza, Lubricación, Temperatura, Cableado)
CREATE TABLE IF NOT EXISTS public.respuestas_checklist_autonomo (
    id_respuesta UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_levantamiento UUID NOT NULL REFERENCES public.levantamientos_mantenimiento(id_levantamiento) ON DELETE CASCADE,
    -- 1. Vibración (Estado + mediciones cuantitativas)
    vibracion_estado VARCHAR(50) DEFAULT 'NORMAL', -- 'NORMAL', 'ANORMAL'
    vibracion_mms NUMERIC(10,2) NULL, -- mm/s
    vibracion_hz NUMERIC(10,2) NULL,  -- Hz
    vibracion_obs TEXT NULL,
    -- 2. Limpieza
    limpieza_estado VARCHAR(50) DEFAULT 'CONFORME', -- 'CONFORME', 'NO_CONFORME'
    limpieza_evidencia TEXT NULL,
    limpieza_obs TEXT NULL,
    -- 3. Lubricación
    lubricacion_estado VARCHAR(50) DEFAULT 'CORRECTO',
    lubricacion_nivel VARCHAR(50) DEFAULT 'NORMAL',
    lubricacion_fugas VARCHAR(50) DEFAULT 'SIN_FUGAS',
    lubricacion_contaminacion VARCHAR(50) DEFAULT 'NO',
    lubricacion_obs TEXT NULL,
    -- 4. Temperatura (Medición obligatoria cuantitativa °C)
    temperatura_c NUMERIC(10,2) NOT NULL, -- °C
    temperatura_obs TEXT NULL,
    -- 5. Cableado
    cableado_estado VARCHAR(50) DEFAULT 'CORRECTO', -- 'CORRECTO', 'FLOJO', 'DAÑADO', 'EXPUESTO', 'SOBRECALENTADO'
    cableado_obs TEXT NULL,
    fecha_alta TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Vista de Presupuesto Preventivo de Refacciones (Semanal, Mensual, Anual Estimado vs Real)
CREATE OR REPLACE VIEW public.vw_presupuesto_preventivo_anual AS
SELECT
    d.id_detalle,
    d.maquina_id,
    COALESCE(m.area, m.departamento_codigo, 'PF') AS area,
    d.anio_plan AS anio,
    EXTRACT(MONTH FROM d.fecha_programada)::INT AS mes,
    EXTRACT(WEEK FROM d.fecha_programada)::INT AS semana,
    d.fecha_programada,
    COALESCE(c.costo_total_refacciones, 0) AS costo_estimado_refacciones,
    COALESCE(ot_c.costo_refacciones, 0) AS costo_real_refacciones,
    (COALESCE(ot_c.costo_refacciones, 0) - COALESCE(c.costo_total_refacciones, 0)) AS variacion_presupuesto
FROM public.calendario_mantenimiento_detalle d
JOIN public.cat_maquinas m ON d.maquina_id = m.equipo_towell
LEFT JOIN (
    SELECT 
        rpm.maquina_id,
        SUM(COALESCE(rpm.cantidad_estandar, 1) * COALESCE(rpm.precio_costo_unitario, 0)) AS costo_total_refacciones
    FROM public.refacciones_por_maquina rpm
    GROUP BY rpm.maquina_id
) c ON d.maquina_id = c.maquina_id
LEFT JOIN public.costos_orden_trabajo ot_c ON d.id_orden_generada = ot_c.id_orden
WHERE d.tipo_mantenimiento = 'PREVENTIVO';

-- 9. Deshabilitar RLS para tablas nuevas para desarrollo fluido con anon key
ALTER TABLE public.levantamientos_mantenimiento DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuestas_checklist_predictivo DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuestas_checklist_autonomo DISABLE ROW LEVEL SECURITY;
