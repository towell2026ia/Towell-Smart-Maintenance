// supabase/functions/agents-orchestrator/agents/ag003/contracts/semantic-output.contract.ts
// Canonical Semantic Output Contract for AG-003.3 (§38-41 PRD)

import { PredictiveBlock } from '../types/ag003.types.ts';
import { PredictivePatternCode } from '../catalog/pattern-catalog.ts';

export const SEMANTIC_OUTPUT_VERSION = 'AG003-SEMANTIC-001';

export interface TechnicalObservation {
  observation: string;
  source_references: string[];
}

export interface SemanticOutputPayload {
  machine_id: string;
  executive_summary: string;
  selection_explanation: string;
  pattern_codes: PredictivePatternCode[];
  quality_interpretation: string;
  historical_context_summary: string;
  inspection_focus: PredictiveBlock[];
  data_quality_warnings: string[];
  technical_observations: TechnicalObservation[];
  recommendation: string;
  source_references: string[];
  requires_human_review: boolean;
}
