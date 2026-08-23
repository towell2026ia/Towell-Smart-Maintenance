// supabase/functions/agents-orchestrator/agents/ag013/semantic/ag013-protected-field-validator.ts
// Protected Field Invariant Validator for AG-013 (v1.0)
// Frozen under Token: AG013-SEMANTIC-LAYER-001
// Invariant: protected_field_diff = 0 (§15-16, §52-54 PRD-AG-013.3)

import type { AG013SemanticOutput } from '../contracts/ag013-semantic-output.contract.ts';
import type { AG013SemanticInputPayload } from '../contracts/ag013-semantic-input.contract.ts';

export class AG013ProtectedFieldValidator {
  public static validate(output: AG013SemanticOutput, input: AG013SemanticInputPayload): boolean {
    const inputAssetMap = new Map(input.assets.map(a => [a.asset_id, a]));

    for (const narrative of output.critical_asset_narratives) {
      const original = inputAssetMap.get(narrative.asset_id);
      if (!original) {
        throw new Error(`[AG013ProtectedFieldValidator] Asset desconocido en output semántico: ${narrative.asset_id}`);
      }

      // 1. Classification Echo
      if (narrative.classification_echo !== original.classification) {
        throw new Error(
          `[AG013ProtectedFieldValidator] Discrepancia en classification_echo para ${narrative.asset_id}: esperado ${original.classification}, recibido ${narrative.classification_echo}`
        );
      }

      // 2. Rank Echo
      if (narrative.rank_echo !== original.rank) {
        throw new Error(
          `[AG013ProtectedFieldValidator] Discrepancia en rank_echo para ${narrative.asset_id}: esperado ${original.rank}, recibido ${narrative.rank_echo}`
        );
      }

      // 3. Score Echo
      if (Math.abs(narrative.score_echo - original.bad_actor_score) > 0.05) {
        throw new Error(
          `[AG013ProtectedFieldValidator] Discrepancia en score_echo para ${narrative.asset_id}: esperado ${original.bad_actor_score}, recibido ${narrative.score_echo}`
        );
      }
    }

    return true;
  }
}
