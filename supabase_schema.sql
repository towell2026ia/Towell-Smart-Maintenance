-- SQL Schema for TSM-AI (Towell Smart Maintenance AI)
-- Paste this script into your Supabase SQL Editor (https://supabase.com/dashboard/project/xqfpsavkefhrxfbtqzec/sql) and click RUN.

-- Enable pgcrypto extension for UUID generation if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. CATALOGS (Tables loaded or synced first)
-- ==========================================

-- User Roles and Permissions Catalog
CREATE TABLE IF NOT EXISTS cat_usuarios_roles (
    id_usuario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_completo VARCHAR(150) NOT NULL,
    correo VARCHAR(150) UNIQUE,
    telefono VARCHAR(30),
    rol VARCHAR(50) NOT NULL, -- e.g. 'SUPER_ADMINISTRADOR', 'MANTENIMIENTO', 'SOLICITANTE_PUBLICO'
    cve_empleado VARCHAR(30) UNIQUE,
    cve_tecnico VARCHAR(30) UNIQUE,
    departamento VARCHAR(50),
    turno INT, -- 1, 2, 3
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
    fecha_alta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP WITH TIME ZONE,
    observaciones VARCHAR(255)
);

-- Machine Catalog
CREATE TABLE IF NOT EXISTS cat_maquinas (
    id_maquina UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_towell VARCHAR(100) NOT NULL UNIQUE, -- Alphanumeric ID (e.g. TOW-TEL201-TEJI)
    clave VARCHAR(50),
    area VARCHAR(50),
    proceso VARCHAR(50),
    tipo_equipo VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    origen VARCHAR(30),
    fecha_carga TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spare Parts Catalog
CREATE TABLE IF NOT EXISTS cat_refacciones (
    codigo_articulo VARCHAR(50) PRIMARY KEY, -- e.g., 'R-05'
    nombre_articulo VARCHAR(150) NOT NULL,
    unidad_medida VARCHAR(30),
    familia VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    fecha_carga TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- 2. TRANSACTIONS & CORE DATA
-- ==========================================

-- Work Orders (OT)
CREATE TABLE IF NOT EXISTS ordenes_trabajo (
    id_orden UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_original INT, -- For Telegram or external IDs
    folio VARCHAR(30) UNIQUE NOT NULL, -- e.g. 'PF04654'
    orden_trabajo VARCHAR(50),
    origen VARCHAR(30), -- 'App', 'Telegram', 'Excel'
    estatus VARCHAR(30) DEFAULT 'Solicitud recibida',
    fecha_inicio DATE,
    hora_inicio TIME,
    fecha_hora_inicio TIMESTAMP WITH TIME ZONE,
    departamento VARCHAR(15),
    maquina_id VARCHAR(50) REFERENCES cat_maquinas(equipo_towell),
    tipo_falla_id VARCHAR(50),
    falla VARCHAR(100),
    descripcion VARCHAR(255),
    observacion_inicial VARCHAR(255),
    cve_solicitante VARCHAR(30),
    nombre_solicitante VARCHAR(150),
    turno_solicitante INT,
    cve_atendio VARCHAR(30) REFERENCES cat_usuarios_roles(cve_tecnico),
    nombre_atendio VARCHAR(150),
    turno_atendio INT,
    fecha_fin DATE,
    hora_fin TIME,
    fecha_hora_fin TIMESTAMP WITH TIME ZONE,
    tiempo_atencion_min INT,
    observacion_cierre VARCHAR(255),
    calidad INT,
    enviado BOOLEAN DEFAULT FALSE,
    es_reincidente BOOLEAN DEFAULT FALSE,
    prioridad VARCHAR(20),
    fecha_carga TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spare Parts Consumption per Machine
CREATE TABLE IF NOT EXISTS refacciones_por_maquina (
    id_refaccion_maquina UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    maquina_id VARCHAR(50) REFERENCES cat_maquinas(equipo_towell),
    destino VARCHAR(100),
    codigo_articulo VARCHAR(50) REFERENCES cat_refacciones(codigo_articulo),
    nombre_articulo VARCHAR(150),
    cantidad_estandar NUMERIC(18,4) DEFAULT 1.0000,
    precio_costo_unitario NUMERIC(18,4) NOT NULL,
    importe_costo_calculado NUMERIC(18,4),
    importe_costo_origen NUMERIC(18,4),
    diferencia_importe NUMERIC(18,4),
    origen VARCHAR(30),
    fecha_carga TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Historical Price Log
CREATE TABLE IF NOT EXISTS historico_precios_refacciones (
    id_precio UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_articulo VARCHAR(50) REFERENCES cat_refacciones(codigo_articulo),
    fecha DATE NOT NULL,
    precio_costo_unitario NUMERIC(18,4) NOT NULL,
    moneda VARCHAR(10) DEFAULT 'MXN',
    origen VARCHAR(30),
    fecha_carga TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- File Upload Auditor
CREATE TABLE IF NOT EXISTS control_cargas_archivos (
    id_carga UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_archivo VARCHAR(150) NOT NULL,
    tipo_archivo VARCHAR(50),
    fuente VARCHAR(100),
    fecha_carga TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario_carga VARCHAR(150),
    registros_leidos INT DEFAULT 0,
    registros_correctos INT DEFAULT 0,
    registros_error INT DEFAULT 0,
    estatus_carga VARCHAR(30) DEFAULT 'Pendiente',
    observaciones VARCHAR(255)
);

-- Normalised Machine Fault Log
CREATE TABLE IF NOT EXISTS fallas_por_maquina (
    id_falla UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id VARCHAR(50) REFERENCES cat_maquinas(equipo_towell),
    descripcion_falla VARCHAR(255) NOT NULL,
    fecha_hora_creada TIMESTAMP WITH TIME ZONE,
    fecha_creada DATE,
    hora_creada TIME,
    origen VARCHAR(30),
    archivo_origen VARCHAR(150),
    categoria_falla VARCHAR(100),
    es_recurrente BOOLEAN DEFAULT FALSE,
    fecha_carga TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- 3. STAGING TABLES (Excel / Telegram raw imports)
-- ==========================================

-- Telegram Orders Staging
CREATE TABLE IF NOT EXISTS stg_telegram_ordenes_telares (
    id INT PRIMARY KEY,
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
    enviado BOOLEAN DEFAULT FALSE,
    obs_cierre VARCHAR(255),
    calidad INT,
    fecha_fin DATE,
    fecha_carga TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Excel Faults Staging
CREATE TABLE IF NOT EXISTS stg_fallas_por_maquina_excel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id VARCHAR(50),
    descripcion VARCHAR(255),
    creada TIMESTAMP WITH TIME ZONE,
    archivo_origen VARCHAR(150),
    fecha_carga TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- 4. SECURITY & RLS DISABLE (For easy public client connection)
-- ==========================================

ALTER TABLE cat_usuarios_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE cat_maquinas DISABLE ROW LEVEL SECURITY;
ALTER TABLE cat_refacciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_trabajo DISABLE ROW LEVEL SECURITY;
ALTER TABLE refacciones_por_maquina DISABLE ROW LEVEL SECURITY;
ALTER TABLE historico_precios_refacciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE control_cargas_archivos DISABLE ROW LEVEL SECURITY;
ALTER TABLE fallas_por_maquina DISABLE ROW LEVEL SECURITY;
ALTER TABLE stg_telegram_ordenes_telares DISABLE ROW LEVEL SECURITY;
ALTER TABLE stg_fallas_por_maquina_excel DISABLE ROW LEVEL SECURITY;
