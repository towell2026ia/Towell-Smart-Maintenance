// supabase/functions/agents-orchestrator/agents/ag013/semantic/ag013-semantic-schema-validator.ts
// Semantic Schema Validator for AG-013 (v1.0)
// Frozen under Token: AG013-SEMANTIC-LAYER-001

import { AG013SemanticOutputContract, type AG013SemanticOutput } from '../contracts/ag013-semantic-output.contract.ts';

export class AG013SemanticSchemaValidator {
  public static validate(output: AG013SemanticOutput): boolean {
    const val = AG013SemanticOutputContract.validate(output);
    if (!val.valid) {
      throw new Error(`[AG013SemanticSchemaValidator] Error en validación de esquema semántico: ${val.errors.join(', ')}`);
    }
    return true;
  }
}
