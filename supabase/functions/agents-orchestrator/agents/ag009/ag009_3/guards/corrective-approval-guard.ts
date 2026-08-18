// supabase/functions/agents-orchestrator/agents/ag009/ag009_3/guards/corrective-approval-guard.ts
// Governance & Cryptographic SHA-256 Approval Binding for AG-009.3 (§39-43 PRD)

import { CorrectiveOTDraft } from '../../types/ag009.types.ts';
import { CorrectiveConnectorError } from '../errors/corrective-error-catalog.ts';

export async function computeCanonicalCorrectiveHash(payload: Record<string, any>): Promise<string> {
  const coreObj = {
    maquina_id: String(payload.maquina_id || '').trim().toUpperCase(),
    area: String(payload.area || '').trim().toUpperCase(),
    tipo_orden: 'Correctivo',
    descripcion_problema: String(payload.descripcion_problema || payload.description || '').trim(),
    solicitado_por: String(payload.solicitado_por || payload.requester_reference || '').trim()
  };

  const sortedKeys = Object.keys(coreObj).sort() as Array<keyof typeof coreObj>;
  const canonicalJson = JSON.stringify(sortedKeys.reduce((acc, k) => {
    acc[k] = coreObj[k];
    return acc;
  }, {} as Record<string, any>));

  const msgUint8 = new TextEncoder().encode(canonicalJson);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface CorrectiveApprovalRecord {
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

export async function verifyCorrectiveApprovalBinding(
  draft: CorrectiveOTDraft,
  approval: CorrectiveApprovalRecord
): Promise<boolean> {
  // 1. Validar que la acción corresponda a la creación de OT Correctiva
  if (approval.tipo_accion !== 'CREATE_CORRECTIVE_OT') {
    throw new CorrectiveConnectorError(
      'APPROVAL_INVALID',
      `El registro de aprobación ${approval.id_aprobacion} no corresponde a la acción "CREATE_CORRECTIVE_OT" (recibido: "${approval.tipo_accion}").`
    );
  }

  // 2. Validar que la aprobación esté en estatus APROBADO (§39 PRD)
  if (approval.estatus !== 'APROBADO') {
    throw new CorrectiveConnectorError(
      'APPROVAL_REQUIRED',
      `La creación de la OT correctiva requiere aprobación expresa del Super Administrador. Estatus actual: "${approval.estatus}".`
    );
  }

  // 3. Validar Replay Guard (§43 PRD)
  if (approval.already_executed === true) {
    throw new CorrectiveConnectorError(
      'APPROVAL_ALREADY_USED',
      `La aprobación ${approval.id_aprobacion} ya fue consumida para generar una OT previa. No se permite reejecución.`
    );
  }

  // 4. Validar Payload Mismatch Guard (§42 PRD)
  const currentHash = await computeCanonicalCorrectiveHash(draft);
  const approvedHash = approval.action_hash || (await computeCanonicalCorrectiveHash(approval.propuesta_payload));

  if (currentHash !== approvedHash) {
    throw new CorrectiveConnectorError(
      'APPROVAL_PAYLOAD_MISMATCH',
      `El payload de la OT fue modificado tras la aprobación del Super Admin. Hash actual (${currentHash}) != Hash aprobado (${approvedHash}).`
    );
  }

  return true;
}
