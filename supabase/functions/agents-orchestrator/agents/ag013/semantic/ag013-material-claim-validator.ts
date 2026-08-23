// supabase/functions/agents-orchestrator/agents/ag013/semantic/ag013-material-claim-validator.ts
// Material Claim Validator for AG-013 (v1.0)
// Frozen under Token: AG013-SEMANTIC-LAYER-001
// Target: material_claim_traceability = 100% (§60-64 PRD-AG-013.3)

import type { AG013SemanticOutput } from '../contracts/ag013-semantic-output.contract.ts';
import type { AG013SemanticInputPayload } from '../contracts/ag013-semantic-input.contract.ts';

export class AG013MaterialClaimValidator {
  public static validate(output: AG013SemanticOutput, input: AG013SemanticInputPayload): boolean {
    const inputMap = new Map(input.assets.map(a => [a.asset_id, a]));

    for (const item of output.critical_asset_narratives) {
      const orig = inputMap.get(item.asset_id);
      if (!orig) return false;

      // Invariant: If classified as INSUFFICIENT_DATA, MiMo must document missing dimensions
      if (orig.classification === 'INSUFFICIENT_DATA') {
        if (!Array.isArray(item.missing_information_explanation) || item.missing_information_explanation.length === 0) {
          throw new Error(`[AG013MaterialClaimValidator] Faltan notas explícitas de información faltante para ${item.asset_id}`);
        }
      }

      // Invariant: Do not invent cost or exposure
      const text = `${item.classification_explanation} ${item.chronicity_summary} ${item.failure_burden_summary} ${item.economic_burden_summary}`;
      if (/invented_hours|8000\s*hrs|cost\s*is\s*zero/i.test(text)) {
        throw new Error(`[AG013MaterialClaimValidator] Afirmación no soportada o inventada detectada en ${item.asset_id}`);
      }
    }

    return true;
  }
}
