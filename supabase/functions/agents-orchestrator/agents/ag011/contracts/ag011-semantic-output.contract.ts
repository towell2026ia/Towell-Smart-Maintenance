// supabase/functions/agents-orchestrator/agents/ag011/contracts/ag011-semantic-output.contract.ts
// Semantic Output Contract for AG-011 GPT-4.1 Mini Layer (v1.0)
// Frozen under Token: AG011-SEMANTIC-OUTPUT-001
// Invariant: Strict JSON Schema with Zero Forbidden Authority Fields (§22-25 PRD-AG-011.3)

export interface AG011SemanticOutput {
  technical_summary: string;
  applicable_memories: {
    memory_id: string;
    version: string;
    applicability_status: 'DIRECTLY_APPLICABLE' | 'CONDITIONALLY_APPLICABLE' | 'NOT_APPLICABLE';
    applicability_rationale: string;
    key_procedure_steps: string[];
    critical_precautions: string[];
  }[];
  memory_comparisons: {
    memory_id_a: string;
    memory_id_b: string;
    comparison_notes: string;
    distinguishing_factors: string[];
  }[];
  applicability_explanation: string[];
  limitations_summary: string[];
  reusable_lessons: {
    lesson_id: string;
    lesson_title: string;
    core_recommendation: string;
    status: 'DRAFT' | 'SEMANTIC_SUGGESTION';
    referenced_memory_ids: string[];
  }[];
  technical_context: string[];
  data_gaps: string[];
  requires_human_review: boolean;
}

export const AG011_SEMANTIC_OUTPUT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    technical_summary: {
      type: 'string',
      description: 'Síntesis técnica clara y concisa de las lecciones aprendidas aplicables.'
    },
    applicable_memories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          memory_id: { type: 'string', description: 'ID exacto de la memoria aprobada de entrada' },
          version: { type: 'string', description: 'Versión exacta de la memoria aprobada de entrada' },
          applicability_status: {
            type: 'string',
            enum: ['DIRECTLY_APPLICABLE', 'CONDITIONALLY_APPLICABLE', 'NOT_APPLICABLE']
          },
          applicability_rationale: { type: 'string', description: 'Justificación técnica de aplicabilidad' },
          key_procedure_steps: { type: 'array', items: { type: 'string' } },
          critical_precautions: { type: 'array', items: { type: 'string' } }
        },
        required: [
          'memory_id',
          'version',
          'applicability_status',
          'applicability_rationale',
          'key_procedure_steps',
          'critical_precautions'
        ],
        additionalProperties: false
      }
    },
    memory_comparisons: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          memory_id_a: { type: 'string' },
          memory_id_b: { type: 'string' },
          comparison_notes: { type: 'string' },
          distinguishing_factors: { type: 'array', items: { type: 'string' } }
        },
        required: ['memory_id_a', 'memory_id_b', 'comparison_notes', 'distinguishing_factors'],
        additionalProperties: false
      }
    },
    applicability_explanation: {
      type: 'array',
      items: { type: 'string' },
      description: 'Explicación detallada de por qué aplican o no las memorias.'
    },
    limitations_summary: {
      type: 'array',
      items: { type: 'string' },
      description: 'Resumen estricto de todas las limitaciones operativas encontradas.'
    },
    reusable_lessons: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          lesson_id: { type: 'string' },
          lesson_title: { type: 'string' },
          core_recommendation: { type: 'string' },
          status: { type: 'string', enum: ['DRAFT', 'SEMANTIC_SUGGESTION'] },
          referenced_memory_ids: { type: 'array', items: { type: 'string' } }
        },
        required: ['lesson_id', 'lesson_title', 'core_recommendation', 'status', 'referenced_memory_ids'],
        additionalProperties: false
      }
    },
    technical_context: {
      type: 'array',
      items: { type: 'string' },
      description: 'Puntos clave de contexto técnico relevante.'
    },
    data_gaps: {
      type: 'array',
      items: { type: 'string' },
      description: 'Información faltante o ambigüedades técnicas detectadas.'
    },
    requires_human_review: {
      type: 'boolean',
      description: 'Si la aplicación de estas memorias requiere supervisión humana adicional.'
    }
  },
  required: [
    'technical_summary',
    'applicable_memories',
    'memory_comparisons',
    'applicability_explanation',
    'limitations_summary',
    'reusable_lessons',
    'technical_context',
    'data_gaps',
    'requires_human_review'
  ],
  additionalProperties: false
};
