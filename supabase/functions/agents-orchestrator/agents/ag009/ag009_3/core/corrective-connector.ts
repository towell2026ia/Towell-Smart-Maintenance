// supabase/functions/agents-orchestrator/agents/ag009/ag009_3/core/corrective-connector.ts
// Central Deterministic Pipeline for AG-009.3 Conector Correctivo v1.0 (§1-101 PRD)

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  AG009ExecutionResult,
  CorrectiveRequest,
  SubtaskRequest,
  CorrectiveOTDraft
} from '../../types/ag009.types.ts';
import { validateCorrectiveSecurityGuard } from '../guards/corrective-security-guard.ts';
import { normalizeToCorrectiveRequest } from '../normalizers/corrective-request-normalizer.ts';
import { validateCorrectiveMachineGuard } from '../guards/corrective-machine-guard.ts';
import {
  validateCorrectiveDuplicateGuard,
  ExistingRequestRecord
} from '../guards/corrective-duplicate-guard.ts';
import {
  verifyCorrectiveApprovalBinding,
  CorrectiveApprovalRecord
} from '../guards/corrective-approval-guard.ts';
import { buildCorrectiveOTDraft } from '../builders/corrective-ot-builder.ts';
import { validateSubtaskRequestContract } from '../contracts/subtask-request.contract.ts';
import { CorrectiveStateMachine } from './state-machine.ts';
import { CorrectiveConnectorError } from '../errors/corrective-error-catalog.ts';

export interface CorrectiveConnectorOptions {
  featureFlagEnabled?: boolean;
  requireApproval?: boolean;
  approvalRecord?: CorrectiveApprovalRecord;
  sequenceNum?: number;
  localCatalogs?: {
    machines?: Array<{ equipo_towell: string; departamento_codigo?: string; area?: string; activo?: boolean; criticidad?: string }>;
    existingRequests?: ExistingRequestRecord[];
    existingOrders?: Array<{ id: string; folio?: string; machine?: string; status?: string }>;
  };
}

export async function processCorrectiveRequest(
  supabase: SupabaseClient | null,
  rawPayload: any,
  correlationId: string,
  eventId?: string,
  options: CorrectiveConnectorOptions = {}
): Promise<AG009ExecutionResult> {
  const startTime = Date.now();
  const sm = new CorrectiveStateMachine('REQUESTED');

  // 1. Feature Flag Check (§67, §68 PRD)
  if (options.featureFlagEnabled === false) {
    sm.transitionTo('BLOCKED');
    return {
      success: false,
      agent_id: 'AG-009.3',
      workflow_state: sm.getState(),
      correlation_id: correlationId,
      event_id: eventId,
      error_code: 'AGENT_CONNECTOR_DISABLED',
      error_message: 'El conector AG-009.3 se encuentra deshabilitado por Feature Flag.',
      duration_ms: Date.now() - startTime
    };
  }

  try {
    // 2. Security Guard: Filtrar campos de control no autorizados (§63-66 PRD)
    const secResult = validateCorrectiveSecurityGuard(rawPayload || {});
    const cleanedRaw = secResult.cleanedFields;

    // 3. Multi-Source Normalization (§8, §13-26 PRD)
    const correctiveReq: CorrectiveRequest = normalizeToCorrectiveRequest(cleanedRaw, correlationId);
    sm.transitionTo('VALIDATED');

    // 4. Machine & Department Guard (§11, §12 PRD)
    const validMachine = await validateCorrectiveMachineGuard(
      supabase,
      correctiveReq.machine_id,
      correctiveReq.department_code,
      options.localCatalogs?.machines
    );
    correctiveReq.department_code = validMachine.department_code;

    // 5. Deduplication & Idempotency Engine (§27-32 PRD)
    const existingList = options.localCatalogs?.existingRequests || [];
    const dupCheck = validateCorrectiveDuplicateGuard(correctiveReq, existingList, eventId);

    if (dupCheck.status === 'IDEMPOTENT_REPLAY') {
      return {
        success: true,
        agent_id: 'AG-009.3',
        workflow_state: 'VALIDATED',
        correlation_id: correlationId,
        event_id: eventId,
        duplicate_status: 'IDEMPOTENT_REPLAY',
        corrective_request: correctiveReq,
        details: { message: dupCheck.reason },
        duration_ms: Date.now() - startTime
      };
    }

    if (dupCheck.status === 'EXACT_DUPLICATE') {
      sm.transitionTo('BLOCKED');
      return {
        success: false,
        agent_id: 'AG-009.3',
        workflow_state: sm.getState(),
        correlation_id: correlationId,
        event_id: eventId,
        error_code: 'DUPLICATE_EVENT',
        error_message: dupCheck.reason || 'Solicitud correctiva duplicada exacta.',
        duplicate_status: 'EXACT_DUPLICATE',
        corrective_request: correctiveReq,
        duration_ms: Date.now() - startTime
      };
    }

    sm.transitionTo('CORRECTIVE_REQUEST_PREPARED');

    // 6. Preparar Work Order Draft (§35-38 PRD)
    const otDraft = await buildCorrectiveOTDraft(correctiveReq, options.sequenceNum || 1);

    // 7. Governance & Approval Guard (§39-43 PRD)
    const needsApproval = options.requireApproval !== false; // Default true para creación de OT correctiva

    if (needsApproval && !options.approvalRecord) {
      sm.transitionTo('PENDING_APPROVAL');
      return {
        success: true,
        agent_id: 'AG-009.3',
        workflow_state: sm.getState(),
        correlation_id: correlationId,
        event_id: eventId,
        corrective_request: correctiveReq,
        ot_draft: otDraft,
        approval_required: true,
        duplicate_status: dupCheck.status === 'POSSIBLE_DUPLICATE' ? 'POSSIBLE_DUPLICATE' : 'NOT_DUPLICATE',
        details: {
          action_required: 'ACTION_REQUIRES_APPROVAL',
          action_hash: otDraft.action_hash,
          message: 'La Orden de Trabajo Correctiva requiere aprobación de Super Admin.'
        },
        duration_ms: Date.now() - startTime
      };
    }

    if (options.approvalRecord) {
      sm.transitionTo('PENDING_APPROVAL');
      await verifyCorrectiveApprovalBinding(otDraft, options.approvalRecord);
      sm.transitionTo('APPROVED');
    }

    // 8. Crear OT Formalizada (§36, §37 PRD)
    sm.transitionTo('OT_CREATED');
    const otCreated = {
      ...otDraft,
      estatus: 'Asignada',
      aprobada: true,
      aprobada_por: options.approvalRecord?.aprobado_por || 'SUPER_ADMIN',
      fecha_aprobacion: new Date().toISOString()
    };

    return {
      success: true,
      agent_id: 'AG-009.3',
      workflow_state: sm.getState(),
      correlation_id: correlationId,
      event_id: eventId,
      corrective_request: correctiveReq,
      ot_draft: otDraft,
      ot_created: otCreated,
      approval_required: false,
      approval_id: options.approvalRecord?.id_aprobacion || null,
      duplicate_status: dupCheck.status === 'POSSIBLE_DUPLICATE' ? 'POSSIBLE_DUPLICATE' : 'NOT_DUPLICATE',
      details: {
        message: `OT Correctiva formalizada exitosamente con folio ${otDraft.folio_propuesto}.`
      },
      duration_ms: Date.now() - startTime
    };

  } catch (err: any) {
    const isKnown = err instanceof CorrectiveConnectorError;
    const errorCode = isKnown ? err.code : 'INVALID_EVENT';
    const errorMsg = err.message || 'Error desconocido en conector correctivo';

    try { sm.transitionTo('BLOCKED'); } catch(e) {}

    return {
      success: false,
      agent_id: 'AG-009.3',
      workflow_state: sm.getState(),
      correlation_id: correlationId,
      event_id: eventId,
      error_code: errorCode,
      error_message: errorMsg,
      duration_ms: Date.now() - startTime
    };
  }
}

