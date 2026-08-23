// supabase/functions/agents-orchestrator/modules/m013/blocking/m013-safety-blocking-engine.ts
// Safety Blocking Engine applying deterministic rules BLK-SAF-01 to 05 (v1.0)
// Frozen under Token: M013-BLOCKING-RULES-001

import type {
  SafetyBlockingReason,
  LotoControl,
  PermitControl,
  SafetyConflict,
  SafetyRequirement
} from '../types/m013.types.ts';

export class M013SafetyBlockingEngine {
  public static evaluate(
    requirements: SafetyRequirement[],
    lotoControl: LotoControl,
    permitControl: PermitControl,
    conflicts: SafetyConflict[]
  ): SafetyBlockingReason[] {
    const blockingReasons: SafetyBlockingReason[] = [];

    // BLK-SAF-01: LOTO requerido pendiente de verificación humana
    if (lotoControl.is_required && lotoControl.status !== 'VERIFIED_BY_HUMAN') {
      blockingReasons.push({
        rule_code: 'BLK-SAF-01',
        description: 'Requisito LOTO pendiente de verificación humana autorizada o fallido.',
        severity: 'CRITICAL_BLOCK'
      });
    }

    // BLK-SAF-02: Permiso requerido ausente o no aprobado
    if (permitControl.is_required && (permitControl.status === 'PENDING' || permitControl.status === 'REJECTED' || permitControl.status === 'REQUIRED')) {
      blockingReasons.push({
        rule_code: 'BLK-SAF-02',
        description: 'Permiso de trabajo requerido ausente, pendiente o denegado.',
        severity: 'CRITICAL_BLOCK'
      });
    }

    // BLK-SAF-03: Permiso de trabajo expirado
    if (permitControl.is_required && permitControl.status === 'EXPIRED') {
      blockingReasons.push({
        rule_code: 'BLK-SAF-03',
        description: 'Permiso de trabajo expirado respecto a la fecha y hora de evaluación.',
        severity: 'CRITICAL_BLOCK'
      });
    }

    // BLK-SAF-04: EPP obligatorio no confirmado
    const hasUnconfirmedPpe = requirements.some(r => r.requirement_type === 'PPE_SPECIAL_REQUIRED' && r.is_blocking);
    if (hasUnconfirmedPpe) {
      blockingReasons.push({
        rule_code: 'BLK-SAF-04',
        description: 'Uso de EPP especial obligatorio no verificado.',
        severity: 'WARNING'
      });
    }

    // BLK-SAF-05: Evidencias contradictorias de seguridad
    if (conflicts.length > 0) {
      blockingReasons.push({
        rule_code: 'BLK-SAF-05',
        description: `Se detectaron ${conflicts.length} conflictos o inconsistencias entre fuentes de evidencia.`,
        severity: 'CRITICAL_BLOCK'
      });
    }

    return blockingReasons;
  }
}
