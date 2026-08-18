// supabase/functions/agents-orchestrator/agents/ag009/ag009-executor.ts
// Main Entrypoint Executor for AG-009 Integration Family v1.0 (Preventivo, Autónomo, Correctivo)

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AG009ExecutionResult } from './types/ag009.types.ts';
import { processPreventiveScheduleItem, PreventiveConnectorOptions } from './ag009_1/core/preventive-connector.ts';
import { processAutonomousScheduleItem, AutonomousConnectorOptions } from './ag009_2/core/autonomous-connector.ts';
import { processCorrectiveRequest, processSubtaskRequest, CorrectiveConnectorOptions } from './ag009_3/core/corrective-connector.ts';

export type AG009CombinedOptions = PreventiveConnectorOptions & AutonomousConnectorOptions & CorrectiveConnectorOptions;

export async function executeAG009(
  supabase: SupabaseClient | null,
  eventCode: string,
  payload: Record<string, any>,
  correlationId: string,
  options: AG009CombinedOptions = {}
): Promise<AG009ExecutionResult> {
  const normEvent = String(eventCode || '').trim().toUpperCase();

  // 1. Enrutar eventos preventivos hacia AG-009.1 (Conector Preventivo)
  if (normEvent === 'PREVENTIVE_SCHEDULE_ITEM' || normEvent === 'PREVENTIVO_GENERAR') {
    return await processPreventiveScheduleItem(
      supabase,
      payload,
      correlationId,
      payload.event_id || payload.id_evento,
      options
    );
  }

  // 2. Enrutar eventos autónomos hacia AG-009.2 (Conector Autónomo)
  if (normEvent === 'AUTONOMOUS_SCHEDULE_ITEM' || normEvent === 'AUTONOMO_EJECUTAR' || normEvent === 'AUTONOMOUS_SURVEY') {
    return await processAutonomousScheduleItem(
      supabase,
      payload,
      correlationId,
      payload.event_id || payload.id_evento,
      options
    );
  }

  // 3. Enrutar eventos de subtareas hacia AG-009.3
  if (normEvent === 'SUBTASK_REQUEST' || normEvent === 'SUBTAREA_CREAR' || normEvent === 'SUBTASK_REQUEST_VALIDATE') {
    return await processSubtaskRequest(
      supabase,
      payload,
      correlationId,
      payload.event_id || payload.id_evento,
      options
    );
  }

  // 4. Enrutar eventos correctivos hacia AG-009.3 (Conector Correctivo)
  const isCorrectiveEvent = [
    'CORRECTIVE_REQUEST',
    'SOLICITUD_CORRECTIVA',
    'FALLA_REPORTADA',
    'PORTAL_REQUEST',
    'TELEGRAM_EVENT',
    'AUTONOMOUS_FINDING',
    'PREDICTIVE_FINDING',
    'ALERTA_CORRECTIVA',
    'LEVANTAMIENTO_NO_CONFORME',
    'CORRECTIVE_OT_CREATE',
    'CORRECTIVE_REQUEST_VALIDATE'
  ].includes(normEvent);

  if (isCorrectiveEvent || payload.contract_id === 'CORRECTIVE-REQUEST-001' || payload.contract_id === 'PREDICTIVE-FINDING-001') {
    return await processCorrectiveRequest(
      supabase,
      payload,
      correlationId,
      payload.event_id || payload.id_evento,
      options
    );
  }

  // Fallback para eventos no reconocidos
  return {
    success: false,
    agent_id: 'AG-009',
    workflow_state: 'BLOCKED',
    correlation_id: correlationId,
    error_code: 'INVALID_EVENT',
    error_message: `Evento "${normEvent}" no reconocido por la familia de conectores AG-009.`,
    duration_ms: 5
  };
}
