// supabase/functions/agents-orchestrator/agents/ag012/semantic/ag012-semantic-schema-validator.ts
// Semantic Schema Validator enforcing Strict JSON Schema compliance (v1.0)
// Frozen under Token: AG012-SEMANTIC-OUTPUT-001

import type { AG012SemanticOutput } from '../contracts/ag012-semantic-output.contract.ts';

export class AG012SemanticSchemaValidator {
  public static validate(output: AG012SemanticOutput): void {
    if (!output) {
      throw new Error('[AG012_SEMANTIC_SCHEMA_ERROR] Respuesta semántica vacía o nula.');
    }

    const requiredFields = [
      'recommendation_echo',
      'executive_summary',
      'key_technical_drivers',
      'key_economic_drivers',
      'strategic_risks',
      'limitations_and_missing_data',
      'reevaluation_triggers',
      'cited_fact_ids'
    ];

    for (const f of requiredFields) {
      if ((output as any)[f] === undefined) {
        throw new Error(`[AG012_SEMANTIC_SCHEMA_ERROR] Campo requerido faltante en salida semántica: ${f}`);
      }
    }

    const validOptions = ['REPAIR', 'RENEW', 'REPLACE', 'INSUFFICIENT_DATA', 'HUMAN_REVIEW_REQUIRED'];
    if (!validOptions.includes(output.recommendation_echo)) {
      throw new Error(`[AG012_SEMANTIC_SCHEMA_ERROR] recommendation_echo inválido: ${output.recommendation_echo}`);
    }
  }
}
