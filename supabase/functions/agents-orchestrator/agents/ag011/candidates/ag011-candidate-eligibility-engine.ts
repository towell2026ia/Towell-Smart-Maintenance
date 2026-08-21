// supabase/functions/agents-orchestrator/agents/ag011/candidates/ag011-candidate-eligibility-engine.ts
// Candidate Eligibility Engine for AG-011 (v1.0)
// Frozen under Token: AG011-CANDIDATE-ENGINE-001
// Invariant: Deterministic Validation of Candidate Eligibility (§31-34 PRD-AG-011.2)

import type { AG011MemoryEvidence } from '../types/ag011.types.ts';

export interface EligibilityResult {
  isEligible: boolean;
  reasons: string[];
  suggestedQuality: 'STRONG' | 'ADEQUATE' | 'PARTIAL' | 'INSUFFICIENT';
}

export class AG011CandidateEligibilityEngine {
  public static evaluate(params: {
    source_type: string;
    has_confirmed_rca?: boolean;
    has_validated_intervention?: boolean;
    evidence_items: AG011MemoryEvidence[];
    contradicting_items?: AG011MemoryEvidence[];
  }): EligibilityResult {
    const reasons: string[] = [];

    // 1. Minimum Evidence Check
    if (!params.evidence_items || params.evidence_items.length === 0) {
      return {
        isEligible: false,
        reasons: ['No se encontraron piezas de evidencia válidas en el expediente.'],
        suggestedQuality: 'INSUFFICIENT'
      };
    }

    // 2. Reject pure AI hypothesis without human confirmation
    const hasOnlyHypothesis = params.evidence_items.every(e => e.evidence_class === 'MODEL_HYPOTHESIS');
    if (hasOnlyHypothesis && !params.has_confirmed_rca) {
      return {
        isEligible: false,
        reasons: ['Una hipótesis de IA no confirmada no es elegible como candidato a memoria técnica.'],
        suggestedQuality: 'INSUFFICIENT'
      };
    }

    // 3. Determine Quality Tier
    let quality: 'STRONG' | 'ADEQUATE' | 'PARTIAL' | 'INSUFFICIENT' = 'PARTIAL';
    const hasCertifiedFact = params.evidence_items.some(e => e.evidence_class === 'CERTIFIED_FACT');
    const hasConfirmedCause = params.evidence_items.some(e => e.evidence_class === 'HUMAN_CONFIRMED_CAUSE') || params.has_confirmed_rca;
    const hasIntervention = params.evidence_items.some(e => e.evidence_class === 'VALIDATED_INTERVENTION') || params.has_validated_intervention;
    const hasContradictions = (params.contradicting_items && params.contradicting_items.length > 0);

    if (hasConfirmedCause && hasIntervention && !hasContradictions) {
      quality = 'STRONG';
      reasons.push('Causa confirmada e intervención validada sin contradicciones.');
    } else if ((hasCertifiedFact || hasIntervention) && !hasContradictions) {
      quality = 'ADEQUATE';
      reasons.push('Evidencia fáctica e intervención documentada.');
    } else if (hasContradictions) {
      quality = 'PARTIAL';
      reasons.push('Existen evidencias contradictorias documentadas.');
    }

    return {
      isEligible: true,
      reasons,
      suggestedQuality: quality
    };
  }
}
