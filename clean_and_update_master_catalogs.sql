-- ============================================================================
-- SCRIPT DE LIMPIEZA Y ACTUALIZACIÓN DE CATÁLOGOS MAESTROS (TSM-AI)
-- ============================================================================

-- 1. DEPARTAMENTOS BASE
INSERT INTO public.cat_departamentos (codigo_departamento, nombre_departamento, descripcion, activo)
VALUES 
    ('PF', 'PF Producción (Tejido / Telares)', 'Área principal de tejeduría y producción de telares', TRUE),
    ('CF', 'CF Confección (Costura)', 'Área de confección, costura y acabado de prendas/toallas', TRUE),
    ('TF', 'TF Tintorería (Acabados)', 'Área de teñido, ramas, secadoras y procesos químicos', TRUE),
    ('AF', 'AF Servicios Auxiliares (Planta General)', 'Calderas, compresores, subestaciones eléctricas, chiller y planta general', TRUE)
ON CONFLICT (codigo_departamento) 
DO UPDATE SET 
    nombre_departamento = EXCLUDED.nombre_departamento,
    descripcion = EXCLUDED.descripcion,
    activo = TRUE,
    fecha_actualizacion = NOW();

-- 2. TURNOS BASE
INSERT INTO public.cat_turnos (id_turno, nombre_turno, descripcion, hora_inicio, hora_fin, activo)
VALUES
    (1, 'Turno 1 (Matutino)', 'Horario matutino de producción', '06:00:00', '14:00:00', TRUE),
    (2, 'Turno 2 (Vespertino)', 'Horario vespertino de producción', '14:00:00', '22:00:00', TRUE),
    (3, 'Turno 3 (Nocturno)', 'Horario nocturno de producción', '22:00:00', '06:00:00', TRUE),
    (4, 'Mixto / Administrativo', 'Horario administrativo / soporte general', '08:00:00', '17:00:00', TRUE)
ON CONFLICT (id_turno)
DO UPDATE SET 
    nombre_turno = EXCLUDED.nombre_turno,
    descripcion = EXCLUDED.descripcion,
    activo = TRUE,
    fecha_actualizacion = NOW();

-- 3. ASEGURAR COLUMNAS EN CAT_USUARIOS_ROLES Y PERMISOS POR ROL
ALTER TABLE public.cat_usuarios_roles 
    ADD COLUMN IF NOT EXISTS id_supervisor UUID NULL REFERENCES public.cat_usuarios_roles(id_usuario) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS departamento_codigo VARCHAR(10) NULL REFERENCES public.cat_departamentos(codigo_departamento) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS especialidad VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS turno_id INT NULL REFERENCES public.cat_turnos(id_turno) ON DELETE SET NULL;

-- Corregir permisos estrictos: MANTENIMIENTO NO puede crear solicitudes
UPDATE public.cat_usuarios_roles
SET 
    puede_crear_solicitud = FALSE,
    puede_atender_orden = TRUE,
    puede_cerrar_orden = TRUE,
    puede_ver_ordenes_asignadas = TRUE
WHERE rol = 'MANTENIMIENTO';

-- Configurar permisos para SOLICITANTE
UPDATE public.cat_usuarios_roles
SET 
    puede_crear_solicitud = TRUE,
    puede_validar_cierre = TRUE,
    puede_ver_todas_ordenes = FALSE,
    puede_atender_orden = FALSE,
    puede_cerrar_orden = FALSE,
    puede_editar_catalogos = FALSE,
    puede_configurar_sistema = FALSE
WHERE rol IN ('SOLICITANTE', 'SOLICITANTE_PUBLICO');

-- Configurar permisos para SUPERVISOR
UPDATE public.cat_usuarios_roles
SET 
    puede_crear_solicitud = TRUE,
    puede_ver_todas_ordenes = TRUE,
    puede_validar_cierre = TRUE,
    puede_ver_dashboards = TRUE,
    puede_atender_orden = FALSE,
    puede_cerrar_orden = FALSE
WHERE rol = 'SUPERVISOR';

-- Configurar permisos para SUPER_ADMINISTRADOR
UPDATE public.cat_usuarios_roles
SET 
    puede_crear_solicitud = TRUE,
    puede_ver_ordenes_asignadas = TRUE,
    puede_ver_todas_ordenes = TRUE,
    puede_atender_orden = TRUE,
    puede_cerrar_orden = TRUE,
    puede_validar_cierre = TRUE,
    puede_editar_catalogos = TRUE,
    puede_ver_dashboards = TRUE,
    puede_configurar_sistema = TRUE,
    recibe_alertas = TRUE
WHERE rol = 'SUPER_ADMINISTRADOR';

