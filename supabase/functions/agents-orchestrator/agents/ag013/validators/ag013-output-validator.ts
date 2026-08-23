// supabase/functions/agents-orchestrator/agents/ag013/validators/ag013-output-validator.ts
// Output Package Validator for AG-013 Analista de Malos Actores v1.0
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import { AG013OutputContract } from '../contracts/ag013-output.contract.ts';
import { AG013ClassificationContract } from '../contracts/ag013-classification.contract.ts';
import type { BadActorAnalysisPackage } from '../types/ag013.types.ts';

export class AG013OutputValidator {
  public static validate(pkg: BadActorAnalysisPackage): { valid: boolean; errors: string[] } {
    const pkgVal = AG013OutputContract.validate(pkg);
    const errors = [...pkgVal.errors];

    for (const r of pkg.results) {
      if (!AG013ClassificationContract.validate(r)) {
        errors.push(`Resultado inválido para activo ${r.asset_id}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
