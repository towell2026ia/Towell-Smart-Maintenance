// supabase/functions/agents-orchestrator/agents/ag011/quality/ag011-memory-quality-engine.ts
// Deterministic Quality Engine for AG-011 (v1.0)
// Frozen under Token: AG011-QUALITY-ENGINE-001
// Invariant: Deterministic Quality Scoring & Classification (§63-70 PRD-AG-011.2)

import type { AG011MemoryEvidence, AG011MemoryQuality } from '../types/ag011.types.ts';

export class AG011MemoryQualityEngine {
  public static calculateQuality(
    evidence: AG011MemoryEvidence[],
    contradicting: AG011MemoryEvidence[] = [],
    hasConfirmedCause: boolean = false
  ): AG011MemoryQuality {
    if (!evidence || evidence.length === 0) {
      return 'INSUFFICIENT';
    }

    if (contradicting && contradicting.length > 0) {
      return 'CONFLICTING';
    }

    let score = 0;
    for (const ev of evidence) {
      if (ev.evidence_class === 'CERTIFIED_FACT') score += 40;
      else if (ev.evidence_class === 'HUMAN_CONFIRMED_CAUSE') score += 30;
      else if (ev.evidence_class === 'VALIDATED_INTERVENTION') score += 25;
      else if (ev.evidence_class === 'DOCUMENTED_OUTCOME') score += 20;
      else if (ev.evidence_class === 'DERIVED_SIGNAL') score += 10;
      else score += 5;
    }

    if (hasConfirmedCause) score += 20;

    if (score >= 70) return 'STRONG';
    if (score >= 40) return 'ADEQUATE';
    if (score >= 20) return 'PARTIAL';
    return 'INSUFFICIENT';
  }
}