export async function processSubtaskRequest(
  supabase: SupabaseClient | null,
  rawPayload: any,
  correlationId: string,
  eventId?: string,
  options: CorrectiveConnectorOptions = {}
): Promise<AG009ExecutionResult> {
  const startTime = Date.now();
  const sm = new CorrectiveStateMachine('REQUESTED');

  if (options.featureFlagEnabled === false) {
    sm.transitionTo('BLOCKED');
    return {
      success: false,
      agent_id: 'AG-009.3',
      workflow_state: sm.getState(),
      correlation_id: correlationId,
      event_id: eventId,
      error_code: 'AGENT_CONNECTOR_DISABLED',
      error_message: 'El conector AG-009.3 se encuentra deshabilitado por Feature Flag.',
      duration_ms: Date.now() - startTime
    };
  }

  try {
    // 1. Validar seguridad (§63 PRD)
    const secResult = validateCorrectiveSecurityGuard(rawPayload || {});
    const cleanedRaw = secResult.cleanedFields;

    // 2. Validar contrato de subtarea (§46-48 PRD)
    const val = validateSubtaskRequestContract(cleanedRaw);
    if (!val.isValid || !val.cleanedPayload) {
      sm.transitionTo('BLOCKED');
      return {
        success: false,
        agent_id: 'AG-009.3',
        workflow_state: sm.getState(),
        correlation_id: correlationId,
        event_id: eventId,
        error_code: val.errorCode || 'INVALID_SUBTASK_REQUEST',
        error_message: val.errorMessage || 'Contrato de subtarea inválido',
        duration_ms: Date.now() - startTime
      };
    }

    const subtask = val.cleanedPayload;
    sm.transitionTo('VALIDATED');

    // 3. Validar existencia de OT Padre (§49 PRD)
    const existingOrders = options.localCatalogs?.existingOrders || [];
    if (existingOrders.length > 0) {
      const parentFound = existingOrders.find(o => o.id === subtask.parent_ot_reference || o.folio === subtask.parent_ot_reference);
      if (!parentFound) {
        throw new CorrectiveConnectorError(
          'PARENT_OT_NOT_FOUND',
          `La Orden de Trabajo padre "${subtask.parent_ot_reference}" no existe en el sistema.`
        );
      }
    }

    sm.transitionTo('SUBTASK_PREPARED');

    return {
      success: true,
      agent_id: 'AG-009.3',
      workflow_state: sm.getState(),
      correlation_id: correlationId,
      event_id: eventId,
      subtask_draft: subtask,
      details: {
        parent_ot: subtask.parent_ot_reference,
        requested_area: subtask.requested_area,
        message: `Subtarea preparada para asignación por Super Admin vinculada a OT ${subtask.parent_ot_reference}.`
      },
      duration_ms: Date.now() - startTime
    };
  } catch (err: any) {
    const isKnown = err instanceof CorrectiveConnectorError;
    const errorCode = isKnown ? err.code : 'INVALID_SUBTASK_REQUEST';
    const errorMsg = err.message || 'Error en validación de subtarea';

    try { sm.transitionTo('BLOCKED'); } catch(e) {}

    return {
      success: false,
      agent_id: 'AG-009.3',
      workflow_state: sm.getState(),
      correlation_id: correlationId,
      event_id: eventId,
      error_code: errorCode,
      error_message: errorMsg,
      duration_ms: Date.now() - startTime
    };
  }
}
