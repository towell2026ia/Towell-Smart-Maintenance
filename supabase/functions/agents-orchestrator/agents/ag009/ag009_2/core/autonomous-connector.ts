// supabase/functions/agents-orchestrator/agents/ag009/ag009_2/core/autonomous-connector.ts
// Central Deterministic Pipeline for AG-009.2 Conector Autónomo v1.0

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AG009ExecutionResult } from '../../types/ag009.types.ts';
import { validateAutonomousScheduleContract } from '../contracts/autonomous-schedule.contract.ts';
import { validateAutonomousMachineGuard } from '../guards/autonomous-machine-guard.ts';
import { validateAutonomousScheduleGuard } from '../guards/autonomous-schedule-guard.ts';
import { validateAutonomousDuplicateGuard, AutonomousSurveyRecord } from '../guards/autonomous-duplicate-guard.ts';
import { validateFiveBlocksAndTemperature } from '../validators/five-block-validator.ts';
import { validateAutonomousResponses } from '../validators/response-validator.ts';
import { detectAutonomousFindings } from '../engine/finding-detector.ts';
import { AutonomousConnectorError } from '../errors/autonomous-error-catalog.ts';

export interface AutonomousConnectorOptions {
  featureFlagEnabled?: boolean;
  localCatalogs?: {
    machines?: Array<{ equipo_towell: string; departamento_codigo?: string; area?: string; activo?: boolean; criticidad?: string }>;
    existingSurveys?: AutonomousSurveyRecord[];
  };
}

export async function processAutonomousScheduleItem(
  supabase: SupabaseClient | null,
  rawPayload: any,
  correlationId: string,
  eventId?: string,
  options: AutonomousConnectorOptions = {}
): Promise<AG009ExecutionResult> {
  const startTime = Date.now();

  // 1. Feature Flag Check (§57 PRD)
  if (options.featureFlagEnabled === false) {
    return {
      success: false,
      agent_id: 'AG-009.2',
      workflow_state: 'BLOCKED',
      correlation_id: correlationId,
      event_id: eventId,
      error_code: 'AGENT_CONNECTOR_DISABLED',
      error_message: 'El conector AG-009.2 se encuentra deshabilitado por Feature Flag.',
      duration_ms: Date.now() - startTime
    };
  }

  // 2. Contract Validation (§10 & §71 PRD)
  const contractValidation = validateAutonomousScheduleContract(rawPayload);
  if (!contractValidation.isValid || !contractValidation.cleanedPayload) {
    return {
      success: false,
      agent_id: 'AG-009.2',
      workflow_state: 'BLOCKED',
      correlation_id: correlationId,
      event_id: eventId,
      error_code: contractValidation.errorCode || 'INVALID_CONTRACT',
      error_message: contractValidation.errorMessage || 'Payload no cumple con AUTONOMOUS-SCHEDULE-001.',
      duration_ms: Date.now() - startTime
    };
  }

  const payload = contractValidation.cleanedPayload;

  try {
    // 3. Machine & Department Guard (§12 & §13 PRD)
    const machine = await validateAutonomousMachineGuard(
      supabase,
      payload.machine_id,
      options.localCatalogs?.machines
    );

    // 4. Weekly Schedule Guard (§14 PRD)
    const schedule = validateAutonomousScheduleGuard(
      payload.calendar_reference,
      payload.week_reference,
      payload.scheduled_date,
      payload.year
    );

    // 5. Weekly Duplicate Guard (§15, §16, §45, §70 PRD)
    const existingSurveys: AutonomousSurveyRecord[] = options.localCatalogs?.existingSurveys || [];
    validateAutonomousDuplicateGuard(
      machine.machine_id,
      schedule.week_reference,
      schedule.year,
      existingSurveys
    );

    // 6. Mandatory 5 Blocks & Temperature Guard (§19, §20, §21 PRD)
    validateFiveBlocksAndTemperature(payload.responses);

    // 7. Response Integrity & Type Validator (§22, §23, §27, §28 PRD)
    const validatedResponses = validateAutonomousResponses(payload.responses);

    // 8. Unique Survey Reference
    const surveyRef = `LEV-AUT-${machine.machine_id}-W${String(schedule.week_reference).replace(/[^0-9a-zA-Z]/g, '')}-${schedule.year}`;

    // 9. Finding Detection Engine (§25, §29-33, §34, §35 PRD)
    const detectedFindings = detectAutonomousFindings({
      machine_id: machine.machine_id,
      survey_reference: surveyRef,
      calendar_reference: schedule.calendar_reference,
      week_reference: schedule.week_reference,
      year: schedule.year,
      responses: validatedResponses,
      correlation_id: correlationId
    });

    const surveyExecutionRecord = {
      survey_reference: surveyRef,
      machine_id: machine.machine_id,
      department: machine.department,
      calendar_reference: schedule.calendar_reference,
      week_reference: schedule.week_reference,
      year: schedule.year,
      total_items: validatedResponses.length,
      finding_count: detectedFindings.length,
      operator_id: payload.operator_id || null,
      operator_name: payload.operator_name || null,
      executed_at: new Date().toISOString(),
      status: 'EJECUTADO'
    };

    // 10. Route Decision (§34 & §35 PRD)
    if (detectedFindings.length === 0) {
      // Flow with NO findings -> Complete Survey, record in bitacora, NO corrective request created
      return {
        success: true,
        agent_id: 'AG-009.2',
        workflow_state: 'AUTONOMOUS_SURVEY_COMPLETED',
        correlation_id: correlationId,
        event_id: eventId,
        survey_execution: surveyExecutionRecord,
        findings: [],
        details: {
          message: `Rutina autónoma completada exitosamente sin hallazgos para equipo ${machine.machine_id} (Semana ${schedule.week_reference}).`,
          five_blocks_validated: true,
          finding_count: 0
        },
        duration_ms: Date.now() - startTime
      };
    }

    // Flow WITH findings (>= 1) -> Emit AUTONOMOUS-FINDING-001 to AG-001 (DO NOT CREATE OT DIRECTLY §40 PRD)
    return {
      success: true,
      agent_id: 'AG-009.2',
      workflow_state: 'AUTONOMOUS_FINDING_DETECTED',
      correlation_id: correlationId,
      event_id: eventId,
      survey_execution: surveyExecutionRecord,
      findings: detectedFindings,
      details: {
        message: `Se detectaron ${detectedFindings.length} anomalía(s) en la rutina autónoma de ${machine.machine_id}. Eventos de hallazgo emitidos para gestión por AG-001 / AG-009.3.`,
        five_blocks_validated: true,
        finding_count: detectedFindings.length,
        finding_ids: detectedFindings.map(f => f.finding_id)
      },
      duration_ms: Date.now() - startTime
    };

  } catch (err: any) {
    const errCode = err instanceof AutonomousConnectorError ? err.code : (err.code || 'PERSISTENCE_ERROR');
    const errMsg = err.message || 'Error en ejecución de conector autónomo.';

    return {
      success: false,
      agent_id: 'AG-009.2',
      workflow_state: 'BLOCKED',
      correlation_id: correlationId,
      event_id: eventId,
      error_code: errCode,
      error_message: errMsg,
      duration_ms: Date.now() - startTime
    };
  }
}
