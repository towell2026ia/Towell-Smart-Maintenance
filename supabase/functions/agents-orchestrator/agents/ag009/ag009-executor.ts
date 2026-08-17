// supabase/functions/agents-orchestrator/agents/ag009/ag009-executor.ts
// Main Entrypoint Executor for AG-009 Integration Family v1.0

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AG009ExecutionResult } from './types/ag009.types.ts';
import { processPreventiveScheduleItem, PreventiveConnectorOptions } from './ag009_1/core/preventive-connector.ts';
import { processAutonomousScheduleItem, AutonomousConnectorOptions } from './ag009_2/core/autonomous-connector.ts';

export type AG009CombinedOptions = PreventiveConnectorOptions & AutonomousConnectorOptions;

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

  // Fallback temporal para otros eventos de AG-009 (AG-009.3 en desarrollo)
  return {
    success: true,
    agent_id: 'AG-009',
    workflow_state: 'VALIDATED',
    correlation_id: correlationId,
    details: {
      message: `Evento ${normEvent} recibido por AG-009. Subconector AG-009.3 en proceso de desarrollo.`
    },
    duration_ms: 5
  };
}
