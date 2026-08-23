// supabase/functions/agents-orchestrator/agents/ag013/contracts/ag013-output.contract.ts
// Output Package Contract for AG-013 (AG013-OUTPUT-001)
// Frozen under Token: AG013-DATA-MAP-001

import type { BadActorAnalysisPackage } from '../types/ag013.types.ts';

export const AG013OutputContract = {
  version: '1.0',
  contract_token: 'AG013-OUTPUT-001',
  validate(pkg: BadActorAnalysisPackage): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!pkg.request_id) errors.push('request_id es obligatorio');
    if (!pkg.evaluation_at) errors.push('evaluation_at es obligatorio');
    if (typeof pkg.total_assets_evaluated !== 'number') errors.push('total_assets_evaluated es obligatorio');
    if (!pkg.summary_counts) errors.push('summary_counts es obligatorio');
    if (!Array.isArray(pkg.results)) errors.push('results debe ser un arreglo');
    if (!pkg.traceability || !pkg.traceability.decision_model_sha256) {
      errors.push('traceability con decision_model_sha256 es obligatorio');
    }
    return { valid: errors.length === 0, errors };
  }
};