-- 4. ASEGURAR ESTRUCTURA Y ASOCIACIÓN DE CAT_MÁQUINAS
ALTER TABLE public.cat_maquinas
    ADD COLUMN IF NOT EXISTS departamento_codigo VARCHAR(10) NULL REFERENCES public.cat_departamentos(codigo_departamento) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS tipo_equipo VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

-- Clasificación por código/nombre de equipo
UPDATE public.cat_maquinas
SET departamento_codigo = 'PF', tipo_equipo = 'Telar'
WHERE (equipo_towell LIKE '%TEL%' OR equipo_towell LIKE '%TEJI%' OR clave LIKE '%TEL%') 
  AND (departamento_codigo IS NULL OR departamento_codigo = '');

UPDATE public.cat_maquinas
SET departamento_codigo = 'CF', tipo_equipo = 'Confección'
WHERE (equipo_towell LIKE '%COST%' OR equipo_towell LIKE '%CONF%' OR clave LIKE '%COST%')
  AND (departamento_codigo IS NULL OR departamento_codigo = '');

UPDATE public.cat_maquinas
SET departamento_codigo = 'TF', tipo_equipo = 'Tintorería'
WHERE (equipo_towell LIKE '%TINTO%' OR equipo_towell LIKE '%RAMA%' OR equipo_towell LIKE '%BARCA%' OR clave LIKE '%TINTO%')
  AND (departamento_codigo IS NULL OR departamento_codigo = '');

UPDATE public.cat_maquinas
SET departamento_codigo = 'AF', tipo_equipo = 'Servicios Auxiliares'
WHERE (equipo_towell LIKE '%CALDERA%' OR equipo_towell LIKE '%COMPRESOR%' OR equipo_towell LIKE '%SUBESTACION%' OR equipo_towell LIKE '%CHILLER%' OR equipo_towell LIKE '%AGUA%' OR clave LIKE '%AUX%')
  AND (departamento_codigo IS NULL OR departamento_codigo = '');

-- Asignar departamento por defecto 'AF' si aún está nulo
UPDATE public.cat_maquinas
SET departamento_codigo = 'AF', tipo_equipo = 'General'
WHERE departamento_codigo IS NULL;

-- 5. MATRIZ DE CRITICIDAD DE MÁQUINAS (CAT_CRITICIDAD_MAQUINA)
-- Upsert criticidad Crítica (Nivel A) para Calderas, Compresores, Subestaciones y Telares Principales
INSERT INTO public.cat_criticidad_maquina (maquina_id, nivel_criticidad, descripcion_criticidad, impacto_produccion, impacto_calidad, impacto_seguridad, activo)
SELECT equipo_towell, 'A', 'Equipo de alta criticidad (Paro Total de Planta o Línea)', 'Alto', 'Alto', 'Alto', TRUE
FROM public.cat_maquinas
WHERE tipo_equipo IN ('Servicios Auxiliares', 'Telar') OR equipo_towell LIKE '%CALDERA%' OR equipo_towell LIKE '%COMPRESOR%' OR equipo_towell LIKE '%SUBESTACION%'
ON CONFLICT DO NOTHING;

-- Upsert criticidad Media (Nivel B) para resto de máquinas
INSERT INTO public.cat_criticidad_maquina (maquina_id, nivel_criticidad, descripcion_criticidad, impacto_produccion, impacto_calidad, impacto_seguridad, activo)
SELECT equipo_towell, 'B', 'Equipo de criticidad media (Paro Parcial)', 'Medio', 'Medio', 'Bajo', TRUE
FROM public.cat_maquinas
WHERE equipo_towell NOT IN (SELECT maquina_id FROM public.cat_criticidad_maquina WHERE maquina_id IS NOT NULL)
ON CONFLICT DO NOTHING;

-- 6. SINCRONIZACIÓN Y LIMPIEZA DE TÉCNICOS EN CAT_TECNICOS
INSERT INTO public.cat_tecnicos (cve_tecnico, nombre_tecnico, departamento_codigo, especialidad, correo, telefono, activo)
SELECT 
    COALESCE(cve_tecnico, cve_empleado, id_usuario::text),
    nombre_completo,
    COALESCE(departamento_codigo, 'AF'),
    COALESCE(observaciones, especialidad, 'General'),
    correo,
    telefono,
    activo
FROM public.cat_usuarios_roles
WHERE rol = 'MANTENIMIENTO'
ON CONFLICT (cve_tecnico) 
DO UPDATE SET
    nombre_tecnico = EXCLUDED.nombre_tecnico,
    departamento_codigo = EXCLUDED.departamento_codigo,
    especialidad = EXCLUDED.especialidad,
    correo = EXCLUDED.correo,
    activo = EXCLUDED.activo,
    fecha_actualizacion = NOW();
