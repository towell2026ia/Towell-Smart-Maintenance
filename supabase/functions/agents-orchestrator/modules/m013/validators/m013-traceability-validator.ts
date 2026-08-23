// supabase/functions/agents-orchestrator/modules/m013/validators/m013-traceability-validator.ts
// Traceability Validator asserting 100% item traceability for M-013 (v1.0)
// Frozen under Token: M013-TRACEABILITY-RULES-001

import type { SafetyControlPackage } from '../types/m013.types.ts';

export class M013TraceabilityValidator {
  public static validate(pkg: SafetyControlPackage): void {
    if (!pkg.traceability) {
      throw new Error('[M013_TRACEABILITY_ERROR] Falta el objeto de trazabilidad en el paquete de seguridad.');
    }
    if (!pkg.traceability.all_controls_traceable) {
      throw new Error('[M013_TRACEABILITY_ERROR] No todos los controles de seguridad son 100% trazables.');
    }
    for (const req of pkg.requirements) {
      if (!req.source || req.source.trim() === '') {
        throw new Error(`[M013_TRACEABILITY_ERROR] El requisito ${req.requirement_id} carece de fuente trazable.`);
      }
    }
    for (const ev of pkg.evidence) {
      if (!ev.source_reference || ev.source_reference.trim() === '') {
        throw new Error(`[M013_TRACEABILITY_ERROR] La evidencia ${ev.evidence_id} carece de referencia de origen.`);
      }
    }
  }
}
