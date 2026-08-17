// supabase/functions/agents-orchestrator/agents/ag009/ag009_1/core/approval-binding.ts
// Approval Binding and Governance Engine (§34, §35, §36, §37, §38 PRD-AG-009.1)

import { PreventiveOTDraft } from '../builders/preventive-ot-builder.ts';
import { PreventiveConnectorError } from '../errors/preventive-error-catalog.ts';

export async function computeCanonicalHash(payload: Record<string, any>): Promise<string> {
  // 1. Extraer claves de negocio críticas para el hash
  const coreObj = {
    maquina_id: String(payload.maquina_id || '').trim().toUpperCase(),
    service_code: String(payload.service_code || '').trim().toUpperCase(),
    fecha_inicio: String(payload.fecha_inicio || '').trim(),
    calendar_reference: String(payload.calendar_reference || '').trim(),
    tipo_orden: 'Preventivo'
  };

  // 2. Serializar de forma canónica (claves ordenadas alfabéticamente)
  const sortedKeys = Object.keys(coreObj).sort() as Array<keyof typeof coreObj>;
  const canonicalJson = JSON.stringify(sortedKeys.reduce((acc, k) => {
    acc[k] = coreObj[k];
    return acc;
  }, {} as Record<string, any>));

  // 3. Hash SHA-256
  const msgUint8 = new TextEncoder().encode(canonicalJson);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface ApprovalRecord {
  id_aprobacion: string;
  correlation_id: string;
  agent_id: string;
  tipo_accion: string;
  propuesta_payload: Record<string, any>;
  estatus: 'PENDIENTE_APROBACION' | 'APROBADO' | 'RECHAZADO';
  aprobado_por?: string;
  fecha_respuesta?: string;
  action_hash?: string;
  already_executed?: boolean;
}

export async function verifyApprovalBinding(
  draft: PreventiveOTDraft,
  approval: ApprovalRecord
): Promise<boolean> {
  // 1. Validar que la aprobación sea para este tipo de acción
  if (approval.tipo_accion !== 'CREATE_PREVENTIVE_OT') {
    throw new PreventiveConnectorError(
      'APPROVAL_INVALID',
      `El registro de aprobación ${approval.id_aprobacion} no corresponde a la acción "CREATE_PREVENTIVE_OT".`
    );
  }

  // 2. Validar que la aprobación esté APROBADA
  if (approval.estatus !== 'APROBADO') {
    throw new PreventiveConnectorError(
      'APPROVAL_REQUIRED',
      `La creación de la OT preventiva requiere aprobación de Super Admin. Estatus actual: "${approval.estatus}".`
    );
  }

  // 3. Validar que no haya sido consumida previamente (§38 PRD: Replay Guard)
  if (approval.already_executed === true) {
    throw new PreventiveConnectorError(
      'APPROVAL_ALREADY_USED',
      `La aprobación ${approval.id_aprobacion} ya fue utilizada para crear una OT previa y no puede ser reutilizada.`
    );
  }

  // 4. Validar integridad de payload aprobado vs draft actual (§37 PRD: Payload Mismatch Guard)
  const currentHash = await computeCanonicalHash(draft);
  const approvedHash = approval.action_hash || (await computeCanonicalHash(approval.propuesta_payload));

  if (currentHash !== approvedHash) {
    throw new PreventiveConnectorError(
      'APPROVAL_PAYLOAD_MISMATCH',
      `Los parámetros de la OT (máquina, servicio o fecha) fueron modificados tras la aprobación del Super Admin. Hash actual (${currentHash}) != Hash aprobado (${approvedHash}).`
    );
  }

  return true;
}
