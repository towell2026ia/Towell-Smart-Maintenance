-- SQL Schema for TSM-AI (Towell Smart Maintenance AI)
-- Consolidated Database Blueprint Canvas (29 Tables)

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. BASE CATALOGS (No external foreign key dependencies)
-- ============================================================================

-- Departments Catalog
CREATE TABLE IF NOT EXISTS public.cat_departamentos (
    id_departamento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_departamento VARCHAR(10) NOT NULL UNIQUE, -- e.g., 'PF', 'CF', 'TF', 'AF'
    nombre_departamento VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Shifts Catalog
CREATE TABLE IF NOT EXISTS public.cat_turnos (
    id_turno INT PRIMARY KEY, -- e.g., 1, 2, 3
    nombre_turno VARCHAR(50) NOT NULL,
    descripcion VARCHAR(255),
    hora_inicio TIME,
    hora_fin TIME,
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Order Status Catalog
CREATE TABLE IF NOT EXISTS public.cat_estatus_orden (
    id_estatus UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_estatus VARCHAR(30) NOT NULL UNIQUE, -- e.g., 'solicitud_recibida', 'asignada', 'en_proceso', 'cerrada'
    nombre_estatus VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    orden_flujo INT,
    es_inicial BOOLEAN DEFAULT FALSE,
    es_final BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Fault Categories Catalog
CREATE TABLE IF NOT EXISTS public.cat_categorias_falla (
    id_categoria_falla UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_categoria VARCHAR(30) NOT NULL UNIQUE, -- e.g., 'electrica', 'mecanica'
    nombre_categoria VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    origen VARCHAR(30),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Machine Catalog
CREATE TABLE IF NOT EXISTS public.cat_maquinas (
    id_maquina UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_towell VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'TOW-TEL201-TEJI', 'TOW-LOG1-COST'
    clave VARCHAR(50),
    ax VARCHAR(100) NULL,
    origen VARCHAR(30),
    fecha_carga TIMESTAMP DEFAULT NOW()
);

-- Spare Parts Catalog
CREATE TABLE IF NOT EXISTS public.cat_refacciones (
    codigo_articulo VARCHAR(50) PRIMARY KEY, -- e.g., 'R-05', 'REF-001'
    nombre_articulo VARCHAR(150),
    unidad_medida VARCHAR(30),
    familia VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    fecha_carga TIMESTAMP DEFAULT NOW()
);

-- Maintenance Services Catalog
CREATE TABLE IF NOT EXISTS public.cat_servicios_mantenimiento (
    id_servicio UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_servicio VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'SRV-LUBI-01'
    nombre_servicio VARCHAR(150) NOT NULL,
    descripcion VARCHAR(255),
    tipo_servicio VARCHAR(50), -- 'Preventivo', 'Correctivo', 'Predictivo'
    duracion_estimada_min INT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Suppliers Catalog
CREATE TABLE IF NOT EXISTS public.cat_proveedores (
    id_proveedor UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_proveedor VARCHAR(50) NOT NULL UNIQUE,
    nombre_proveedor VARCHAR(150) NOT NULL,
    contacto VARCHAR(150),
    telefono VARCHAR(30),
    correo VARCHAR(150),
    direccion VARCHAR(255),
    ciudad VARCHAR(100),
    estado VARCHAR(100),
    pais VARCHAR(100),
    tipo_proveedor VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Inventory of Spare Parts Table
CREATE TABLE IF NOT EXISTS public.inventario_refacciones (
    id_inventario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_articulo VARCHAR(50) NOT NULL REFERENCES public.cat_refacciones(codigo_articulo) ON UPDATE CASCADE ON DELETE CASCADE,
    codigo_proveedor VARCHAR(50) REFERENCES public.cat_proveedores(codigo_proveedor) ON UPDATE CASCADE ON DELETE SET NULL,
    stock_actual NUMERIC(18,4) DEFAULT 0,
    stock_minimo NUMERIC(18,4) DEFAULT 0,
    stock_maximo NUMERIC(18,4),
    unidad_medida VARCHAR(30),
    ubicacion VARCHAR(100),
    costo_unitario NUMERIC(18,4) DEFAULT 0,
    moneda VARCHAR(10) DEFAULT 'MXN',
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- ============================================================================
-- 2. DEPENDENT CATALOGS
-- ============================================================================

-- Technicians Catalog
CREATE TABLE IF NOT EXISTS public.cat_tecnicos (
    id_tecnico UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cve_tecnico VARCHAR(30) NOT NULL UNIQUE, -- e.g., 'TEC001'
    nombre_tecnico VARCHAR(150) NOT NULL,
    departamento_codigo VARCHAR(10) REFERENCES public.cat_departamentos(codigo_departamento) ON UPDATE CASCADE ON DELETE RESTRICT,
    turno_id INT REFERENCES public.cat_turnos(id_turno) ON UPDATE CASCADE ON DELETE RESTRICT,
    especialidad VARCHAR(100),
    puesto VARCHAR(100),
    correo VARCHAR(150),
    telefono VARCHAR(30),
    origen VARCHAR(30),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Employees Catalog
CREATE TABLE IF NOT EXISTS public.cat_empleados (
    id_empleado UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cve_empleado VARCHAR(30) NOT NULL UNIQUE, -- e.g., 'EMP001'
    nombre_empleado VARCHAR(150) NOT NULL,
    departamento_codigo VARCHAR(10) REFERENCES public.cat_departamentos(codigo_departamento) ON UPDATE CASCADE ON DELETE RESTRICT,
    turno_id INT REFERENCES public.cat_turnos(id_turno) ON UPDATE CASCADE ON DELETE RESTRICT,
    puesto VARCHAR(100),
    correo VARCHAR(150),
    telefono VARCHAR(30),
    origen VARCHAR(30),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- User Roles and Permissions Catalog
CREATE TABLE IF NOT EXISTS public.cat_usuarios_roles (
    id_usuario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_completo VARCHAR(150) NOT NULL,
    correo VARCHAR(150) UNIQUE,
    telefono VARCHAR(30),
    rol VARCHAR(50) NOT NULL,
    cve_empleado VARCHAR(30) REFERENCES public.cat_empleados(cve_empleado) ON UPDATE CASCADE ON DELETE SET NULL,
    cve_tecnico VARCHAR(30) REFERENCES public.cat_tecnicos(cve_tecnico) ON UPDATE CASCADE ON DELETE SET NULL,
    departamento VARCHAR(50),
    turno INT,
    puede_crear_solicitud BOOLEAN DEFAULT FALSE,
    puede_ver_ordenes_asignadas BOOLEAN DEFAULT FALSE,
    puede_ver_todas_ordenes BOOLEAN DEFAULT FALSE,
    puede_atender_orden BOOLEAN DEFAULT FALSE,
    puede_cerrar_orden BOOLEAN DEFAULT FALSE,
    puede_validar_cierre BOOLEAN DEFAULT FALSE,
    puede_editar_catalogos BOOLEAN DEFAULT FALSE,
    puede_ver_dashboards BOOLEAN DEFAULT FALSE,
    puede_configurar_sistema BOOLEAN DEFAULT FALSE,
    recibe_alertas BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    ultimo_acceso TIMESTAMP,
    debe_cambiar_contrasenia BOOLEAN DEFAULT TRUE,
    observaciones VARCHAR(255)
);

-- Machine Criticality Catalog
CREATE TABLE IF NOT EXISTS public.cat_criticidad_maquina (
    id_criticidad UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id VARCHAR(50) REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE CASCADE,
    nivel_criticidad VARCHAR(30) NOT NULL, -- e.g. 'A', 'B', 'C'
    descripcion_criticidad VARCHAR(255),
    impacto_produccion VARCHAR(100),
    impacto_calidad VARCHAR(100),
    impacto_seguridad VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Fault Types Catalog
CREATE TABLE IF NOT EXISTS public.cat_tipos_falla (
    id_tipo_falla UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_falla_id VARCHAR(50) NOT NULL UNIQUE, -- e.g. alfanumérico
    nombre_falla VARCHAR(150) NOT NULL,
    descripcion VARCHAR(255),
    categoria_falla_id UUID REFERENCES public.cat_categorias_falla(id_categoria_falla) ON UPDATE CASCADE ON DELETE SET NULL,
    prioridad_default VARCHAR(20),
    origen VARCHAR(30),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Machine Components Catalog
-- Registra los componentes o subpartes de cada máquina para rastrear
-- qué parte falló, qué refacción le corresponde y cuál es su criticidad.
CREATE TABLE IF NOT EXISTS public.cat_componentes_maquina (
    id_componente UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Máquina padre
    maquina_id VARCHAR(100) NOT NULL REFERENCES public.cat_maquinas(equipo_towell)
        ON UPDATE CASCADE ON DELETE CASCADE,

    -- Identificación del componente
    codigo_componente VARCHAR(50) NOT NULL,          -- e.g. 'COMP-M301-BOMBA'
    nombre_componente VARCHAR(150) NOT NULL,          -- e.g. 'Bomba de recirculación'
    descripcion VARCHAR(255),

    -- Clasificación
    tipo_componente VARCHAR(50),                      -- 'Mecánico', 'Eléctrico', 'Neumático', etc.
    ubicacion_componente VARCHAR(100),                -- Posición física dentro de la máquina
    numero_parte_fabricante VARCHAR(100),             -- P/N del fabricante

    -- Refacción asociada (opcional)
    -- Permite saber qué pieza del inventario reemplaza a este componente
    codigo_articulo_refaccion VARCHAR(50)
        REFERENCES public.cat_refacciones(codigo_articulo)
        ON UPDATE CASCADE ON DELETE SET NULL,

    -- Tipo de falla más común en este componente (opcional, para análisis)
    tipo_falla_frecuente VARCHAR(50)
        REFERENCES public.cat_tipos_falla(tipo_falla_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    -- Vida útil y mantenimiento
    vida_util_horas INT,                              -- Vida útil estimada en horas
    intervalo_inspeccion_dias INT,                    -- Cada cuántos días inspeccionar
    ultima_inspeccion DATE,
    proxima_inspeccion DATE,

    -- Estado
    estado_componente VARCHAR(30) DEFAULT 'operativo', -- 'operativo', 'degradado', 'falla', 'reemplazado'
    activo BOOLEAN DEFAULT TRUE,

    -- Auditoría
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255),

    -- Garantizar unicidad de código dentro de una máquina
    CONSTRAINT uq_componente_maquina UNIQUE (maquina_id, codigo_componente),

    CONSTRAINT chk_componente_estado
        CHECK (estado_componente IN ('operativo', 'degradado', 'falla', 'reemplazado', 'baja'))
);

-- ============================================================================
-- 3. HISTORICAL DATA / STAGING / AUDITING
-- ============================================================================

-- Telegram Looms Staging Table
CREATE TABLE IF NOT EXISTS public.stg_telegram_ordenes_telares (
    id INT,
    folio VARCHAR(10),
    estatus VARCHAR(15),
    fecha DATE,
    hora TIME,
    depto VARCHAR(15),
    maquina_id VARCHAR(50),
    tipo_falla_id VARCHAR(50),
    falla VARCHAR(100),
    hora_fin TIME,
    cve_empl VARCHAR(30),
    nom_empl VARCHAR(150),
    turno INT,
    cve_atendio VARCHAR(30),
    nom_atendio VARCHAR(150),
    turno_atendio INT,
    obs VARCHAR(255),
    orden_trabajo VARCHAR(50),
    descripcion VARCHAR(255),
    enviado BOOLEAN,
    obs_cierre VARCHAR(255),
    calidad INT,
    fecha_fin DATE,
    fecha_carga TIMESTAMP DEFAULT NOW()
);

-- Excel Faults Staging Table
CREATE TABLE IF NOT EXISTS public.stg_fallas_por_maquina_excel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id VARCHAR(50),
    descripcion VARCHAR(255),
    creada TIMESTAMP,
    archivo_origen VARCHAR(150),
    fecha_carga TIMESTAMP DEFAULT NOW()
);

-- File Upload Auditor Table
CREATE TABLE IF NOT EXISTS public.control_cargas_archivos (
    id_carga UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_archivo VARCHAR(150),
    tipo_archivo VARCHAR(50),
    fuente VARCHAR(100),
    fecha_carga TIMESTAMP DEFAULT NOW(),
    usuario_carga VARCHAR(150),
    registros_leidos INT,
    registros_correctos INT,
    registros_error INT,
    estatus_carga VARCHAR(30),
    observaciones VARCHAR(255)
);

-- ============================================================================
-- 4. CORE TRANSACTIONAL TABLES
-- ============================================================================

-- Work Orders (OT) Table
CREATE TABLE IF NOT EXISTS public.ordenes_trabajo (
    id_orden UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_original INT,
    folio VARCHAR(30) UNIQUE, -- Format: PREFIJO + CONSECUTIVO (e.g. PF04654)
    orden_trabajo VARCHAR(50),
    origen VARCHAR(30), -- 'App', 'Telegram', 'Excel'
    estatus VARCHAR(30) REFERENCES public.cat_estatus_orden(codigo_estatus) ON UPDATE CASCADE ON DELETE RESTRICT,
    fecha_inicio DATE,
    hora_inicio TIME,
    fecha_hora_inicio TIMESTAMP,
    departamento VARCHAR(15) REFERENCES public.cat_departamentos(codigo_departamento) ON UPDATE CASCADE ON DELETE RESTRICT,
    maquina_id VARCHAR(50) REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE RESTRICT,
    tipo_falla_id VARCHAR(50) REFERENCES public.cat_tipos_falla(tipo_falla_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    falla VARCHAR(100),
    descripcion VARCHAR(255),
    observacion_inicial VARCHAR(255),
    cve_solicitante VARCHAR(30) REFERENCES public.cat_empleados(cve_empleado) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombre_solicitante VARCHAR(150),
    turno_solicitante INT REFERENCES public.cat_turnos(id_turno) ON UPDATE CASCADE ON DELETE RESTRICT,
    cve_atendio VARCHAR(30) REFERENCES public.cat_tecnicos(cve_tecnico) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombre_atendio VARCHAR(150),
    turno_atendio INT REFERENCES public.cat_turnos(id_turno) ON UPDATE CASCADE ON DELETE RESTRICT,
    fecha_fin DATE,
    hora_fin TIME,
    fecha_hora_fin TIMESTAMP,
    tiempo_atencion_min INT,
    observacion_cierre VARCHAR(255),
    calidad INT,
    enviado BOOLEAN DEFAULT FALSE,
    es_reincidente BOOLEAN DEFAULT FALSE,
    prioridad VARCHAR(20),
    tipo_orden VARCHAR(50) NULL,
    id_plan UUID NULL REFERENCES public.planes_mantenimiento_preventivo(id_plan) ON DELETE SET NULL,
    id_carga UUID NULL REFERENCES public.control_cargas_archivos(id_carga) ON DELETE SET NULL,
    validado_desde_excel BOOLEAN DEFAULT FALSE,
    fecha_validacion_excel TIMESTAMPTZ NULL,
    observaciones_validacion TEXT NULL,
    fecha_carga TIMESTAMP DEFAULT NOW()
);

-- Work Order Event Log (Bitácora) Table
CREATE TABLE IF NOT EXISTS public.bitacora_orden_trabajo (
    id_bitacora UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden UUID NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON DELETE CASCADE,
    fecha_hora_evento TIMESTAMP DEFAULT NOW(),
    estatus_anterior VARCHAR(30),
    estatus_nuevo VARCHAR(30),
    usuario_evento VARCHAR(150),
    rol_usuario VARCHAR(50),
    tipo_evento VARCHAR(50),
    comentario VARCHAR(255),
    origen VARCHAR(30),
    fecha_alta TIMESTAMP DEFAULT NOW()
);

-- Maintenance Assignments Table
CREATE TABLE IF NOT EXISTS public.asignaciones_mantenimiento (
    id_asignacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden UUID NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON DELETE CASCADE,
    cve_tecnico VARCHAR(30) NOT NULL REFERENCES public.cat_tecnicos(cve_tecnico) ON UPDATE CASCADE ON DELETE RESTRICT,
    asignado_por VARCHAR(150),
    fecha_asignacion TIMESTAMP DEFAULT NOW(),
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    estatus_asignacion VARCHAR(30),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Work Order Closures (Cierres) Table
CREATE TABLE IF NOT EXISTS public.cierres_orden_trabajo (
    id_cierre UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden UUID NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON DELETE CASCADE,
    fecha_cierre TIMESTAMP DEFAULT NOW(),
    cve_tecnico VARCHAR(30) REFERENCES public.cat_tecnicos(cve_tecnico) ON UPDATE CASCADE ON DELETE SET NULL,
    nombre_tecnico VARCHAR(150),
    usuario_valida VARCHAR(150),
    fecha_validacion TIMESTAMP,
    observacion_cierre VARCHAR(255),
    calidad INT,
    requiere_retrabajo BOOLEAN DEFAULT FALSE,
    validado_por_solicitante BOOLEAN DEFAULT FALSE,
    estatus_cierre VARCHAR(30),
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- ============================================================================
-- 5. SPARE PARTS, COSTS AND ALERTS
-- ============================================================================

-- Normalised Machine Fault Log Table
CREATE TABLE IF NOT EXISTS public.fallas_por_maquina (
    id_falla UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id VARCHAR(50) REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE CASCADE,
    descripcion_falla VARCHAR(255),
    fecha_hora_creada TIMESTAMP,
    fecha_creada DATE,
    hora_creada TIME,
    origen VARCHAR(30),
    archivo_origen VARCHAR(150),
    categoria_falla VARCHAR(100),
    es_recurrente BOOLEAN DEFAULT FALSE,
    fecha_carga TIMESTAMP DEFAULT NOW()
);

-- Spare Parts Consumption per Machine Table
CREATE TABLE IF NOT EXISTS public.refacciones_por_maquina (
    id_refaccion_maquina UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE,
    maquina_id VARCHAR(50) REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE RESTRICT,
    destino VARCHAR(100),
    codigo_articulo VARCHAR(50) REFERENCES public.cat_refacciones(codigo_articulo) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombre_articulo VARCHAR(150),
    cantidad_estandar NUMERIC(18,4),
    precio_costo_unitario NUMERIC(18,4),
    importe_costo_calculado NUMERIC(18,4), -- Auto-calculated: Cantidad * Precio Unitario
    importe_costo_origen NUMERIC(18,4),
    diferencia_importe NUMERIC(18,4),
    origen VARCHAR(30),
    fecha_carga TIMESTAMP DEFAULT NOW()
);

-- Historical Price Log Table
CREATE TABLE IF NOT EXISTS public.historico_precios_refacciones (
    id_precio UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_articulo VARCHAR(50) REFERENCES public.cat_refacciones(codigo_articulo) ON UPDATE CASCADE ON DELETE CASCADE,
    fecha DATE,
    precio_costo_unitario NUMERIC(18,4),
    moneda VARCHAR(10) DEFAULT 'MXN',
    origen VARCHAR(30),
    fecha_carga TIMESTAMP DEFAULT NOW()
);

-- Work Order Costs Table
CREATE TABLE IF NOT EXISTS public.costos_orden_trabajo (
    id_costo_orden UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden UUID NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON DELETE CASCADE,
    costo_refacciones NUMERIC(18,4) DEFAULT 0,
    costo_mano_obra NUMERIC(18,4) DEFAULT 0,
    costo_paro NUMERIC(18,4) DEFAULT 0,
    costo_extra NUMERIC(18,4) DEFAULT 0,
    costo_total NUMERIC(18,4) DEFAULT 0, -- Costo Refacciones + Mano de obra + Costo paro + Costo extra
    moneda VARCHAR(10) DEFAULT 'MXN',
    fecha_calculo TIMESTAMP DEFAULT NOW(),
    calculado_por VARCHAR(100),
    origen VARCHAR(30),
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- System Alerts Table
CREATE TABLE IF NOT EXISTS public.alertas_sistema (
    id_alerta UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_alerta VARCHAR(50) NOT NULL,
    titulo_alerta VARCHAR(150),
    mensaje_alerta VARCHAR(255),
    prioridad VARCHAR(30),
    estatus_alerta VARCHAR(30),
    id_orden UUID REFERENCES public.ordenes_trabajo(id_orden) ON DELETE CASCADE,
    maquina_id VARCHAR(50) REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE CASCADE,
    tipo_falla_id VARCHAR(50) REFERENCES public.cat_tipos_falla(tipo_falla_id) ON UPDATE CASCADE ON DELETE CASCADE,
    usuario_notificado VARCHAR(150),
    rol_notificado VARCHAR(50),
    fecha_generacion TIMESTAMP DEFAULT NOW(),
    fecha_visto TIMESTAMP,
    fecha_atendida TIMESTAMP,
    origen VARCHAR(30),
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Internal User Notifications Table
-- Tabla separada de alertas_sistema:
--   alertas_sistema = eventos automáticos del motor de reglas (máquina, falla, KPI)
--   notificaciones_internas = mensajes de flujo de trabajo usuario-a-usuario
--     Ej: OT asignada al técnico, subtarea asignada, OT cerrada, comentario nuevo
CREATE TABLE IF NOT EXISTS public.notificaciones_internas (
    id_notificacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Receptor (obligatorio — FK real a usuarios del sistema)
    id_usuario_receptor UUID NOT NULL REFERENCES public.cat_usuarios_roles(id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE,

    -- Tipo y contenido
    tipo_notificacion VARCHAR(50) NOT NULL,
        -- 'ot_asignada' | 'ot_actualizada' | 'ot_cerrada' | 'ot_comentario'
        -- 'subtarea_asignada' | 'subtarea_actualizada' | 'subtarea_cerrada'
        -- 'solicitud_nueva' | 'alerta_critica' | 'sistema'
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    prioridad VARCHAR(20) DEFAULT 'normal',
        -- 'baja' | 'normal' | 'alta' | 'critica'

    -- Entidad origen (todas opcionales — al menos una debería estar presente)
    id_orden UUID REFERENCES public.ordenes_trabajo(id_orden)
        ON DELETE CASCADE,
    id_subtarea UUID REFERENCES public.subtareas_orden_trabajo(id_subtarea)
        ON DELETE CASCADE,

    -- Quién la generó (puede ser sistema o un usuario)
    generada_por VARCHAR(150),           -- 'sistema' o nombre/clave del usuario
    id_usuario_emisor UUID REFERENCES public.cat_usuarios_roles(id_usuario)
        ON UPDATE CASCADE ON DELETE SET NULL,

    -- Estado de lectura
    leida BOOLEAN DEFAULT FALSE,
    fecha_lectura TIMESTAMP,

    -- Acción asociada (URL o panel a abrir al hacer clic)
    accion_url VARCHAR(255),             -- e.g. '#panel-orders' o '#panel-subtasks'

    -- Auditoría
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    activo BOOLEAN DEFAULT TRUE,

    CONSTRAINT chk_notif_tipo CHECK (
        tipo_notificacion IN (
            'ot_asignada', 'ot_actualizada', 'ot_cerrada', 'ot_comentario',
            'subtarea_asignada', 'subtarea_actualizada', 'subtarea_cerrada',
            'solicitud_nueva', 'alerta_critica', 'sistema'
        )
    ),

    CONSTRAINT chk_notif_prioridad CHECK (
        prioridad IN ('baja', 'normal', 'alta', 'critica')
    )
);

-- ============================================================================
-- 6. SUBTASKS SYSTEM (INTERACTION MODULE)
-- ============================================================================

-- Subtasks Table
CREATE TABLE IF NOT EXISTS public.subtareas_orden_trabajo (
    id_subtarea UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden UUID NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON UPDATE CASCADE ON DELETE RESTRICT,
    folio_ot VARCHAR(30) NOT NULL REFERENCES public.ordenes_trabajo(folio) ON UPDATE CASCADE ON DELETE RESTRICT,
    numero_subtarea INTEGER NOT NULL,
    titulo_subtarea VARCHAR(150) NOT NULL,
    area_requerida VARCHAR(30) NOT NULL,
    descripcion_subtarea VARCHAR(255) NOT NULL,
    motivo_solicitud VARCHAR(255),
    fecha_deseada DATE,
    prioridad VARCHAR(30) NOT NULL DEFAULT 'media',
    requiere_paro BOOLEAN NOT NULL DEFAULT FALSE,
    requiere_refaccion BOOLEAN NOT NULL DEFAULT FALSE,
    estatus_subtarea VARCHAR(30) NOT NULL DEFAULT 'solicitada',
    solicitado_por UUID NOT NULL REFERENCES public.cat_usuarios_roles(id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    asignado_por UUID REFERENCES public.cat_usuarios_roles(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL,
    responsable_asignado UUID REFERENCES public.cat_usuarios_roles(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL,
    fecha_solicitud TIMESTAMP DEFAULT NOW(),
    fecha_asignacion TIMESTAMP,
    fecha_inicio TIMESTAMP,
    fecha_cierre TIMESTAMP,
    observaciones VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW(),

    CONSTRAINT chk_subtareas_area_requerida
        CHECK (
            area_requerida IN (
                'mecanico',
                'electrico',
                'lubricacion',
                'limpieza',
                'ajuste',
                'servicio_externo',
                'refacciones',
                'otro'
            )
        ),

    CONSTRAINT chk_subtareas_prioridad
        CHECK (
            prioridad IN (
                'baja',
                'media',
                'alta',
                'critica'
            )
        ),

    CONSTRAINT chk_subtareas_estatus
        CHECK (
            estatus_subtarea IN (
                'solicitada',
                'asignada',
                'en_proceso',
                'en_espera',
                'bloqueada',
                'terminada',
                'cancelada'
            )
        ),

    CONSTRAINT uq_subtareas_numero
        UNIQUE (id_orden, numero_subtarea)
);

-- Subtask Assignments Table
CREATE TABLE IF NOT EXISTS public.asignaciones_subtareas (
    id_asignacion_subtarea UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_subtarea UUID NOT NULL REFERENCES public.subtareas_orden_trabajo(id_subtarea) ON DELETE CASCADE,
    cve_tecnico VARCHAR(30) NOT NULL REFERENCES public.cat_tecnicos(cve_tecnico) ON UPDATE CASCADE ON DELETE RESTRICT,
    asignado_por UUID REFERENCES public.cat_usuarios_roles(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL,
    fecha_asignacion TIMESTAMP DEFAULT NOW(),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Subtask Event Log (Bitácora) Table
CREATE TABLE IF NOT EXISTS public.bitacora_subtareas (
    id_movimiento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden UUID REFERENCES public.ordenes_trabajo(id_orden) ON DELETE CASCADE,
    id_subtarea UUID REFERENCES public.subtareas_orden_trabajo(id_subtarea) ON DELETE SET NULL,
    tipo_movimiento VARCHAR(50) NOT NULL,
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30),
    realizado_por VARCHAR(150),
    comentario TEXT,
    fecha_movimiento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subtask Evidences Table
CREATE TABLE IF NOT EXISTS public.evidencias_subtareas (
    id_evidencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_subtarea UUID NOT NULL REFERENCES public.subtareas_orden_trabajo(id_subtarea) ON UPDATE CASCADE ON DELETE CASCADE,
    id_orden UUID NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON UPDATE CASCADE ON DELETE RESTRICT,
    tipo_archivo VARCHAR(50) NOT NULL,
    origen_evidencia VARCHAR(50) NOT NULL DEFAULT 'solicitud',
    nombre_archivo VARCHAR(150),
    url_archivo VARCHAR(255) NOT NULL,
    storage_bucket VARCHAR(100) DEFAULT 'ot-evidencias',
    storage_path VARCHAR(255),
    descripcion VARCHAR(255),
    subido_por UUID NOT NULL REFERENCES public.cat_usuarios_roles(id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    fecha_subida TIMESTAMP DEFAULT NOW(),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW(),

    CONSTRAINT chk_evidencias_tipo_archivo
        CHECK (
            tipo_archivo IN (
                'imagen',
                'video',
                'pdf',
                'audio',
                'documento',
                'otro'
            )
        ),

    CONSTRAINT chk_evidencias_origen
        CHECK (
            origen_evidencia IN (
                'solicitud',
                'avance',
                'cierre',
                'diagnostico',
                'otro'
            )
        )
);

-- Spare Parts Used in Subtasks Table
CREATE TABLE IF NOT EXISTS public.refacciones_usadas_subtarea (
    id_refaccion_subtarea UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_subtarea UUID NOT NULL REFERENCES public.subtareas_orden_trabajo(id_subtarea) ON DELETE CASCADE,
    codigo_articulo VARCHAR(50) REFERENCES public.cat_refacciones(codigo_articulo) ON UPDATE CASCADE ON DELETE RESTRICT,
    cantidad NUMERIC(18,4) DEFAULT 1.0000,
    precio_unitario NUMERIC(18,4) NOT NULL,
    importe_calculado NUMERIC(18,4), -- Cantidad * Precio Unitario
    fecha_alta TIMESTAMP DEFAULT NOW()
);

-- Subtask Costs Table
CREATE TABLE IF NOT EXISTS public.costos_subtarea (
    id_costo_subtarea UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_subtarea UUID NOT NULL REFERENCES public.subtareas_orden_trabajo(id_subtarea) ON DELETE CASCADE,
    id_orden UUID NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON DELETE CASCADE,
    costo_refacciones NUMERIC(18,4) DEFAULT 0,
    costo_mano_obra NUMERIC(18,4) DEFAULT 0,
    costo_total NUMERIC(18,4) DEFAULT 0,
    fecha_calculo TIMESTAMP DEFAULT NOW(),
    fecha_alta TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 7. OPERATIONAL, ANALYTICAL AND AI TABLES
-- ============================================================================

-- Labor Costs per Technician Table
CREATE TABLE IF NOT EXISTS public.costos_mano_obra (
    id_costo_mano_obra UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cve_tecnico VARCHAR(30) NOT NULL REFERENCES public.cat_tecnicos(cve_tecnico) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombre_tecnico VARCHAR(150),
    costo_hora NUMERIC(18,4) DEFAULT 0,
    moneda VARCHAR(10) DEFAULT 'MXN',
    fecha_inicio_vigencia DATE,
    fecha_fin_vigencia DATE,
    origen VARCHAR(30),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Work Order Evidence Files Table
CREATE TABLE IF NOT EXISTS public.evidencias_orden (
    id_evidencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden UUID NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON DELETE CASCADE,
    tipo_evidencia VARCHAR(50),
    nombre_archivo VARCHAR(150),
    url_archivo TEXT,
    comentario VARCHAR(255),
    usuario_carga VARCHAR(150),
    fecha_carga TIMESTAMP DEFAULT NOW(),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Machine Downtime Stops Table
CREATE TABLE IF NOT EXISTS public.paros_maquina (
    id_paro UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden UUID REFERENCES public.ordenes_trabajo(id_orden) ON DELETE SET NULL,
    maquina_id VARCHAR(50) NOT NULL REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE RESTRICT,
    fecha_hora_inicio_paro TIMESTAMP,
    fecha_hora_fin_paro TIMESTAMP,
    tiempo_paro_min INT,
    motivo_paro VARCHAR(255),
    impacto_produccion VARCHAR(100),
    costo_estimado_paro NUMERIC(18,4) DEFAULT 0,
    moneda VARCHAR(10) DEFAULT 'MXN',
    origen VARCHAR(30),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Preventive Maintenance Plans Table
CREATE TABLE IF NOT EXISTS public.planes_mantenimiento_preventivo (
    id_plan UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id VARCHAR(50) NOT NULL REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE RESTRICT,
    codigo_servicio VARCHAR(50) NOT NULL REFERENCES public.cat_servicios_mantenimiento(codigo_servicio) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombre_plan VARCHAR(150),
    descripcion VARCHAR(255),
    frecuencia INT,
    unidad_frecuencia VARCHAR(30), -- 'dias', 'semanas', 'meses', 'horas'
    ultima_ejecucion DATE,
    proxima_ejecucion DATE,
    responsable VARCHAR(150),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Maintenance Checklists Table
CREATE TABLE IF NOT EXISTS public.checklists_mantenimiento (
    id_checklist UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_servicio VARCHAR(50) NOT NULL REFERENCES public.cat_servicios_mantenimiento(codigo_servicio) ON UPDATE CASCADE ON DELETE RESTRICT,
    codigo_pregunta VARCHAR(50),
    pregunta VARCHAR(255) NOT NULL,
    tipo_respuesta VARCHAR(50), -- 'si_no', 'texto', 'numerico', 'seleccion'
    obligatorio BOOLEAN DEFAULT FALSE,
    orden INT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Checklist Responses per Work Order Table
CREATE TABLE IF NOT EXISTS public.respuestas_checklist_orden (
    id_respuesta UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden UUID NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON DELETE CASCADE,
    id_checklist UUID NOT NULL REFERENCES public.checklists_mantenimiento(id_checklist) ON UPDATE CASCADE ON DELETE RESTRICT,
    respuesta VARCHAR(255),
    comentario VARCHAR(255),
    usuario_responde VARCHAR(150),
    fecha_respuesta TIMESTAMP DEFAULT NOW(),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Alert Rules Table
CREATE TABLE IF NOT EXISTS public.reglas_alertas (
    id_regla UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_regla VARCHAR(50) NOT NULL UNIQUE,
    nombre_regla VARCHAR(150) NOT NULL,
    descripcion VARCHAR(255),
    tipo_alerta VARCHAR(50),
    condicion VARCHAR(255),
    valor_umbral NUMERIC(18,4),
    unidad_umbral VARCHAR(50),
    prioridad_default VARCHAR(30),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Fault Repeatability Analysis Table (AI Engine Input)
CREATE TABLE IF NOT EXISTS public.analisis_repetibilidad_fallas (
    id_analisis UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id VARCHAR(50) NOT NULL REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE RESTRICT,
    tipo_falla_id VARCHAR(50) REFERENCES public.cat_tipos_falla(tipo_falla_id) ON UPDATE CASCADE ON DELETE SET NULL,
    descripcion_falla VARCHAR(255),
    categoria_falla VARCHAR(100),
    cantidad_repeticiones INT DEFAULT 0,
    periodo_dias INT,
    fecha_primera_falla DATE,
    fecha_ultima_falla DATE,
    nivel_riesgo VARCHAR(30),
    recomendacion VARCHAR(255),
    origen VARCHAR(30),
    fecha_analisis TIMESTAMP DEFAULT NOW(),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- AI Recommendations Table
CREATE TABLE IF NOT EXISTS public.recomendaciones_ia (
    id_recomendacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id VARCHAR(50) REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE SET NULL,
    id_orden UUID REFERENCES public.ordenes_trabajo(id_orden) ON DELETE SET NULL,
    id_analisis UUID REFERENCES public.analisis_repetibilidad_fallas(id_analisis) ON DELETE SET NULL,
    tipo_recomendacion VARCHAR(50),
    titulo_recomendacion VARCHAR(150),
    mensaje_recomendacion VARCHAR(255),
    nivel_confianza NUMERIC(5,2),
    prioridad VARCHAR(30),
    estatus_recomendacion VARCHAR(30),
    generado_por VARCHAR(50),
    fecha_generacion TIMESTAMP DEFAULT NOW(),
    revisado_por VARCHAR(150),
    fecha_revision TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- Maintenance KPIs Table
CREATE TABLE IF NOT EXISTS public.kpis_mantenimiento (
    id_kpi UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    periodo VARCHAR(30), -- 'diario', 'semanal', 'mensual'
    maquina_id VARCHAR(50) REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE SET NULL,
    departamento_codigo VARCHAR(10) REFERENCES public.cat_departamentos(codigo_departamento) ON UPDATE CASCADE ON DELETE SET NULL,
    total_ordenes INT DEFAULT 0,
    ordenes_abiertas INT DEFAULT 0,
    ordenes_cerradas INT DEFAULT 0,
    tiempo_promedio_atencion_min NUMERIC(18,4) DEFAULT 0,
    fallas_repetidas INT DEFAULT 0,
    costo_refacciones_total NUMERIC(18,4) DEFAULT 0,
    costo_mano_obra_total NUMERIC(18,4) DEFAULT 0,
    costo_total NUMERIC(18,4) DEFAULT 0,
    moneda VARCHAR(10) DEFAULT 'MXN',
    fecha_calculo TIMESTAMP DEFAULT NOW(),
    origen VARCHAR(30),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    observaciones VARCHAR(255)
);

-- ============================================================================
-- 8. PERFORMANCE INDEXES
-- ============================================================================

-- Work Orders Indexes
CREATE INDEX IF NOT EXISTS idx_ot_folio ON public.ordenes_trabajo(folio);
CREATE INDEX IF NOT EXISTS idx_ot_estatus ON public.ordenes_trabajo(estatus);
CREATE INDEX IF NOT EXISTS idx_ot_maquina ON public.ordenes_trabajo(maquina_id);
CREATE INDEX IF NOT EXISTS idx_ot_depto ON public.ordenes_trabajo(departamento);

-- Subtasks Indexes
CREATE INDEX IF NOT EXISTS idx_subtasks_id_orden ON public.subtareas_orden_trabajo(id_orden);
CREATE INDEX IF NOT EXISTS idx_subtasks_folio ON public.subtareas_orden_trabajo(folio_ot);
CREATE INDEX IF NOT EXISTS idx_subtasks_estatus ON public.subtareas_orden_trabajo(estatus_subtarea);
CREATE INDEX IF NOT EXISTS idx_subtasks_area ON public.subtareas_orden_trabajo(area_requerida);
CREATE INDEX IF NOT EXISTS idx_subtasks_responsable ON public.subtareas_orden_trabajo(responsable_asignado);
CREATE INDEX IF NOT EXISTS idx_subtasks_fecha_deseada ON public.subtareas_orden_trabajo(fecha_deseada);
CREATE INDEX IF NOT EXISTS idx_subtasks_prioridad ON public.subtareas_orden_trabajo(prioridad);

-- Evidences Indexes
CREATE INDEX IF NOT EXISTS idx_subtask_evidences_id_subtarea ON public.evidencias_subtareas(id_subtarea);
CREATE INDEX IF NOT EXISTS idx_subtask_evidences_id_orden ON public.evidencias_subtareas(id_orden);
CREATE INDEX IF NOT EXISTS idx_subtask_evidences_tipo ON public.evidencias_subtareas(tipo_archivo);
CREATE INDEX IF NOT EXISTS idx_subtask_evidences_origen ON public.evidencias_subtareas(origen_evidencia);
CREATE INDEX IF NOT EXISTS idx_subtask_evidences_subido_por ON public.evidencias_subtareas(subido_por);

-- Staging & Parts Indexes
CREATE INDEX IF NOT EXISTS idx_ref_maquina ON public.refacciones_por_maquina(maquina_id);
CREATE INDEX IF NOT EXISTS idx_ref_codigo ON public.refacciones_por_maquina(codigo_articulo);

-- Internal Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_notif_receptor ON public.notificaciones_internas(id_usuario_receptor);
CREATE INDEX IF NOT EXISTS idx_notif_leida ON public.notificaciones_internas(leida);
CREATE INDEX IF NOT EXISTS idx_notif_orden ON public.notificaciones_internas(id_orden);
CREATE INDEX IF NOT EXISTS idx_notif_subtarea ON public.notificaciones_internas(id_subtarea);
CREATE INDEX IF NOT EXISTS idx_notif_fecha ON public.notificaciones_internas(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_notif_tipo ON public.notificaciones_internas(tipo_notificacion);

-- Machine Components Indexes
CREATE INDEX IF NOT EXISTS idx_comp_maquina ON public.cat_componentes_maquina(maquina_id);
CREATE INDEX IF NOT EXISTS idx_comp_estado ON public.cat_componentes_maquina(estado_componente);
CREATE INDEX IF NOT EXISTS idx_comp_proxima_insp ON public.cat_componentes_maquina(proxima_inspeccion);
CREATE INDEX IF NOT EXISTS idx_comp_tipo_falla ON public.cat_componentes_maquina(tipo_falla_frecuente);

-- New Tables Indexes (T19-T29)
CREATE INDEX IF NOT EXISTS idx_costo_mo_tecnico ON public.costos_mano_obra(cve_tecnico);
CREATE INDEX IF NOT EXISTS idx_costo_mo_vigencia ON public.costos_mano_obra(fecha_inicio_vigencia, fecha_fin_vigencia);
CREATE INDEX IF NOT EXISTS idx_evidencias_orden ON public.evidencias_orden(id_orden);
CREATE INDEX IF NOT EXISTS idx_paros_maquina ON public.paros_maquina(maquina_id);
CREATE INDEX IF NOT EXISTS idx_paros_orden ON public.paros_maquina(id_orden);
CREATE INDEX IF NOT EXISTS idx_paros_fecha ON public.paros_maquina(fecha_hora_inicio_paro);
CREATE INDEX IF NOT EXISTS idx_planes_mp_maquina ON public.planes_mantenimiento_preventivo(maquina_id);
CREATE INDEX IF NOT EXISTS idx_planes_mp_servicio ON public.planes_mantenimiento_preventivo(codigo_servicio);
CREATE INDEX IF NOT EXISTS idx_planes_mp_proxima ON public.planes_mantenimiento_preventivo(proxima_ejecucion);
CREATE INDEX IF NOT EXISTS idx_checklist_servicio ON public.checklists_mantenimiento(codigo_servicio);
CREATE INDEX IF NOT EXISTS idx_respuestas_orden ON public.respuestas_checklist_orden(id_orden);
CREATE INDEX IF NOT EXISTS idx_respuestas_checklist ON public.respuestas_checklist_orden(id_checklist);
CREATE INDEX IF NOT EXISTS idx_analisis_maquina ON public.analisis_repetibilidad_fallas(maquina_id);
CREATE INDEX IF NOT EXISTS idx_analisis_falla ON public.analisis_repetibilidad_fallas(tipo_falla_id);
CREATE INDEX IF NOT EXISTS idx_analisis_nivel_riesgo ON public.analisis_repetibilidad_fallas(nivel_riesgo);
CREATE INDEX IF NOT EXISTS idx_recom_ia_maquina ON public.recomendaciones_ia(maquina_id);
CREATE INDEX IF NOT EXISTS idx_recom_ia_orden ON public.recomendaciones_ia(id_orden);
CREATE INDEX IF NOT EXISTS idx_recom_ia_estatus ON public.recomendaciones_ia(estatus_recomendacion);
CREATE INDEX IF NOT EXISTS idx_kpis_fecha ON public.kpis_mantenimiento(fecha);
CREATE INDEX IF NOT EXISTS idx_kpis_maquina ON public.kpis_mantenimiento(maquina_id);
CREATE INDEX IF NOT EXISTS idx_kpis_depto ON public.kpis_mantenimiento(departamento_codigo);

-- ============================================================================
-- 9. TRIGGERS & FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.actualizar_campo_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trg_subtareas_actualizado_en ON public.subtareas_orden_trabajo;
CREATE TRIGGER trg_subtareas_actualizado_en
    BEFORE UPDATE ON public.subtareas_orden_trabajo
    FOR EACH ROW
    EXECUTE FUNCTION public.actualizar_campo_actualizado_en();

DROP TRIGGER IF EXISTS trg_evidencias_subtareas_actualizado_en ON public.evidencias_subtareas;
CREATE TRIGGER trg_evidencias_subtareas_actualizado_en
    BEFORE UPDATE ON public.evidencias_subtareas
    FOR EACH ROW
    EXECUTE FUNCTION public.actualizar_campo_actualizado_en();

-- ============================================================================
-- 10. SECURITY & RLS DISABLE (Public client direct connection)
-- ============================================================================

-- Base Catalogs
ALTER TABLE public.cat_departamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_turnos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_estatus_orden DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_categorias_falla DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_maquinas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_refacciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_servicios_mantenimiento DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_proveedores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_refacciones DISABLE ROW LEVEL SECURITY;

-- Dependent Catalogs
ALTER TABLE public.cat_tecnicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_empleados DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_usuarios_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_criticidad_maquina DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_tipos_falla DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_componentes_maquina DISABLE ROW LEVEL SECURITY;

-- Staging & Audit
ALTER TABLE public.stg_telegram_ordenes_telares DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_fallas_por_maquina_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_cargas_archivos DISABLE ROW LEVEL SECURITY;

-- Core Transactional
ALTER TABLE public.ordenes_trabajo DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora_orden_trabajo DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_mantenimiento DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cierres_orden_trabajo DISABLE ROW LEVEL SECURITY;

-- Parts, Costs & Alerts
ALTER TABLE public.fallas_por_maquina DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.refacciones_por_maquina DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_precios_refacciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.costos_orden_trabajo DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_sistema DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones_internas DISABLE ROW LEVEL SECURITY;

-- Subtasks Module
ALTER TABLE public.subtareas_orden_trabajo DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_subtareas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora_subtareas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidencias_subtareas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.refacciones_usadas_subtarea DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.costos_subtarea DISABLE ROW LEVEL SECURITY;

-- Operational, Analytical & AI (T19-T29)
ALTER TABLE public.costos_mano_obra DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidencias_orden DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.paros_maquina DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes_mantenimiento_preventivo DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists_mantenimiento DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuestas_checklist_orden DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reglas_alertas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analisis_repetibilidad_fallas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recomendaciones_ia DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis_mantenimiento DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 11. NEW STAGING TABLES (Ingestion from Excel)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stg_maquinas_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_towell VARCHAR(255) NULL,
    clave VARCHAR(255) NULL,
    ax VARCHAR(255) NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stg_refacciones_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_articulo VARCHAR(255) NULL,
    nombre_articulo VARCHAR(255) NULL,
    unidad_medida VARCHAR(255) NULL,
    familia VARCHAR(255) NULL,
    activo VARCHAR(255) NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stg_tecnicos_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cve_tecnico VARCHAR(255) NULL,
    nombre_tecnico VARCHAR(255) NULL,
    departamento_codigo VARCHAR(255) NULL,
    turno_id VARCHAR(255) NULL,
    especialidad VARCHAR(255) NULL,
    puesto VARCHAR(255) NULL,
    correo VARCHAR(255) NULL,
    telefono VARCHAR(255) NULL,
    activo VARCHAR(255) NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stg_empleados_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cve_empleado VARCHAR(255) NULL,
    nombre_empleado VARCHAR(255) NULL,
    departamento_codigo VARCHAR(255) NULL,
    turno_id VARCHAR(255) NULL,
    puesto VARCHAR(255) NULL,
    correo VARCHAR(255) NULL,
    telefono VARCHAR(255) NULL,
    activo VARCHAR(255) NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stg_refacciones_por_maquina_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha VARCHAR(255) NULL,
    maquina_id VARCHAR(255) NULL,
    destino VARCHAR(255) NULL,
    codigo_articulo VARCHAR(255) NULL,
    nombre_articulo VARCHAR(255) NULL,
    cantidad_estandar VARCHAR(255) NULL,
    precio_costo_unitario VARCHAR(255) NULL,
    importe_costo_origen VARCHAR(255) NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stg_historico_precios_refacciones_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_articulo VARCHAR(255) NULL,
    fecha VARCHAR(255) NULL,
    precio_costo_unitario VARCHAR(255) NULL,
    moneda VARCHAR(255) NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stg_inventario_refacciones_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_articulo VARCHAR(255) NULL,
    codigo_proveedor VARCHAR(255) NULL,
    stock_actual VARCHAR(255) NULL,
    stock_minimo VARCHAR(255) NULL,
    stock_maximo VARCHAR(255) NULL,
    unidad_medida VARCHAR(255) NULL,
    ubicacion VARCHAR(255) NULL,
    costo_unitario VARCHAR(255) NULL,
    moneda VARCHAR(255) NULL,
    observaciones TEXT NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stg_costos_mano_obra_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cve_tecnico VARCHAR(255) NULL,
    nombre_tecnico VARCHAR(255) NULL,
    costo_hora VARCHAR(255) NULL,
    moneda VARCHAR(255) NULL,
    fecha_inicio_vigencia VARCHAR(255) NULL,
    fecha_fin_vigencia VARCHAR(255) NULL,
    observaciones TEXT NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stg_segundas_por_rollo_excel (
    id_stg UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produccion VARCHAR(255) NULL,
    fecha VARCHAR(255) NULL,
    codigo_bodega VARCHAR(255) NULL,
    codigo_articulo VARCHAR(255) NULL,
    nombre_articulo VARCHAR(255) NULL,
    configuracion VARCHAR(255) NULL,
    tamano VARCHAR(255) NULL,
    color VARCHAR(255) NULL,
    nombre VARCHAR(255) NULL,
    almacen VARCHAR(255) NULL,
    numero_lote VARCHAR(255) NULL,
    localidad VARCHAR(255) NULL,
    salon VARCHAR(255) NULL,
    numero_serie VARCHAR(255) NULL,
    id_flog VARCHAR(255) NULL,
    nombre_flog VARCHAR(255) NULL,
    calidad_flog VARCHAR(255) NULL,
    pzas_rollo VARCHAR(255) NULL,
    kg_rollo VARCHAR(255) NULL,
    mts_rollo VARCHAR(255) NULL,
    no_tiras VARCHAR(255) NULL,
    medida_1 VARCHAR(255) NULL,
    medida_2 VARCHAR(255) NULL,
    pzas_t1 VARCHAR(255) NULL,
    pzas_t2 VARCHAR(255) NULL,
    pzas_t3 VARCHAR(255) NULL,
    pzas_t4 VARCHAR(255) NULL,
    turno_tejido VARCHAR(255) NULL,
    codigo_defecto VARCHAR(255) NULL,
    cantidad VARCHAR(255) NULL,
    defecto VARCHAR(255) NULL,
    maquina_id_detectada VARCHAR(255) NULL,
    archivo_origen VARCHAR(255) NULL,
    id_carga UUID NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW(),
    observaciones TEXT NULL
);

-- ============================================================================
-- 12. NEW CLEAN/FINAL TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.segundas_por_rollo (
    id_segunda_rollo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    anio INT NULL,
    mes INT NULL,
    semana INT NULL,
    produccion VARCHAR(100) NOT NULL,
    maquina_id VARCHAR(100) NOT NULL REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE RESTRICT,
    salon VARCHAR(100) NULL,
    turno_tejido VARCHAR(50) DEFAULT '' NOT NULL,
    codigo_articulo VARCHAR(100) NULL,
    nombre_articulo VARCHAR(255) NULL,
    configuracion VARCHAR(255) NULL,
    tamano VARCHAR(255) NULL,
    color VARCHAR(255) NULL,
    codigo_defecto VARCHAR(100) NOT NULL,
    defecto VARCHAR(255) NULL,
    cantidad_defecto NUMERIC(18,4) NULL,
    pzas_rollo NUMERIC(18,4) NULL,
    kg_rollo NUMERIC(18,4) NULL,
    mts_rollo NUMERIC(18,4) NULL,
    no_tiras NUMERIC(18,4) NULL,
    medida_1 NUMERIC(18,4) NULL,
    medida_2 NUMERIC(18,4) NULL,
    pzas_t1 NUMERIC(18,4) NULL,
    pzas_t2 NUMERIC(18,4) NULL,
    pzas_t3 NUMERIC(18,4) NULL,
    pzas_t4 NUMERIC(18,4) NULL,
    id_flog VARCHAR(100) NULL,
    calidad_flog VARCHAR(100) NULL,
    numero_serie VARCHAR(255) DEFAULT '' NOT NULL,
    tipo_falla_id_sugerido VARCHAR(100) NULL,
    categoria_falla_sugerida VARCHAR(100) NULL,
    id_componente_sugerido UUID NULL REFERENCES public.cat_componentes_maquina(id_componente) ON UPDATE CASCADE ON DELETE SET NULL,
    requiere_revision_autonoma BOOLEAN DEFAULT FALSE,
    nivel_riesgo VARCHAR(50) NULL,
    score_riesgo NUMERIC(18,4) NULL,
    origen VARCHAR(100) DEFAULT 'EXCEL_SEGUNDAS_X_ROLLO',
    id_carga UUID NULL REFERENCES public.control_cargas_archivos(id_carga) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_carga TIMESTAMPTZ DEFAULT NOW(),
    fecha_alta TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    observaciones TEXT NULL,
    CONSTRAINT uq_segundas_rollo UNIQUE (fecha, produccion, codigo_defecto, numero_serie, turno_tejido)
);

CREATE TABLE IF NOT EXISTS public.cat_relacion_defecto_falla (
    id_relacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_defecto VARCHAR(100) NULL,
    defecto_calidad VARCHAR(255) NOT NULL,
    tipo_falla_id VARCHAR(50) NULL REFERENCES public.cat_tipos_falla(tipo_falla_id) ON UPDATE CASCADE ON DELETE SET NULL,
    categoria_falla VARCHAR(100) NULL,
    componente_sugerido VARCHAR(150) NULL,
    actividad_autonoma_sugerida TEXT NULL,
    actividad_mantenimiento_sugerida TEXT NULL,
    prioridad_default VARCHAR(50) NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    observaciones TEXT NULL
);

CREATE TABLE IF NOT EXISTS public.calendarios_mantenimiento (
    id_calendario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_calendario VARCHAR(50) NOT NULL,
    anio INT NOT NULL,
    mes INT NULL,
    semana INT NULL,
    fecha_inicio_periodo DATE NOT NULL,
    fecha_fin_periodo DATE NOT NULL,
    estatus_calendario VARCHAR(50) DEFAULT 'PROPUESTO',
    generado_por VARCHAR(150) NULL,
    origen_generacion VARCHAR(100) NULL,
    fecha_generacion TIMESTAMPTZ DEFAULT NOW(),
    aprobado_por UUID NULL,
    fecha_aprobacion TIMESTAMPTZ NULL,
    observaciones TEXT NULL
);

CREATE TABLE IF NOT EXISTS public.calendario_mantenimiento_detalle (
    id_detalle UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_calendario UUID NOT NULL REFERENCES public.calendarios_mantenimiento(id_calendario) ON DELETE CASCADE,
    maquina_id VARCHAR(100) NOT NULL REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE RESTRICT,
    fecha_programada DATE NOT NULL,
    turno_sugerido VARCHAR(50) NULL,
    tipo_mantenimiento VARCHAR(50) NOT NULL,
    prioridad VARCHAR(50) NULL,
    actividad_sugerida TEXT NOT NULL,
    responsable_sugerido VARCHAR(150) NULL,
    fuente_principal VARCHAR(100) NULL,
    score_riesgo NUMERIC(18,4) NULL,
    id_plan UUID NULL REFERENCES public.planes_mantenimiento_preventivo(id_plan) ON DELETE SET NULL,
    id_analisis UUID REFERENCES public.analisis_repetibilidad_fallas(id_analisis) ON DELETE SET NULL,
    id_orden_referencia UUID NULL,
    requiere_ot BOOLEAN DEFAULT FALSE,
    id_orden_generada UUID NULL,
    estatus_detalle VARCHAR(50) DEFAULT 'PROPUESTO',
    fecha_alta TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    observaciones TEXT NULL
);

CREATE TABLE IF NOT EXISTS public.calendario_mantenimiento_fuentes (
    id_fuente UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_detalle UUID NOT NULL REFERENCES public.calendario_mantenimiento_detalle(id_detalle) ON DELETE CASCADE,
    tipo_fuente VARCHAR(50) NOT NULL,
    id_referencia VARCHAR(255) NULL,
    maquina_id VARCHAR(100) NULL REFERENCES public.cat_maquinas(equipo_towell) ON UPDATE CASCADE ON DELETE CASCADE,
    fecha_referencia DATE NULL,
    peso_riesgo NUMERIC(18,4) NULL,
    comentario TEXT NULL,
    fecha_alta TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 13. VALIDATION VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW public.vw_validacion_maquinas_excel AS
SELECT 
    id_stg,
    equipo_towell,
    clave,
    ax,
    archivo_origen,
    fecha_carga,
    id_carga,
    CASE 
        WHEN equipo_towell IS NULL OR equipo_towell = '' THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN equipo_towell IS NULL OR equipo_towell = '' THEN 'Falta EQUIPO TOWELL (código operativo principal).'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_maquinas_excel;

CREATE OR REPLACE VIEW public.vw_validacion_refacciones_excel AS
SELECT
    id_stg,
    codigo_articulo,
    nombre_articulo,
    unidad_medida,
    familia,
    activo,
    archivo_origen,
    fecha_carga,
    id_carga,
    CASE 
        WHEN codigo_articulo IS NULL OR codigo_articulo = '' THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN codigo_articulo IS NULL OR codigo_articulo = '' THEN 'Falta código de artículo.'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_refacciones_excel;

CREATE OR REPLACE VIEW public.vw_validacion_tecnicos_excel AS
SELECT
    id_stg,
    cve_tecnico,
    nombre_tecnico,
    departamento_codigo,
    turno_id,
    especialidad,
    puesto,
    correo,
    telefono,
    activo,
    archivo_origen,
    fecha_carga,
    id_carga,
    CASE 
        WHEN cve_tecnico IS NULL OR cve_tecnico = '' THEN FALSE
        WHEN nombre_tecnico IS NULL OR nombre_tecnico = '' THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN cve_tecnico IS NULL OR cve_tecnico = '' THEN 'Falta clave del técnico.'
        WHEN nombre_tecnico IS NULL OR nombre_tecnico = '' THEN 'Falta nombre del técnico.'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_tecnicos_excel;

CREATE OR REPLACE VIEW public.vw_validacion_empleados_excel AS
SELECT
    id_stg,
    cve_empleado,
    nombre_empleado,
    departamento_codigo,
    turno_id,
    puesto,
    correo,
    telefono,
    activo,
    archivo_origen,
    fecha_carga,
    id_carga,
    CASE 
        WHEN cve_empleado IS NULL OR cve_empleado = '' THEN FALSE
        WHEN nombre_empleado IS NULL OR nombre_empleado = '' THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN cve_empleado IS NULL OR cve_empleado = '' THEN 'Falta clave del empleado.'
        WHEN nombre_empleado IS NULL OR nombre_empleado = '' THEN 'Falta nombre del empleado.'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_empleados_excel;

CREATE OR REPLACE VIEW public.vw_validacion_fallas_por_maquina AS
SELECT
    id,
    maquina_id,
    descripcion,
    creada,
    archivo_origen,
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

CREATE OR REPLACE VIEW public.vw_validacion_telegram_ordenes AS
SELECT
    id as id_original,
    folio,
    estatus,
    fecha,
    hora,
    depto,
    maquina_id,
    tipo_falla_id,
    falla,
    hora_fin,
    cve_empl,
    nom_empl,
    turno,
    cve_atendio,
    nom_atendio,
    turno_atendio,
    obs,
    orden_trabajo,
    descripcion,
    enviado,
    obs_cierre,
    calidad,
    fecha_fin,
    fecha_carga,
    CASE 
        WHEN id IS NULL THEN FALSE
        WHEN maquina_id IS NULL OR maquina_id = '' THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN id IS NULL THEN 'Falta ID único original.'
        WHEN maquina_id IS NULL OR maquina_id = '' THEN 'Falta identificación de la máquina (maquina_id).'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_telegram_ordenes_telares;

CREATE OR REPLACE VIEW public.vw_validacion_refacciones_por_maquina AS
SELECT
    id_stg,
    fecha,
    maquina_id,
    destino,
    codigo_articulo,
    nombre_articulo,
    cantidad_estandar,
    precio_costo_unitario,
    importe_costo_origen,
    archivo_origen,
    fecha_carga,
    id_carga,
    CASE 
        WHEN codigo_articulo IS NULL OR codigo_articulo = '' THEN FALSE
        WHEN NOT EXISTS (SELECT 1 FROM public.cat_refacciones r WHERE r.codigo_articulo = codigo_articulo) THEN FALSE
        WHEN COALESCE(maquina_id, destino) IS NULL OR COALESCE(maquina_id, destino) = '' THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN codigo_articulo IS NULL OR codigo_articulo = '' THEN 'Falta código de artículo.'
        WHEN NOT EXISTS (SELECT 1 FROM public.cat_refacciones r WHERE r.codigo_articulo = codigo_articulo) THEN 'El artículo no existe en catálogo de refacciones.'
        WHEN COALESCE(maquina_id, destino) IS NULL OR COALESCE(maquina_id, destino) = '' THEN 'Falta identificar la máquina de destino.'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_refacciones_por_maquina_excel;

CREATE OR REPLACE VIEW public.vw_validacion_inventario_refacciones AS
SELECT
    id_stg,
    codigo_articulo,
    codigo_proveedor,
    stock_actual,
    stock_minimo,
    stock_maximo,
    unidad_medida,
    ubicacion,
    costo_unitario,
    moneda,
    observaciones,
    archivo_origen,
    fecha_carga,
    id_carga,
    CASE 
        WHEN codigo_articulo IS NULL OR codigo_articulo = '' THEN FALSE
        WHEN NOT EXISTS (SELECT 1 FROM public.cat_refacciones r WHERE r.codigo_articulo = codigo_articulo) THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN codigo_articulo IS NULL OR codigo_articulo = '' THEN 'Falta código de artículo.'
        WHEN NOT EXISTS (SELECT 1 FROM public.cat_refacciones r WHERE r.codigo_articulo = codigo_articulo) THEN 'El artículo no existe en catálogo de refacciones.'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_inventario_refacciones_excel;

CREATE OR REPLACE VIEW public.vw_validacion_costos_mano_obra AS
SELECT
    id_stg,
    cve_tecnico,
    nombre_tecnico,
    costo_hora,
    moneda,
    fecha_inicio_vigencia,
    fecha_fin_vigencia,
    observaciones,
    archivo_origen,
    fecha_carga,
    id_carga,
    CASE 
        WHEN cve_tecnico IS NULL OR cve_tecnico = '' THEN FALSE
        WHEN NOT EXISTS (SELECT 1 FROM public.cat_tecnicos t WHERE t.cve_tecnico = cve_tecnico) THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN cve_tecnico IS NULL OR cve_tecnico = '' THEN 'Falta clave de técnico.'
        WHEN NOT EXISTS (SELECT 1 FROM public.cat_tecnicos t WHERE t.cve_tecnico = cve_tecnico) THEN 'El técnico no existe en catálogo de mantenimiento.'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_costos_mano_obra_excel;

-- Safe validation helper functions
CREATE OR REPLACE FUNCTION public.safe_is_date(val TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF val IS NULL THEN RETURN FALSE; END IF;
  PERFORM val::DATE;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.safe_is_numeric(val TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF val IS NULL THEN RETURN FALSE; END IF;
  PERFORM val::NUMERIC;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE VIEW public.vw_validacion_segundas_por_rollo AS
SELECT 
    s.*,
    COALESCE(
        (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.maquina_id_detectada LIMIT 1),
        (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.produccion LIMIT 1),
        (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.nombre LIMIT 1),
        (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.numero_serie LIMIT 1),
        (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.id_flog LIMIT 1),
        (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.salon LIMIT 1)
    ) as maquina_id_resuelta,
    CASE 
        WHEN s.id_carga IS NULL THEN FALSE
        WHEN s.defecto IS NULL OR s.defecto = '' THEN FALSE
        WHEN NOT public.safe_is_date(s.fecha) THEN FALSE
        WHEN NOT public.safe_is_numeric(s.cantidad) THEN FALSE
        WHEN COALESCE(
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.maquina_id_detectada LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.produccion LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.nombre LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.numero_serie LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.id_flog LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.salon LIMIT 1)
        ) IS NULL THEN FALSE
        -- Evitar excepción de casteo si la fecha es inválida
        WHEN public.safe_is_date(s.fecha) AND EXISTS (
            SELECT 1 FROM public.segundas_por_rollo r 
            WHERE r.fecha = s.fecha::DATE 
              AND r.produccion = s.produccion 
              AND r.codigo_defecto = s.codigo_defecto 
              AND r.numero_serie = COALESCE(s.numero_serie, '') 
              AND r.turno_tejido = COALESCE(s.turno_tejido, '')
        ) THEN FALSE
        ELSE TRUE 
    END as es_valido,
    CASE 
        WHEN s.id_carga IS NULL THEN 'Falta ID de carga de control.'
        WHEN s.defecto IS NULL OR s.defecto = '' THEN 'Falta descripción del defecto.'
        WHEN NOT public.safe_is_date(s.fecha) THEN 'Fecha inválida o no convertible.'
        WHEN NOT public.safe_is_numeric(s.cantidad) THEN 'Cantidad de defecto no es un valor numérico válido.'
        WHEN COALESCE(
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.maquina_id_detectada LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.produccion LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.nombre LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.numero_serie LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.id_flog LIMIT 1),
            (SELECT m.equipo_towell FROM public.cat_maquinas m WHERE m.equipo_towell = s.salon LIMIT 1)
        ) IS NULL THEN 'No se pudo identificar un telar válido en las columnas de máquina.'
        WHEN public.safe_is_date(s.fecha) AND EXISTS (
            SELECT 1 FROM public.segundas_por_rollo r 
            WHERE r.fecha = s.fecha::DATE 
              AND r.produccion = s.produccion 
              AND r.codigo_defecto = s.codigo_defecto 
              AND r.numero_serie = COALESCE(s.numero_serie, '') 
              AND r.turno_tejido = COALESCE(s.turno_tejido, '')
        ) THEN 'El registro ya existe en el histórico de Segundas por Rollo (Duplicado).'
        ELSE 'Registro correcto'
    END as detalles_error
FROM public.stg_segundas_por_rollo_excel s;

-- ============================================================================
-- 14. QUALITY & MAINTENANCE ANALYTICAL VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW public.vw_ranking_semanal_segundas_telares AS
SELECT 
    maquina_id, 
    anio, 
    semana, 
    SUM(pzas_rollo) as total_piezas, 
    SUM(cantidad_defecto) as total_defectos,
    DENSE_RANK() OVER (PARTITION BY anio, semana ORDER BY SUM(cantidad_defecto) DESC) as ranking_defecto
FROM public.segundas_por_rollo
WHERE activo = TRUE
GROUP BY maquina_id, anio, semana;

CREATE OR REPLACE VIEW public.vw_defectos_por_telar AS
WITH ranked_defectos AS (
    SELECT 
        maquina_id, 
        defecto, 
        SUM(cantidad_defecto) as total_defecto,
        ROW_NUMBER() OVER (PARTITION BY maquina_id ORDER BY SUM(cantidad_defecto) DESC) as rn
    FROM public.segundas_por_rollo
    WHERE activo = TRUE
    GROUP BY maquina_id, defecto
)
SELECT 
    maquina_id, 
    defecto as defecto_principal, 
    total_defecto
FROM ranked_defectos 
WHERE rn = 1;

CREATE OR REPLACE VIEW public.vw_segundas_vs_fallas_maquina AS
SELECT 
    s.maquina_id,
    s.anio,
    s.semana,
    SUM(s.cantidad_defecto) as total_segundas,
    SUM(s.pzas_rollo) as total_piezas,
    (SELECT d.defecto_principal FROM public.vw_defectos_por_telar d WHERE d.maquina_id = s.maquina_id) as defecto_principal,
    COALESCE(COUNT(DISTINCT f.id_falla), 0) as total_fallas,
    COALESCE(
        (SELECT f2.categoria_falla FROM public.fallas_por_maquina f2 
         WHERE f2.maquina_id = s.maquina_id 
         GROUP BY f2.categoria_falla ORDER BY COUNT(*) DESC LIMIT 1), 
        'Sin clasificar'
    ) as falla_principal,
    CASE 
        WHEN SUM(s.cantidad_defecto) > 10 AND COUNT(DISTINCT f.id_falla) > 0 THEN 'Alta'
        WHEN SUM(s.cantidad_defecto) > 5 OR COUNT(DISTINCT f.id_falla) > 0 THEN 'Media'
        ELSE 'Baja'
    END as coincidencia_calidad_mantenimiento,
    CASE 
        WHEN SUM(s.cantidad_defecto) > 10 AND COUNT(DISTINCT f.id_falla) > 0 THEN 'Programar mantenimiento predictivo urgente y revisar guías.'
        WHEN SUM(s.cantidad_defecto) > 5 THEN 'Programar inspección autónoma semanal.'
        ELSE 'Monitorear comportamiento.'
    END as recomendacion
FROM public.segundas_por_rollo s
LEFT JOIN public.fallas_por_maquina f ON f.maquina_id = s.maquina_id AND EXTRACT(WEEK FROM f.fecha_hora_creada) = s.semana AND EXTRACT(YEAR FROM f.fecha_hora_creada) = s.anio
WHERE s.activo = TRUE
GROUP BY s.maquina_id, s.anio, s.semana;

CREATE OR REPLACE VIEW public.vw_segundas_vs_ordenes_telegram AS
SELECT 
    s.maquina_id,
    s.fecha as fecha_segundas,
    s.semana,
    s.defecto,
    s.turno_tejido,
    s.salon,
    o.folio as folio_ot,
    o.falla as falla_telegram,
    o.estatus as estatus_ot,
    o.fecha_inicio as fecha_ot,
    o.nombre_atendio as tecnico_atendio
FROM public.segundas_por_rollo s
LEFT JOIN public.ordenes_trabajo o ON o.maquina_id = s.maquina_id AND o.fecha_inicio = s.fecha
WHERE s.activo = TRUE;

CREATE OR REPLACE VIEW public.vw_segundas_vs_fallas_maquina_mensual AS
SELECT 
    s.maquina_id,
    s.anio,
    s.mes,
    SUM(s.cantidad_defecto) as total_segundas,
    SUM(s.pzas_rollo) as total_piezas,
    COALESCE(
        (SELECT d.defecto_principal FROM public.vw_defectos_por_telar d WHERE d.maquina_id = s.maquina_id LIMIT 1),
        'Sin clasificar'
    ) as defecto_principal,
    COALESCE(COUNT(DISTINCT f.id_falla), 0) as total_fallas,
    COALESCE(
        (SELECT f2.categoria_falla FROM public.fallas_por_maquina f2 
         WHERE f2.maquina_id = s.maquina_id 
         GROUP BY f2.categoria_falla ORDER BY COUNT(*) DESC LIMIT 1), 
        'Sin clasificar'
    ) as falla_principal,
    CASE 
        WHEN SUM(s.cantidad_defecto) > 10 AND COUNT(DISTINCT f.id_falla) > 0 THEN 'Alta'
        WHEN SUM(s.cantidad_defecto) > 5 OR COUNT(DISTINCT f.id_falla) > 0 THEN 'Media'
        ELSE 'Baja'
    END as coincidencia_calidad_mantenimiento,
    CASE 
        WHEN SUM(s.cantidad_defecto) > 10 AND COUNT(DISTINCT f.id_falla) > 0 THEN 'Programar mantenimiento predictivo urgente y revisar guías.'
        WHEN SUM(s.cantidad_defecto) > 5 THEN 'Programar inspección autónoma semanal.'
        ELSE 'Monitorear comportamiento.'
    END as recomendacion
FROM public.segundas_por_rollo s
LEFT JOIN public.fallas_por_maquina f ON f.maquina_id = s.maquina_id 
    AND EXTRACT(MONTH FROM f.fecha_hora_creada) = s.mes 
    AND EXTRACT(YEAR FROM f.fecha_hora_creada) = s.anio
WHERE s.activo = TRUE
GROUP BY s.maquina_id, s.anio, s.mes;

CREATE OR REPLACE VIEW public.vw_refacciones_sugeridas_por_calendario AS
SELECT 
    rm.maquina_id,
    'Predictivo/Autónomo' as tipo_mantenimiento,
    rm.codigo_articulo,
    rm.nombre_articulo,
    rm.cantidad_estandar,
    COALESCE(i.stock_actual, 0) as stock_actual,
    COALESCE(i.stock_minimo, 0) as stock_minimo,
    CASE 
        WHEN COALESCE(i.stock_actual, 0) <= 0 THEN 'Crítico'
        WHEN COALESCE(i.stock_actual, 0) < COALESCE(i.stock_minimo, 0) THEN 'Bajo'
        ELSE 'OK'
    END as riesgo_stock,
    COALESCE(i.costo_unitario, rm.precio_costo_unitario) as costo_estimado
FROM public.refacciones_por_maquina rm
LEFT JOIN public.inventario_refacciones i ON i.codigo_articulo = rm.codigo_articulo;

-- ============================================================================
-- 15. CALENDAR VIEWS
-- ============================================================================

-- vw_calendario_preventivo_anual
CREATE OR REPLACE VIEW public.vw_calendario_preventivo_anual AS
SELECT 
    EXTRACT(YEAR FROM p.proxima_ejecucion)::int as anio,
    EXTRACT(MONTH FROM p.proxima_ejecucion)::int as periodo,
    p.maquina_id,
    p.codigo_servicio,
    p.nombre_plan as actividad_sugerida,
    p.proxima_ejecucion as fecha_programada,
    p.responsable as cve_tecnico,
    'PREVENTIVO'::varchar as tipo_mantenimiento,
    'Media'::varchar as prioridad,
    0.00::numeric as score_riesgo,
    'Bajo'::varchar as nivel_riesgo_calidad
FROM public.planes_mantenimiento_preventivo p
WHERE p.activo = TRUE;

-- vw_calendario_predictivo_mensual
CREATE OR REPLACE VIEW public.vw_calendario_predictivo_mensual AS
SELECT 
    s.anio,
    s.mes as periodo,
    s.maquina_id,
    'PREDICTIVO'::varchar as tipo_mantenimiento,
    s.recomendacion as actividad_sugerida,
    (CURRENT_DATE + INTERVAL '1 month')::date as fecha_programada,
    NULL::varchar as cve_tecnico,
    CASE 
        WHEN s.coincidencia_calidad_mantenimiento = 'Alta' THEN 'Alta'::varchar
        WHEN s.coincidencia_calidad_mantenimiento = 'Media' THEN 'Media'::varchar
        ELSE 'Baja'::varchar
    END as prioridad,
    CASE 
        WHEN s.coincidencia_calidad_mantenimiento = 'Alta' THEN 90.00
        WHEN s.coincidencia_calidad_mantenimiento = 'Media' THEN 65.00
        ELSE 30.00
    END as score_riesgo,
    s.coincidencia_calidad_mantenimiento as nivel_riesgo_calidad
FROM public.vw_segundas_vs_fallas_maquina_mensual s;

-- vw_calendario_autonomo_semanal
CREATE OR REPLACE VIEW public.vw_calendario_autonomo_semanal AS
SELECT 
    s.anio,
    s.semana as periodo,
    s.maquina_id,
    'AUTONOMO'::varchar as tipo_mantenimiento,
    COALESCE(
        (SELECT r.actividad_autonoma_sugerida FROM public.cat_relacion_defecto_falla r WHERE r.defecto_calidad = s.defecto LIMIT 1),
        'Realizar inspección autónoma general'
    ) as actividad_sugerida,
    (CURRENT_DATE + INTERVAL '7 days')::date as fecha_programada,
    NULL::varchar as cve_tecnico,
    SUM(s.pzas_rollo) as total_piezas,
    SUM(s.cantidad_defecto) as total_segundas,
    CASE 
        WHEN SUM(s.cantidad_defecto) > 10 THEN 'Alta'::varchar
        WHEN SUM(s.cantidad_defecto) > 5 THEN 'Media'::varchar
        ELSE 'Baja'::varchar
    END as prioridad,
    (SUM(s.cantidad_defecto) * 5 + COALESCE((SELECT COUNT(*) FROM public.fallas_por_maquina f WHERE f.maquina_id = s.maquina_id AND EXTRACT(WEEK FROM f.fecha_hora_creada) = s.semana), 0) * 10) as score_riesgo,
    CASE 
        WHEN SUM(s.cantidad_defecto) > 10 THEN 'Alto'::varchar
        WHEN SUM(s.cantidad_defecto) > 5 THEN 'Medio'::varchar
        ELSE 'Baja'::varchar
    END as nivel_riesgo_calidad
FROM public.segundas_por_rollo s
WHERE s.activo = TRUE
GROUP BY s.anio, s.semana, s.maquina_id, s.turno_tejido, s.defecto;

-- vw_calendario_mantenimiento_general
CREATE OR REPLACE VIEW public.vw_calendario_mantenimiento_general AS
SELECT 
    id_detalle,
    id_calendario,
    maquina_id,
    fecha_programada,
    turno_sugerido,
    tipo_mantenimiento,
    prioridad,
    actividad_sugerida,
    responsable_sugerido,
    fuente_principal,
    score_riesgo,
    estatus_detalle,
    requiere_ot,
    id_orden_generada
FROM public.calendario_mantenimiento_detalle;

-- ============================================================================
-- 16. ROW LEVEL SECURITY (RLS Policies for Admins and Maintenance)
-- ============================================================================

-- Create helper function for role verification if not exists
CREATE OR REPLACE FUNCTION public.check_user_role(required_role VARCHAR)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.cat_usuarios_roles
    WHERE correo = auth.jwt()->>'email'
      AND rol = required_role
      AND activo = TRUE
  );
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on Clean Tables
ALTER TABLE public.segundas_por_rollo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_relacion_defecto_falla ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendarios_mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_mantenimiento_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_mantenimiento_fuentes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS super_admin_all ON public.segundas_por_rollo;
DROP POLICY IF EXISTS mantenimiento_select ON public.segundas_por_rollo;
DROP POLICY IF EXISTS super_admin_all ON public.cat_relacion_defecto_falla;
DROP POLICY IF EXISTS mantenimiento_select ON public.cat_relacion_defecto_falla;
DROP POLICY IF EXISTS super_admin_all ON public.calendarios_mantenimiento;
DROP POLICY IF EXISTS mantenimiento_select ON public.calendarios_mantenimiento;
DROP POLICY IF EXISTS super_admin_all ON public.calendario_mantenimiento_detalle;
DROP POLICY IF EXISTS mantenimiento_select ON public.calendario_mantenimiento_detalle;
DROP POLICY IF EXISTS super_admin_all ON public.calendario_mantenimiento_fuentes;
DROP POLICY IF EXISTS mantenimiento_select ON public.calendario_mantenimiento_fuentes;

-- Create Policies for Clean Tables
CREATE POLICY super_admin_all ON public.segundas_por_rollo FOR ALL TO authenticated USING (public.check_user_role('SUPER_ADMINISTRADOR')) WITH CHECK (public.check_user_role('SUPER_ADMINISTRADOR'));
CREATE POLICY mantenimiento_select ON public.segundas_por_rollo FOR SELECT TO authenticated USING (public.check_user_role('MANTENIMIENTO') OR public.check_user_role('SUPER_ADMINISTRADOR'));

CREATE POLICY super_admin_all ON public.cat_relacion_defecto_falla FOR ALL TO authenticated USING (public.check_user_role('SUPER_ADMINISTRADOR')) WITH CHECK (public.check_user_role('SUPER_ADMINISTRADOR'));
CREATE POLICY mantenimiento_select ON public.cat_relacion_defecto_falla FOR SELECT TO authenticated USING (public.check_user_role('MANTENIMIENTO') OR public.check_user_role('SUPER_ADMINISTRADOR'));

CREATE POLICY super_admin_all ON public.calendarios_mantenimiento FOR ALL TO authenticated USING (public.check_user_role('SUPER_ADMINISTRADOR')) WITH CHECK (public.check_user_role('SUPER_ADMINISTRADOR'));
CREATE POLICY mantenimiento_select ON public.calendarios_mantenimiento FOR SELECT TO authenticated USING (public.check_user_role('MANTENIMIENTO') OR public.check_user_role('SUPER_ADMINISTRADOR'));

CREATE POLICY super_admin_all ON public.calendario_mantenimiento_detalle FOR ALL TO authenticated USING (public.check_user_role('SUPER_ADMINISTRADOR')) WITH CHECK (public.check_user_role('SUPER_ADMINISTRADOR'));
CREATE POLICY mantenimiento_select ON public.calendario_mantenimiento_detalle FOR SELECT TO authenticated USING (public.check_user_role('MANTENIMIENTO') OR public.check_user_role('SUPER_ADMINISTRADOR'));

CREATE POLICY super_admin_all ON public.calendario_mantenimiento_fuentes FOR ALL TO authenticated USING (public.check_user_role('SUPER_ADMINISTRADOR')) WITH CHECK (public.check_user_role('SUPER_ADMINISTRADOR'));
CREATE POLICY mantenimiento_select ON public.calendario_mantenimiento_fuentes FOR SELECT TO authenticated USING (public.check_user_role('MANTENIMIENTO') OR public.check_user_role('SUPER_ADMINISTRADOR'));

-- Disable RLS on Staging Tables
ALTER TABLE public.stg_maquinas_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_refacciones_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_tecnicos_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_empleados_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_refacciones_por_maquina_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_historico_precios_refacciones_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_inventario_refacciones_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_costos_mano_obra_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_segundas_por_rollo_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_fallas_por_maquina_excel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_telegram_ordenes_telares DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS super_admin_staging ON public.stg_maquinas_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_refacciones_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_tecnicos_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_empleados_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_refacciones_por_maquina_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_historico_precios_refacciones_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_inventario_refacciones_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_costos_mano_obra_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_segundas_por_rollo_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_fallas_por_maquina_excel;
DROP POLICY IF EXISTS super_admin_staging ON public.stg_telegram_ordenes_telares;

-- 15. PERFORMANCE INDEXES FOR STAGING & INGESTION
CREATE INDEX IF NOT EXISTS idx_stg_segundas_id_carga ON public.stg_segundas_por_rollo_excel(id_carga);
CREATE INDEX IF NOT EXISTS idx_segundas_rollo_id_carga ON public.segundas_por_rollo(id_carga);

-- 16. SAFE CAST FUNCTIONS
CREATE OR REPLACE FUNCTION public.safe_cast_to_numeric(val TEXT)
RETURNS NUMERIC AS $$
BEGIN
  IF val IS NULL OR val = '' THEN RETURN 0; END IF;
  RETURN val::NUMERIC;
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.safe_cast_to_int(val TEXT)
RETURNS INT AS $$
BEGIN
  IF val IS NULL OR val = '' THEN RETURN 0; END IF;
  RETURN val::NUMERIC::INT;
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 17. SERVER-SIDE INGESTION COMMIT FUNCTION FOR SEGUNDAS
CREATE OR REPLACE FUNCTION public.commit_segundas_por_rollo(p_id_carga UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inserted INT := 0;
    v_errors INT := 0;
    v_total INT := 0;
BEGIN
    -- Configurar temporalmente el timeout de consulta a 10 minutos para esta ejecución
    PERFORM set_config('statement_timeout', '600000', true);

    -- Insertar registros válidos en la tabla productiva de forma instantánea usando un LEFT JOIN directo
    INSERT INTO public.segundas_por_rollo (
        fecha, anio, mes, semana, produccion, maquina_id, salon, turno_tejido,
        codigo_articulo, nombre_articulo, configuracion, tamano, color,
        codigo_defecto, defecto, cantidad_defecto, pzas_rollo, kg_rollo, mts_rollo,
        no_tiras, medida_1, medida_2, pzas_t1, pzas_t2, pzas_t3, pzas_t4,
        id_flog, calidad_flog, numero_serie, origen, id_carga, score_riesgo, nivel_riesgo
    )
    SELECT DISTINCT ON (s.fecha::DATE, s.produccion, s.codigo_defecto, COALESCE(s.numero_serie, ''), COALESCE(s.turno_tejido, ''))
        (s.fecha)::DATE,
        EXTRACT(YEAR FROM (s.fecha)::DATE)::INT,
        EXTRACT(MONTH FROM (s.fecha)::DATE)::INT,
        EXTRACT(WEEK FROM (s.fecha)::DATE)::INT,
        s.produccion,
        COALESCE(m.equipo_towell, s.produccion), -- resolved machine id
        s.salon,
        COALESCE(s.turno_tejido, ''),
        s.codigo_articulo,
        s.nombre_articulo,
        s.configuracion,
        s.tamano,
        s.color,
        s.codigo_defecto,
        s.defecto,
        COALESCE(NULLIF(s.cantidad, '')::NUMERIC, 0),
        COALESCE(NULLIF(s.pzas_rollo, '')::NUMERIC, 0),
        COALESCE(NULLIF(s.kg_rollo, '')::NUMERIC, 0),
        COALESCE(NULLIF(s.mts_rollo, '')::NUMERIC, 0),
        COALESCE(NULLIF(s.no_tiras, '')::NUMERIC, 0),
        COALESCE(NULLIF(s.medida_1, '')::NUMERIC, 0),
        COALESCE(NULLIF(s.medida_2, '')::NUMERIC, 0),
        COALESCE(NULLIF(s.pzas_t1, '')::NUMERIC, 0),
        COALESCE(NULLIF(s.pzas_t2, '')::NUMERIC, 0),
        COALESCE(NULLIF(s.pzas_t3, '')::NUMERIC, 0),
        COALESCE(NULLIF(s.pzas_t4, '')::NUMERIC, 0),
        s.id_flog,
        s.calidad_flog,
        COALESCE(s.numero_serie, ''),
        'EXCEL_SEGUNDAS_X_ROLLO',
        s.id_carga,
        COALESCE(NULLIF(s.cantidad, '')::NUMERIC, 0) * 10,
        'Bajo'
    FROM public.stg_segundas_por_rollo_excel s
    LEFT JOIN public.cat_maquinas m ON m.ax = s.localidad
    WHERE s.id_carga = p_id_carga 
      AND s.fecha IS NOT NULL
      AND s.defecto IS NOT NULL 
      AND s.defecto <> ''
    ORDER BY s.fecha::DATE, s.produccion, s.codigo_defecto, COALESCE(s.numero_serie, ''), COALESCE(s.turno_tejido, ''), s.id_stg DESC
    ON CONFLICT (fecha, produccion, codigo_defecto, numero_serie, turno_tejido) 
    DO UPDATE SET 
        cantidad_defecto = EXCLUDED.cantidad_defecto,
        pzas_rollo = EXCLUDED.pzas_rollo,
        kg_rollo = EXCLUDED.kg_rollo,
        mts_rollo = EXCLUDED.mts_rollo,
        no_tiras = EXCLUDED.no_tiras;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    -- Contar total
    SELECT COUNT(*) INTO v_total 
    FROM public.stg_segundas_por_rollo_excel 
    WHERE id_carga = p_id_carga;

    v_errors := v_total - v_inserted;

    -- Actualizar log de control
    UPDATE public.control_cargas_archivos
    SET 
        estatus_carga = 'Completada',
        registros_correctos = v_inserted,
        registros_error = v_errors,
        observaciones = 'Ingestión finalizada con éxito desde el servidor. ' || v_inserted || ' importados, ' || v_errors || ' omitidos.'
    WHERE id_carga = p_id_carga;

    RETURN jsonb_build_object('success', true, 'inserted', v_inserted, 'errors', v_errors);
END;
$$;
