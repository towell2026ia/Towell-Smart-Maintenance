// supabase/functions/agents-orchestrator/agents/ag011/candidates/ag011-memory-candidate-resolver.ts
// Candidate Builder & Resolver for AG-011 (v1.0)
// Frozen under Token: AG011-CANDIDATE-ENGINE-001
// Invariant: Build Structured Memory Candidates (§24-30 PRD-AG-011.2)

import { AG011CandidateEligibilityEngine } from './ag011-candidate-eligibility-engine.ts';
import type { AG011MemoryCandidate, AG011MemoryEvidence, AG011MemoryType } from '../types/ag011.types.ts';

export interface CandidateBuildParams {
  candidate_id?: string;
  title: string;
  memory_type: AG011MemoryType;
  asset_id: string;
  machine_model?: string | null;
  machine_family?: string | null;
  component_id?: string | null;
  department?: string | null;
  condition_description: string;
  validated_observations: string[];
  confirmed_root_cause?: string | null;
  validated_procedure: string;
  expected_outcome: string;
  required_parts?: string[];
  required_tools?: string[];
  safety_warnings?: string[];
  evidence_items: AG011MemoryEvidence[];
  contradicting_items?: AG011MemoryEvidence[];
  limitations?: string[];
  origin_case_ids: string[];
}

export class AG011MemoryCandidateResolver {
  public static buildCandidate(params: CandidateBuildParams): AG011MemoryCandidate {
    const eligibility = AG011CandidateEligibilityEngine.evaluate({
      source_type: 'OPERATIONAL_EVENT',
      has_confirmed_rca: Boolean(params.confirmed_root_cause),
      has_validated_intervention: Boolean(params.validated_procedure),
      evidence_items: params.evidence_items,
      contradicting_items: params.contradicting_items
    });

    if (!eligibility.isEligible) {
      throw new Error(`[AG011CandidateResolver] Evento no elegible para candidato: ${eligibility.reasons.join('; ')}`);
    }

    const candidateId = params.candidate_id || `CAND-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    return {
      candidate_id: candidateId,
      title: params.title,
      memory_type: params.memory_type,
      status: 'CANDIDATE',
      quality: eligibility.suggestedQuality,
      suggested_scope: {
        scope_level: 'ASSET_SPECIFIC',
        asset_id: params.asset_id,
        machine_model: params.machine_model || null,
        machine_family: params.machine_family || null,
        component_id: params.component_id || null,
        department: params.department || null,
        required_conditions: [],
        excluded_conditions: []
      },
      draft_content: {
        condition_description: params.condition_description,
        validated_observations: params.validated_observations || [],
        confirmed_root_cause: params.confirmed_root_cause || null,
        validated_procedure: params.validated_procedure,
        expected_outcome: params.expected_outcome,
        required_parts: params.required_parts || [],
        required_tools: params.required_tools || [],
        safety_warnings: params.safety_warnings || []
      },
      evidence: params.evidence_items,
      contradicting_evidence: params.contradicting_items || [],
      limitations: params.limitations || [],
      origin_case_ids: params.origin_case_ids,
      created_at: new Date().toISOString(),
      requires_human_review: true
    };
  }
}
