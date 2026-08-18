// supabase/functions/agents-orchestrator/agents/ag009/ag009_3/builders/corrective-ot-builder.ts
// Standard Corrective Work Order Payload Builder for AG-009.3 (§35-38, §85 PRD)

import { CorrectiveRequest, CorrectiveOTDraft, DepartmentCode } from '../../types/ag009.types.ts';
import { computeCanonicalCorrectiveHash } from '../guards/corrective-approval-guard.ts';

export async function buildCorrectiveOTDraft(
  request: CorrectiveRequest,
  sequenceNum: number = 1
): Promise<CorrectiveOTDraft> {
  const areaCode = request.department_code || 'AF';
  const paddedSeq = String(sequenceNum).padStart(5, '0');
  const folio = `${areaCode}${paddedSeq}`;

  const draft: CorrectiveOTDraft = {
    folio_propuesto: folio,
    maquina_id: request.machine_id,
    area: areaCode,
    tipo_orden: 'Correctivo',
    descripcion_problema: request.description,
    prioridad: request.priority || 'MEDIA',
    origen_solicitud: request.source,
    id_solicitud_origen: request.request_id,
    referencia_origen: request.source_reference,
    solicitado_por: request.requester_reference,
    fecha_solicitud: request.requested_at,
    fecha_compromiso: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    requiere_aprobacion: true,
    refacciones_requeridas: request.planned_parts || [],
    estado_inicial: 'Asignada',
    correlation_id: request.correlation_id
  };

  draft.action_hash = await computeCanonicalCorrectiveHash(draft);
  return draft;
}
