// supabase/functions/agents-orchestrator/core/router.ts
// Routing Engine for AG-001 Capataz Orquestador v1.0
// Uses cat_eventos_agente in Supabase DB as the SINGLE SOURCE OF TRUTH (Governance Driven).

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EventCatalogEntry } from '../types/agents.types.ts';

export interface RouteResult {
  is_valid_event: boolean;
  es_conocido: boolean;
  agent_id: string | null;
  required_fields: string[];
  activo: boolean;
  secuencia_destinos?: string[];
  nombre_evento?: string;
}

// Fallback in-memory catalog mirroring cat_eventos_agente seed for resilience during unit tests/offline
const STATIC_EVENT_CATALOG: Record<string, EventCatalogEntry> = {
  'PREVENTIVO_GENERAR': { event_code: 'PREVENTIVO_GENERAR', nombre_evento: 'Generación de órdenes preventivas anuales', agent_id_destino: 'AG-002', es_conocido: true, datos_requeridos: [] },
  'PREVENTIVO_PRESUPUESTO_CONSULTAR': { event_code: 'PREVENTIVO_PRESUPUESTO_CONSULTAR', nombre_evento: 'Consulta canónica de presupuesto preventivo de refacciones', agent_id_destino: 'AG-007', es_conocido: true, datos_requeridos: [] },
  'PREVENTIVE_BUDGET_REQUESTED': { event_code: 'PREVENTIVE_BUDGET_REQUESTED', nombre_evento: 'Consulta de pronóstico de presupuesto preventivo', agent_id_destino: 'AG-007', es_conocido: true, datos_requeridos: [] },
  'PREDICTIVO_GENERAR': { event_code: 'PREDICTIVO_GENERAR', nombre_evento: 'Generación de rutas predictivas', agent_id_destino: 'AG-003', es_conocido: true, datos_requeridos: ['maquina_id', 'mes'] },
  'AUTONOMO_GENERAR': { event_code: 'AUTONOMO_GENERAR', nombre_evento: 'Generación de checklists autónomos semanales', agent_id_destino: 'AG-004', es_conocido: true, datos_requeridos: ['maquina_id', 'semana'] },
  'EXCEL_BASE_CARGADA': { event_code: 'EXCEL_BASE_CARGADA', nombre_evento: 'Carga de datos crudos para auditoría', agent_id_destino: 'AG-005', es_conocido: true, datos_requeridos: ['file_path'] },
  'FORMULARIO_CARGADO': { event_code: 'FORMULARIO_CARGADO', nombre_evento: 'Importación de formatos para estructura dinámica', agent_id_destino: 'AG-006', es_conocido: true, datos_requeridos: ['form_name'] },
  'EXCEL_FORMULARIO_CARGADO': { event_code: 'EXCEL_FORMULARIO_CARGADO', nombre_evento: 'Carga de plantilla Excel de formulario', agent_id_destino: 'AG-006', es_conocido: true, datos_requeridos: ['form_name'] },
  'FORMULARIO_VALIDAR': { event_code: 'FORMULARIO_VALIDAR', nombre_evento: 'Validación de definición de formulario', agent_id_destino: 'AG-006', es_conocido: true, datos_requeridos: ['form_code'] },
  'DESVIACION_PRESUPUESTO': { event_code: 'DESVIACION_PRESUPUESTO', nombre_evento: 'Detección de gasto mayor al presupuesto', agent_id_destino: 'AG-007', es_conocido: true, datos_requeridos: ['maquina_id', 'monto_desviado'] },
  'FALLA_REINCIDENTE': { event_code: 'FALLA_REINCIDENTE', nombre_evento: 'Detección de reincidencias recurrentes', agent_id_destino: 'AG-008', es_conocido: true, datos_requeridos: ['maquina_id', 'falla_descripcion'] },
  'FALLA_REPORTADA': { event_code: 'FALLA_REPORTADA', nombre_evento: 'Correctivo directo proveniente de operador', agent_id_destino: 'AG-009.3', es_conocido: true, datos_requeridos: ['maquina_id', 'falla_descripcion'] },
  'SOLICITUD_CORRECTIVA': { event_code: 'SOLICITUD_CORRECTIVA', nombre_evento: 'Solicitud correctiva formal', agent_id_destino: 'AG-009.3', es_conocido: true, datos_requeridos: ['solicitud_id'] },
  'LEVANTAMIENTO_AUTONOMO_NO_CONFORME': { event_code: 'LEVANTAMIENTO_AUTONOMO_NO_CONFORME', nombre_evento: 'Levantamiento autónomo no conforme', agent_id_destino: 'AG-009.2', es_conocido: true, datos_requeridos: ['descripcion'], secuencia_destinos: ['AG-009.2', 'AG-009.3'] },
  'LEVANTAMIENTO_PREDICTIVO_NO_CONFORME': { event_code: 'LEVANTAMIENTO_PREDICTIVO_NO_CONFORME', nombre_evento: 'Levantamiento predictivo no conforme', agent_id_destino: 'AG-009.3', es_conocido: true, datos_requeridos: ['descripcion'] },
  'ANALISIS_CAUSA_RAIZ_SOLICITADO': { event_code: 'ANALISIS_CAUSA_RAIZ_SOLICITADO', nombre_evento: 'Solicitud de análisis causa raíz', agent_id_destino: 'AG-010', es_conocido: true, datos_requeridos: ['maquina_id', 'falla_id'] },
  'MEMORIA_TECNICA_REGISTRAR': { event_code: 'MEMORIA_TECNICA_REGISTRAR', nombre_evento: 'Registro de memoria técnica de reparación', agent_id_destino: 'AG-011', es_conocido: true, datos_requeridos: ['maquina_id', 'diagnostico'] },
  'EVALUACION_CICLO_VIDA': { event_code: 'EVALUACION_CICLO_VIDA', nombre_evento: 'Evaluación de reparar, renovar o reemplazar', agent_id_destino: 'AG-012', es_conocido: true, datos_requeridos: ['maquina_id'] },
  'ASSET_INTERVENTION_STRATEGY_REQUESTED': { event_code: 'ASSET_INTERVENTION_STRATEGY_REQUESTED', nombre_evento: 'Solicitud de evaluación de estrategia de intervención (reparar, renovar o reemplazar)', agent_id_destino: 'AG-012', es_conocido: true, datos_requeridos: ['asset_id'] },
  'PREVENTIVE_SCHEDULE_ITEM': { event_code: 'PREVENTIVE_SCHEDULE_ITEM', nombre_evento: 'Ítem de programación preventiva anual', agent_id_destino: 'AG-009.1', es_conocido: true, datos_requeridos: ['machine_id', 'service_code', 'scheduled_date'] },
  'AUTONOMOUS_SCHEDULE_ITEM': { event_code: 'AUTONOMOUS_SCHEDULE_ITEM', nombre_evento: 'Ítem de rutina autónoma semanal', agent_id_destino: 'AG-009.2', es_conocido: true, datos_requeridos: ['machine_id', 'week_reference', 'scheduled_date'] },
  'AUTONOMO_EJECUTAR': { event_code: 'AUTONOMO_EJECUTAR', nombre_evento: 'Ejecución de rutina de mantenimiento autónomo', agent_id_destino: 'AG-009.2', es_conocido: true, datos_requeridos: ['machine_id', 'week_reference', 'responses'] },
  'FAILURE_ANALYSIS_REQUESTED': { event_code: 'FAILURE_ANALYSIS_REQUESTED', nombre_evento: 'Solicitud de análisis de fallas desde UI', agent_id_destino: 'AG-008', es_conocido: true, datos_requeridos: [] },
  'AI_RECOMMENDATIONS_REQUESTED': { event_code: 'AI_RECOMMENDATIONS_REQUESTED', nombre_evento: 'Solicitud de recomendaciones contextuales IA desde UI', agent_id_destino: 'AG-001', es_conocido: true, datos_requeridos: [] },
  'SYSTEM_ALERTS_REQUESTED': { event_code: 'SYSTEM_ALERTS_REQUESTED', nombre_evento: 'Consulta de alertas activas del sistema desde UI', agent_id_destino: 'AG-007', es_conocido: true, datos_requeridos: [] },
  'TEXTO_AMBIGUO': { event_code: 'TEXTO_AMBIGUO', nombre_evento: 'Texto libre que requiere interpretación del Capataz (IA)', agent_id_destino: 'AG-001', es_conocido: false, datos_requeridos: ['texto'] }
};

