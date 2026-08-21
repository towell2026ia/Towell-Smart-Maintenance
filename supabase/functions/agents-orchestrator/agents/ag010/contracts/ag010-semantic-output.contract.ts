// supabase/functions/agents-orchestrator/agents/ag010/contracts/ag010-semantic-output.contract.ts
// Semantic Output Contract & Strict Schema for AG-010 MiMo Layer (v1.0)
// Frozen under Tokens: AG010-SEMANTIC-OUTPUT-001, AG010-SEMANTIC-RULES-001
// Invariant: Strict JSON output with additionalProperties = false (§19-22 PRD-AG-010.3)

import type { FiveWhyNode, RootCauseCandidate, RecommendedVerification, AG010EvidenceItem } from '../types/ag010.types.ts';

export interface FactSummaryItem {
  evidence_id: string;
  summary: string;
}

export interface PreviousCaseInterpretationItem {
  previous_case_id: string;
  relevance_analysis: string;
  applicability_note: string;
}

export interface AG010SemanticOutput {
  problem_summary: string;
  fact_summary: FactSummaryItem[];
  previous_case_interpretation: PreviousCaseInterpretationItem[];
  five_whys: FiveWhyNode[];
  root_cause_candidates: RootCauseCandidate[];
  contradicting_evidence: AG010EvidenceItem[];
  data_gaps: string[];
  recommended_verifications: RecommendedVerification[];
  requires_human_validation: boolean;
}

export const AG010_SEMANTIC_JSON_SCHEMA: Record<string, any> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'problem_summary',
    'fact_summary',
    'previous_case_interpretation',
    'five_whys',
    'root_cause_candidates',
    'contradicting_evidence',
    'data_gaps',
    'recommended_verifications',
    'requires_human_validation'
  ],
  properties: {
    problem_summary: { type: 'string' },
    fact_summary: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['evidence_id', 'summary'],
        properties: {
          evidence_id: { type: 'string' },
          summary: { type: 'string' }
        }
      }
    },
    previous_case_interpretation: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['previous_case_id', 'relevance_analysis', 'applicability_note'],
        properties: {
          previous_case_id: { type: 'string' },
          relevance_analysis: { type: 'string' },
          applicability_note: { type: 'string' }
        }
      }
    },
    five_whys: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['level', 'question', 'answer', 'answer_type', 'supporting_evidence_ids', 'confidence_status'],
        properties: {
          level: { type: 'integer', minimum: 1, maximum: 5 },
          question: { type: 'string' },
          answer: { type: 'string' },
          answer_type: { type: 'string', enum: ['FACT', 'HYPOTHESIS', 'UNKNOWN'] },
          supporting_evidence_ids: { type: 'array', items: { type: 'string' } },
          confidence_status: { type: 'string', enum: ['SUPPORTED', 'PARTIAL', 'UNSUPPORTED', 'CONTRADICTED'] },
          is_stop_early_node: { type: 'boolean' }
        }
      }
    },
    root_cause_candidates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['candidate_id', 'statement', 'status', 'supporting_evidence_ids', 'contradicting_evidence_ids', 'requires_human_validation'],
        properties: {
          candidate_id: { type: 'string' },
          statement: { type: 'string' },
          status: { type: 'string', enum: ['HYPOTHESIS', 'SUPPORTED_HYPOTHESIS', 'INSUFFICIENT_EVIDENCE', 'DISPROVEN'] },
          supporting_evidence_ids: { type: 'array', items: { type: 'string' } },
          contradicting_evidence_ids: { type: 'array', items: { type: 'string' } },
          inferred_from_previous_case_id: { type: ['string', 'null'] },
          requires_human_validation: { type: 'boolean' },
          confirmation_notes: { type: ['string', 'null'] }
        }
      }
    },
    contradicting_evidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['evidence_id', 'evidence_type', 'evidence_class', 'asset_id', 'occurred_at', 'fact', 'source_reference', 'quality'],
        properties: {
          evidence_id: { type: 'string' },
          evidence_type: { type: 'string' },
          evidence_class: { type: 'string' },
          asset_id: { type: 'string' },
          occurred_at: { type: 'string' },
          fact: { type: 'string' },
          raw_payload: {},
          source_reference: {
            type: 'object',
            additionalProperties: false,
            required: ['source_name', 'source_table', 'retrieved_at', 'relationship_type'],
            properties: {
              source_name: { type: 'string' },
              source_table: { type: 'string' },
              source_id: { type: ['string', 'null'] },
              retrieved_at: { type: 'string' },
              relationship_type: { type: 'string' }
            }
          },
          quality: { type: 'string' }
        }
      }
    },
    data_gaps: {
      type: 'array',
      items: { type: 'string' }
    },
    recommended_verifications: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['action_type', 'target_component', 'instruction', 'rationale'],
        properties: {
          action_type: { type: 'string', enum: ['INSPECT', 'MEASURE', 'COMPARE', 'VERIFY', 'REVIEW', 'CONFIRM'] },
          target_component: { type: 'string' },
          instruction: { type: 'string' },
          rationale: { type: 'string' }
        }
      }
    },
    requires_human_validation: { type: 'boolean' }
  }
};
