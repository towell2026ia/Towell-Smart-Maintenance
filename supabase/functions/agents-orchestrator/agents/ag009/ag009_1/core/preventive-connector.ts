// supabase/functions/agents-orchestrator/agents/ag009/ag009_1/core/preventive-connector.ts
// Central Pipeline Engine for AG-009.1 Conector Preventivo v1.0

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AG009ExecutionResult } from '../../types/ag009.types.ts';
import { validatePreventiveScheduleContract } from '../contracts/preventive-schedule.contract.ts';
import { validateMachineGuard } from '../guards/machine-guard.ts';
import { validateYearlyPreventiveGuard, ExistingPreventiveRecord } from '../guards/yearly-preventive-guard.ts';
import { validateServiceGuard } from '../guards/service-guard.ts';
import { resolveChecklistForService, ChecklistItem } from '../resolvers/checklist-resolver.ts';
import { buildPreventiveOTDraft, PreventiveOTDraft } from '../builders/preventive-ot-builder.ts';
import { verifyApprovalBinding, ApprovalRecord, computeCanonicalHash } from './approval-binding.ts';
import { PreventiveStateMachine } from './state-machine.ts';
import { linkCalendarToWorkOrder } from '../linkage/calendar-ot-link.ts';
import { PreventiveConnectorError } from '../errors/preventive-error-catalog.ts';

export interface PreventiveConnectorOptions {
  localCatalogs?: {
    machines?: Array<{ equipo_towell: string; departamento_codigo?: string; activo?: boolean; criticidad?: string }>;
    services?: Array<{ codigo_servicio: string; nombre_servicio: string; tipo_servicio?: string; activo?: boolean; duracion_estimada_min?: number }>;
    checklists?: ChecklistItem[];
    existingOrders?: ExistingPreventiveRecord[];
  };
  approvalRecord?: ApprovalRecord;
  requireApproval?: boolean;
  sequenceNum?: number;
  featureFlagEnabled?: boolean;
}

