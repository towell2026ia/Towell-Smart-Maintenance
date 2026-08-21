// supabase/functions/agents-orchestrator/agents/ag011/validators/ag011-memory-validator.ts
// Comprehensive Memory Item Validator for AG-011 (v1.0)
// Frozen under Token: AG011-TECHNICAL-MEMORY-MODEL-001
// Invariant: Full Contract Validation & Invariants Enforcement (§140-142 PRD-AG-011.2)

import { AG011MemoryTraceabilityValidator } from './ag011-memory-traceability-validator.ts';
import type { AG011TechnicalMemoryItem } from '../types/ag011.types.ts';

export class AG011MemoryValidator {
  public static validate(memory: AG011TechnicalMemoryItem): void {
    if (!memory.memory_id || !memory.memory_id.startsWith('MEM-')) {
      throw new Error(`[AG011MemoryValidator] Identificador de memoria inválido: '${memory.memory_id}'.`);
    }

    if (!memory.title || memory.title.length < 5) {
      throw new Error(`[AG011MemoryValidator] Título de memoria '${memory.memory_id}' demasiado corto.`);
    }

    if (!memory.technical_content || !memory.technical_content.validated_procedure) {
      throw new Error(`[AG011MemoryValidator] Memoria '${memory.memory_id}' carece de procedimiento técnico validado.`);
    }

    if (!memory.scope || !memory.scope.scope_level) {
      throw new Error(`[AG011MemoryValidator] Memoria '${memory.memory_id}' carece de nivel de alcance.`);
    }

    if (memory.status === 'APPROVED' && !memory.approval) {
      throw new Error(`[AG011_UNAPPROVED_MEMORY_IN_APPROVED_STATE] Memoria '${memory.memory_id}' en estado APPROVED sin registro formal de aprobación humana.`);
    }

    // Assert full traceability
    AG011MemoryTraceabilityValidator.assertFullTraceability(memory);
  }
}
