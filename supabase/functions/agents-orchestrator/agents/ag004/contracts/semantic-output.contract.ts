// supabase/functions/agents-orchestrator/agents/ag004/contracts/semantic-output.contract.ts
// Manifest: AG004-SEMANTIC-001 (Strict Output Contract for MiMo Interpretation Layer)

import { AutonomousBlock } from '../types/ag004.types.ts';

export const SEMANTIC_OUTPUT_VERSION = 'AG004-SEMANTIC-001';

export interface AutonomousSemanticOutputPayload {
  machine_id: string;
  executive_summary: string;
  historical_context_summary: string;
  pattern_codes: string[];
  inspection_focus: AutonomousBlock[];
  attention_notes: string[];
  data_quality_warnings: string[];
  technical_context: string[];
  source_references: string[];
  requires_human_review: boolean;
}

export const AG004_SEMANTIC_OUTPUT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'machine_id',
    'executive_summary',
    'historical_context_summary',
    'pattern_codes',
    'inspection_focus',
    'attention_notes',
    'data_quality_warnings',
    'technical_context',
    'source_references',
    'requires_human_review'
  ],
  properties: {
    machine_id: { type: 'string' },
    executive_summary: { type: 'string' },
    historical_context_summary: { type: 'string' },
    pattern_codes: {
      type: 'array',
      items: { type: 'string' }
    },
    inspection_focus: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['Vibración', 'Limpieza', 'Lubricación', 'Temperatura', 'Cableado']
      }
    },
    attention_notes: {
      type: 'array',
      items: { type: 'string' }
    },
    data_quality_warnings: {
      type: 'array',
      items: { type: 'string' }
    },
    technical_context: {
      type: 'array',
      items: { type: 'string' }
    },
    source_references: {
      type: 'array',
      items: { type: 'string' }
    },
    requires_human_review: { type: 'boolean' }
  }
};