/**
 * Resolves the destination agent route by querying cat_eventos_agente in DB (single source of truth).
 * Strict Guard: Unknown event codes return is_valid_event = false and NEVER trigger LLM classification.
 */
export async function resolveAgentRoute(
  supabase: SupabaseClient | null,
  eventCode: string
): Promise<RouteResult> {
  const cleanCode = (eventCode || "").toUpperCase().trim();
  if (!cleanCode) {
    return { is_valid_event: false, es_conocido: false, agent_id: null, required_fields: [], activo: false };
  }

  let eventEntry: EventCatalogEntry | null = null;

  // 1. Try querying DB (Governance Table) as primary source of truth
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('cat_eventos_agente')
        .select('event_code, nombre_evento, agent_id_destino, es_conocido, datos_requeridos, secuencia_destinos')
        .eq('event_code', cleanCode)
        .maybeSingle();

      if (!error && data) {
        const requiredFields = Array.isArray(data.datos_requeridos)
          ? data.datos_requeridos
          : JSON.parse(data.datos_requeridos || '[]');

        eventEntry = {
          event_code: data.event_code,
          nombre_evento: data.nombre_evento,
          agent_id_destino: data.agent_id_destino,
          es_conocido: data.es_conocido,
          datos_requeridos: requiredFields,
          secuencia_destinos: data.secuencia_destinos || undefined
        };
      }
    } catch (dbErr) {
      console.warn('[Router] DB query exception, using static catalog fallback:', dbErr);
    }
  }

  // Fallback to static catalog if DB was offline or unavailable
  if (!eventEntry && STATIC_EVENT_CATALOG[cleanCode]) {
    eventEntry = STATIC_EVENT_CATALOG[cleanCode];
  }

  // 2. Strict Rule (Adjustment 3): If eventCode is NOT cataloged, it is INVALID_EVENT.
  // NEVER send unknown eventCode to Nano for guessing!
  if (!eventEntry) {
    console.warn(`[Router] Unknown eventCode "${cleanCode}" rejected as INVALID_EVENT.`);
    return {
      is_valid_event: false,
      es_conocido: false,
      agent_id: null,
      required_fields: [],
      activo: false
    };
  }

  // 3. Query cat_agentes for target agent status
  let isAgentActive = true;
  if (supabase && eventEntry.agent_id_destino) {
    try {
      const { data: agentData } = await supabase
        .from('cat_agentes')
        .select('activo')
        .eq('agent_id', eventEntry.agent_id_destino)
        .maybeSingle();

      if (agentData) {
        isAgentActive = agentData.activo;
      }
    } catch (err) {
      console.warn('[Router] Error checking agent active status in DB:', err);
    }
  }

  return {
    is_valid_event: true,
    es_conocido: eventEntry.es_conocido,
    agent_id: eventEntry.agent_id_destino,
    required_fields: eventEntry.datos_requeridos,
    activo: isAgentActive,
    secuencia_destinos: eventEntry.secuencia_destinos,
    nombre_evento: eventEntry.nombre_evento
  };
}
