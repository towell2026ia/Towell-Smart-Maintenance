// supabase/functions/agents-orchestrator/agents/ag013/semantic/ag013-semantic-reference-validator.ts
// Semantic Reference Validity Validator for AG-013 (v1.0)
// Frozen under Token: AG013-SEMANTIC-LAYER-001
// Target: semantic_reference_validity = 100% (§62-65 PRD-AG-013.3)

import type { AG013SemanticOutput } from '../contracts/ag013-semantic-output.contract.ts';
import type { AG013SemanticInputPayload } from '../contracts/ag013-semantic-input.contract.ts';

export class AG013SemanticReferenceValidator {
  public static validate(output: AG013SemanticOutput, input: AG013SemanticInputPayload): boolean {
    const validAssets = new Set(input.assets.map(a => a.asset_id));

    for (const narrative of output.critical_asset_narratives) {
      if (!validAssets.has(narrative.asset_id)) {
        throw new Error(`[AG013SemanticReferenceValidator] Activo no existente citado: ${narrative.asset_id}`);
      }

      if (!Array.isArray(narrative.cited_references)) {
        throw new Error(`[AG013SemanticReferenceValidator] cited_references debe ser un arreglo para ${narrative.asset_id}`);
      }
    }

    return true;
  }
}