export async function processPreventiveScheduleItem(
  supabase: SupabaseClient | null,
  rawPayload: unknown,
  correlationId: string,
  eventId?: string,
  options: PreventiveConnectorOptions = {}
): Promise<AG009ExecutionResult> {
  const startTime = Date.now();
  const sm = new PreventiveStateMachine('SCHEDULED');

  // 0. Feature flag check (§62, §63 PRD)
  if (options.featureFlagEnabled === false) {
    return {
      success: false,
      agent_id: 'AG-009.1',
      workflow_state: 'BLOCKED',
      correlation_id: correlationId,
      event_id: eventId,
      error_code: 'AGENT_CONNECTOR_DISABLED',
      error_message: 'El conector preventivo AG-009.1 está deshabilitado por Feature Flag.',
      duration_ms: Date.now() - startTime
    };
  }

  try {
    // 1. Contract validation (§8, §10 PRD)
    const contractRes = validatePreventiveScheduleContract(rawPayload);
    if (!contractRes.isValid || !contractRes.cleanedPayload) {
      sm.transitionTo('BLOCKED');
      return {
        success: false,
        agent_id: 'AG-009.1',
        workflow_state: sm.getState(),
        correlation_id: correlationId,
        event_id: eventId,
        error_code: contractRes.errorCode || 'INVALID_CONTRACT',
        error_message: contractRes.errorMessage || 'Contrato inválido',
        duration_ms: Date.now() - startTime
      };
    }

    const payload = contractRes.cleanedPayload;

    // 2. Machine Guard (§12, §13 PRD)
    const machine = await validateMachineGuard(
      supabase,
      payload.machine_id,
      options.localCatalogs?.machines
    );

    // 3. Yearly Duplicate Guard (§3, §16, §17, §18, §19 PRD)
    await validateYearlyPreventiveGuard(
      supabase,
      payload.machine_id,
      payload.year,
      options.localCatalogs?.existingOrders
    );

    // 4. Service Guard (§20 PRD)
    const service = await validateServiceGuard(
      supabase,
      payload.service_code,
      options.localCatalogs?.services
    );

    // 5. Checklist Resolver (§21, §22, §23, §24, §25 PRD)
    const checklist = await resolveChecklistForService(
      supabase,
      payload.service_code,
      options.localCatalogs?.checklists
    );

    // 6. State Transition: SCHEDULED -> VALIDATED
    sm.transitionTo('VALIDATED');

    // 7. Build Preventive OT Draft (§30, §31, §32, §33 PRD)
    const draft: PreventiveOTDraft = buildPreventiveOTDraft(
      payload,
      machine,
      service,
      checklist,
      correlationId,
      options.sequenceNum || 1
    );

    // 8. State Transition: VALIDATED -> PENDING_APPROVAL
    sm.transitionTo('PENDING_APPROVAL');

    const canonicalHash = await computeCanonicalHash(draft);
    const requireApproval = options.requireApproval !== false; // Default true per PRD §34

    // 9. Governance & Approval Handling (§34, §35, §36, §37, §38 PRD)
    let isApproved = false;
    let approvalId: string | null = null;

    if (options.approvalRecord) {
      await verifyApprovalBinding(draft, options.approvalRecord);
      isApproved = true;
      approvalId = options.approvalRecord.id_aprobacion;
      sm.transitionTo('APPROVED');
    } else if (requireApproval) {
      // Retornar en estado PENDING_APPROVAL para que Super Admin apruebe
      return {
        success: true,
        agent_id: 'AG-009.1',
        workflow_state: sm.getState(),
        correlation_id: correlationId,
        event_id: eventId,
        ot_draft: draft,
        approval_required: true,
        approval_id: null,
        details: {
          action_hash: canonicalHash,
          message: 'Draft de OT Preventiva preparado con éxito. Requiere aprobación de Super Admin.'
        },
        duration_ms: Date.now() - startTime
      };
    } else {
      // Modo directo (solo para tests con requireApproval=false)
      isApproved = true;
      sm.transitionTo('APPROVED');
    }

    // 10. Creación y Persistencia de la OT Preventiva (§43, §44 PRD)
    const otUUID = crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36));
    const createdOt = {
      id_orden: otUUID,
      folio: draft.folio_propuesto,
      tipo_orden: draft.tipo_orden,
      orden_trabajo: draft.orden_trabajo,
      origen: draft.origen,
      estatus: draft.estatus,
      maquina_id: draft.maquina_id,
      departamento: draft.departamento,
      fecha_inicio: draft.fecha_inicio,
      fecha_hora_inicio: draft.fecha_hora_inicio,
      descripcion: draft.descripcion,
      observacion_inicial: draft.observacion_inicial,
      prioridad: draft.prioridad,
      calendar_reference: draft.calendar_reference
    };

    if (supabase) {
      const { error: insErr } = await supabase
        .from('ordenes_trabajo')
        .insert([createdOt]);

      if (insErr) {
        throw new PreventiveConnectorError('PERSISTENCE_ERROR', `Error al persistir OT preventiva: ${insErr.message}`);
      }
    }

    // 11. Linkage bidireccional Calendario ↔ OT (§41, §42 PRD)
    await linkCalendarToWorkOrder(supabase, draft, createdOt);

    sm.transitionTo('OT_CREATED');

    return {
      success: true,
      agent_id: 'AG-009.1',
      workflow_state: sm.getState(),
      correlation_id: correlationId,
      event_id: eventId,
      ot_draft: draft,
      ot_created: createdOt,
      approval_required: false,
      approval_id: approvalId,
      details: {
        action_hash: canonicalHash,
        message: `OT Preventiva ${createdOt.folio} creada y vinculada con éxito.`
      },
      duration_ms: Date.now() - startTime
    };

  } catch (err: any) {
    if (sm.getState() !== 'BLOCKED') {
      try { sm.transitionTo('BLOCKED'); } catch (_) {}
    }

    const errorCode = err instanceof PreventiveConnectorError ? err.code : 'PERSISTENCE_ERROR';

    return {
      success: false,
      agent_id: 'AG-009.1',
      workflow_state: sm.getState(),
      correlation_id: correlationId,
      event_id: eventId,
      error_code: errorCode,
      error_message: err.message || String(err),
      details: err instanceof PreventiveConnectorError ? err.details : undefined,
      duration_ms: Date.now() - startTime
    };
  }
}
