// supabase/functions/agents-orchestrator/agents/ag011/validators/ag011-semantic-scope-validator.ts
// Semantic Scope Validator for AG-011 (v1.0)
// Frozen under Token: AG011-SEMANTIC-RULES-001
// Invariant: semantic_scope_expansion = 0 (§40-42, 91-92 PRD-AG-011.3)

import type { AG011SemanticInput } from '../contracts/ag011-semantic-input.contract.ts';
import type { AG011SemanticOutput } from '../contracts/ag011-semantic-output.contract.ts';

export class AG011SemanticScopeValidator {
  public static validateScopePreservation(
    semanticOutput: AG011SemanticOutput,
    semanticInput: AG011SemanticInput
  ): void {
    const memoryScopeMap = new Map<string, string>();
    for (const mem of semanticInput.memories) {
      memoryScopeMap.set(mem.memory_id, mem.scope.scope_level);
    }

    const summaryLower = (semanticOutput.technical_summary || '').toLowerCase();

    // Check if summary makes claims of universal/plant-wide applicability when all inputs are ASSET_SPECIFIC
    const allAssetSpecific = semanticInput.memories.every(m => m.scope.scope_level === 'ASSET_SPECIFIC');
    if (allAssetSpecific) {
      if (summaryLower.includes('aplica a toda la planta') || summaryLower.includes('estándar universal') || summaryLower.includes('para todas las máquinas')) {
        throw new Error('[AG011_SEMANTIC_SCOPE_EXPANSION] La síntesis afirma aplicabilidad universal para memorias exclusivamente ASSET_SPECIFIC.');
      }
    }
  }
}
