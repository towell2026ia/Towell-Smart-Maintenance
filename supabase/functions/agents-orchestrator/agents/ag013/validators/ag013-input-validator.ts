// supabase/functions/agents-orchestrator/agents/ag013/validators/ag013-input-validator.ts
// Input Validator for AG-013 Analista de Malos Actores v1.0
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import { AG013InputContract } from '../contracts/ag013-input.contract.ts';
import type { BadActorAnalysisRequest } from '../types/ag013.types.ts';

export class AG013InputValidator {
  public static validate(request: BadActorAnalysisRequest): { valid: boolean; errors: string[] } {
    return AG013InputContract.validate(request);
  }
}
