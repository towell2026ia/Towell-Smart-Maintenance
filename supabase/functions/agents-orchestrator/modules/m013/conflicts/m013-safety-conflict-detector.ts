// supabase/functions/agents-orchestrator/modules/m013/conflicts/m013-safety-conflict-detector.ts
// Safety Conflict Detector checking contradictory evidence (v1.0)
// Frozen under Token: M013-CONFLICT-RULES-001

import type { SafetyConflict, LotoControl, PermitControl } from '../types/m013.types.ts';

export class M013SafetyConflictDetector {
  public static detect(
    workOrderRaw: any,
    lotoControl: LotoControl,
    permitControl: PermitControl,
    checklistsRaw: any[] = []
  ): SafetyConflict[] {
    const conflicts: SafetyConflict[] = [];

    // 1. Conflicto entre LOTO verificado y reporte de línea energizada en bitácora/raw
    if (lotoControl.status === 'VERIFIED_BY_HUMAN' && workOrderRaw && workOrderRaw.has_electrical_hazard_active) {
      conflicts.push({
        conflict_id: 'CONF-01',
        requirement_id: 'REQ-LOTO-01',
        description: 'LOTO reportado como verificado pero existe flag activo de línea viva en OT.',
        source_a: 'LotoControl (VERIFIED_BY_HUMAN)',
        source_b: 'WorkOrder (has_electrical_hazard_active: true)'
      });
    }

    // 2. Conflicto entre checklist completado y permiso expirado
    const checklistComplete = checklistsRaw.some(c => c.estado === 'COMPLETADO' || c.is_complete === true);
    if (checklistComplete && permitControl.status === 'EXPIRED') {
      conflicts.push({
        conflict_id: 'CONF-02',
        requirement_id: 'REQ-PERMIT-01',
        description: 'Checklist de seguridad marcado como completado pero el permiso de trabajo ha expirado.',
        source_a: 'Checklist (COMPLETADO)',
        source_b: 'PermitControl (EXPIRED)'
      });
    }

    // 3. Discrepancia explícita en el payload
    if (workOrderRaw && workOrderRaw.has_safety_conflict) {
      conflicts.push({
        conflict_id: 'CONF-03',
        requirement_id: 'REQ-GENERAL',
        description: workOrderRaw.safety_conflict_description || 'Inconsistencia detectada en evidencias de seguridad.',
        source_a: 'Checklist de Sitio',
        source_b: 'Bitácora de Intervención'
      });
    }

    return conflicts;
  }
}
