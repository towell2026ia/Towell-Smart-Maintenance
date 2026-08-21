// supabase/functions/agents-orchestrator/agents/ag011/decision/should-use-memory-semantic-layer.ts
// Semantic Fast Path Decision Engine for AG-011 (v1.0)
// Frozen under Token: AG011-SEMANTIC-RULES-001
// Invariant: Zero Token Consumption on Empty/Inapplicable Retrievals (§81-86 PRD-AG-011.3)

import type { AG011MemoryRetrievalOutput } from '../types/ag011.types.ts';
import type { AG011SemanticOutput } from '../contracts/ag011-semantic-output.contract.ts';

export interface SemanticDecisionResult {
  shouldCallProvider: boolean;
  reason: string;
  fastPathOutput?: AG011SemanticOutput;
}

export class AG011SemanticDecisionEngine {
  public static evaluate(retrievalOutput: AG011MemoryRetrievalOutput): SemanticDecisionResult {
    // 1. Fast Path: No memories retrieved
    if (!retrievalOutput.memories || retrievalOutput.memories.length === 0) {
      return {
        shouldCallProvider: false,
        reason: 'No se recuperaron memorias técnicas aplicables para el contexto consultado.',
        fastPathOutput: {
          technical_summary: 'No existen lecciones aprendidas ni memorias técnicas aprobadas aplicables para este activo/condición en el repositorio.',
          applicable_memories: [],
          memory_comparisons: [],
          applicability_explanation: ['La búsqueda determinística en el catálogo de memoria no arrojó coincidencias de alcance ni condición.'],
          limitations_summary: [],
          reusable_lessons: [],
          technical_context: ['Sin antecedentes históricos aprobados.'],
          data_gaps: ['Se recomienda documentar y formalizar un análisis RCA o lección técnica si la avería se soluciona.'],
          requires_human_review: false
        }
      };
    }

    return {
      shouldCallProvider: true,
      reason: `Se recuperaron ${retrievalOutput.memories.length} memorias técnicas aprobadas aplicables para síntesis semántica.`
    };
  }
}
