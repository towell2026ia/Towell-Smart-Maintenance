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
    area VARCHAR(50),
    proceso VARCHAR(50),
    tipo_equipo VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
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

-- ============================================================================
-- 6. SUBTASKS SYSTEM (INTERACTION MODULE)
-- ============================================================================

-- Subtasks Table
CREATE TABLE IF NOT EXISTS public.subtareas_orden_trabajo (
    id_subtarea UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden_trabajo UUID NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON UPDATE CASCADE ON DELETE RESTRICT,
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
        UNIQUE (id_orden_trabajo, numero_subtarea)
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
    id_orden_trabajo UUID REFERENCES public.ordenes_trabajo(id_orden) ON DELETE CASCADE,
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
    id_orden_trabajo UUID NOT NULL REFERENCES public.ordenes_trabajo(id_orden) ON UPDATE CASCADE ON DELETE RESTRICT,
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
CREATE INDEX IF NOT EXISTS idx_subtasks_id_orden ON public.subtareas_orden_trabajo(id_orden_trabajo);
CREATE INDEX IF NOT EXISTS idx_subtasks_folio ON public.subtareas_orden_trabajo(folio_ot);
CREATE INDEX IF NOT EXISTS idx_subtasks_estatus ON public.subtareas_orden_trabajo(estatus_subtarea);
CREATE INDEX IF NOT EXISTS idx_subtasks_area ON public.subtareas_orden_trabajo(area_requerida);
CREATE INDEX IF NOT EXISTS idx_subtasks_responsable ON public.subtareas_orden_trabajo(responsable_asignado);
CREATE INDEX IF NOT EXISTS idx_subtasks_fecha_deseada ON public.subtareas_orden_trabajo(fecha_deseada);
CREATE INDEX IF NOT EXISTS idx_subtasks_prioridad ON public.subtareas_orden_trabajo(prioridad);

-- Evidences Indexes
CREATE INDEX IF NOT EXISTS idx_subtask_evidences_id_subtarea ON public.evidencias_subtareas(id_subtarea);
CREATE INDEX IF NOT EXISTS idx_subtask_evidences_id_orden ON public.evidencias_subtareas(id_orden_trabajo);
CREATE INDEX IF NOT EXISTS idx_subtask_evidences_tipo ON public.evidencias_subtareas(tipo_archivo);
CREATE INDEX IF NOT EXISTS idx_subtask_evidences_origen ON public.evidencias_subtareas(origen_evidencia);
CREATE INDEX IF NOT EXISTS idx_subtask_evidences_subido_por ON public.evidencias_subtareas(subido_por);

-- Staging & Parts Indexes
CREATE INDEX IF NOT EXISTS idx_ref_maquina ON public.refacciones_por_maquina(maquina_id);
CREATE INDEX IF NOT EXISTS idx_ref_codigo ON public.refacciones_por_maquina(codigo_articulo);

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
