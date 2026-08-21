// supabase/functions/agents-orchestrator/agents/ag011/validators/ag011-memory-reference-validator.ts
// Memory Reference Validator for AG-011 Semantic Output (v1.0)
// Frozen under Token: AG011-SEMANTIC-RULES-001
// Invariant: memory_reference_validity = 100% (§33-36, 89-90 PRD-AG-011.3)

import type { AG011SemanticInput } from '../contracts/ag011-semantic-input.contract.ts';
import type { AG011SemanticOutput } from '../contracts/ag011-semantic-output.contract.ts';

export class AG011MemoryReferenceValidator {
  public static validateReferences(
    semanticOutput: AG011SemanticOutput,
    semanticInput: AG011SemanticInput
  ): void {
    const validMemoryMap = new Map<string, string>(); // memory_id -> version
    for (const mem of semanticInput.memories) {
      validMemoryMap.set(mem.memory_id, mem.version);
    }

    // 1. Validate applicable_memories references
    for (const app of semanticOutput.applicable_memories || []) {
      if (!validMemoryMap.has(app.memory_id)) {
        throw new Error(`[AG011_UNKNOWN_MEMORY_REFERENCE] Memoria '${app.memory_id}' no existe en el conjunto de entrada.`);
      }
      const expectedVersion = validMemoryMap.get(app.memory_id);
      if (app.version !== expectedVersion) {
        throw new Error(`[AG011_INVALID_MEMORY_VERSION] Versión '${app.version}' para memoria '${app.memory_id}' no coincide con la versión de entrada '${expectedVersion}'.`);
      }
    }

    // 2. Validate memory_comparisons references
    for (const comp of semanticOutput.memory_comparisons || []) {
      if (!validMemoryMap.has(comp.memory_id_a)) {
        throw new Error(`[AG011_UNKNOWN_MEMORY_REFERENCE] Memoria A '${comp.memory_id_a}' en comparativa no existe en el input.`);
      }
      if (!validMemoryMap.has(comp.memory_id_b)) {
        throw new Error(`[AG011_UNKNOWN_MEMORY_REFERENCE] Memoria B '${comp.memory_id_b}' en comparativa no existe en el input.`);
      }
    }

    // 3. Validate reusable_lessons references
    for (const lesson of semanticOutput.reusable_lessons || []) {
      for (const memId of lesson.referenced_memory_ids || []) {
        if (!validMemoryMap.has(memId)) {
          throw new Error(`[AG011_UNKNOWN_MEMORY_REFERENCE] Lección reutilizable referencia memoria desconocida '${memId}'.`);
        }
      }
    }
  }
}
