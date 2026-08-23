// supabase/functions/agents-orchestrator/modules/m012/validators/m012-traceability-validator.ts
// Traceability Validator for M-012 (v1.0)
// Frozen under Token: M012-TRACEABILITY-001
// Invariant: preparation_item_traceability = 100%, untraceable_preparation_item = 0 (§94-95 PRD-M-012.2)

import type { OTPreparationPackage } from '../types/m012.types.ts';

export class M012TraceabilityValidator {
  public static validate(pkg: OTPreparationPackage): { isTraceable: boolean; untraceableCount: number; errors: string[] } {
    const errors: string[] = [];
    let untraceableCount = 0;

    // 1. Validate Parts Traceability
    for (const part of pkg.parts) {
      if (!part.source || part.source.trim() === '') {
        untraceableCount++;
        errors.push(`Refacción ${part.part_id} no cuenta con fuente documentada.`);
      }
    }

    // 2. Validate Tools Traceability
    for (const tool of pkg.tools) {
      if (!tool.source || tool.source.trim() === '') {
        untraceableCount++;
        errors.push(`Herramienta ${tool.tool_id} no cuenta con fuente documentada.`);
      }
    }

    // 3. Validate Technical Memories Traceability
    for (const mem of pkg.technical_memories) {
      if (!mem.memory_id || !mem.version) {
        untraceableCount++;
        errors.push(`Memoria técnica sin identificador o versión válida.`);
      }
    }

    // 4. Validate Safety Dependencies Traceability
    for (const saf of pkg.safety_dependencies) {
      if (!saf.source || saf.source.trim() === '') {
        untraceableCount++;
        errors.push(`Dependencia de seguridad ${saf.dependency_id} sin regla de origen.`);
      }
    }

    return {
      isTraceable: untraceableCount === 0,
      untraceableCount,
      errors
    };
  }
}
