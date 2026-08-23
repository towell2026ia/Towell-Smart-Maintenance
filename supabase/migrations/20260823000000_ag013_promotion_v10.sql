-- supabase/migrations/20260823000000_ag013_promotion_v10.sql
-- Production Promotion Migration for AG-013 Analista de Malos Actores v1.0
-- Master Freeze: AG013-1.0-FROZEN
-- Invariant: 0 new functional tables (NO_AG013_MIGRATION_REQUIRED). Governance catalogs only.

-- 1. Promover AG-013 en cat_agentes a READY y activo = true
UPDATE cat_agentes
SET 
  estado_implementacion = 'READY',
  activo = TRUE,
  version = '1.0',
  provider = 'mimo',
  default_model = 'mimo-v2.5',
  requires_ai = TRUE,
  authority_level = 1,
  fecha_actualizacion = NOW()
WHERE agent_id = 'AG-013';

-- Si no existiera la fila en cat_agentes, insertarla
INSERT INTO cat_agentes (
  agent_id, nombre, rama, tipo, activo, estado_implementacion, 
  requires_ai, provider, default_model, authority_level, version
)
SELECT 
  'AG-013', 'Analista de Malos Actores', 'RAMA E — CONFIABILIDAD Y CONOCIMIENTO', 'AGENTE',
  TRUE, 'READY', TRUE, 'mimo', 'mimo-v2.5', 1, '1.0'
WHERE NOT EXISTS (
  SELECT 1 FROM cat_agentes WHERE agent_id = 'AG-013'
);

-- 2. Asegurar el registro del evento canónico BAD_ACTOR_ANALYSIS_REQUESTED en cat_eventos_agente
INSERT INTO cat_eventos_agente (
  codigo_evento, agent_id, descripcion, es_conocido, activo
)
SELECT 
  'BAD_ACTOR_ANALYSIS_REQUESTED', 'AG-013', 'Solicitud de análisis determinístico e interpretación semántica de activos crónicos / malos actores', TRUE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM cat_eventos_agente WHERE codigo_evento = 'BAD_ACTOR_ANALYSIS_REQUESTED'
);
