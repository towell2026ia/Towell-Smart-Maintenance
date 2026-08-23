// supabase/functions/agents-orchestrator/agents/ag013/classification/ag013-classification-engine.ts
// Bad Actor Classification Engine for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import type { BadActorClassificationCode } from '../types/ag013.types.ts';
import { AG013BadActorConfigRegistry } from '../config/ag013-bad-actor-config-registry.ts';

export class AG013ClassificationEngine {
  public static classify(
    score: number,
    isEligible: boolean,
    hardRuleForcedClassification?: BadActorClassificationCode | null
  ): BadActorClassificationCode {
    if (hardRuleForcedClassification) {
      return hardRuleForcedClassification;
    }

    if (!isEligible) {
      return 'INSUFFICIENT_DATA';
    }

    const t = AG013BadActorConfigRegistry.THRESHOLDS;

    if (score >= t.severe_bad_actor_min) {
      return 'SEVERE_BAD_ACTOR';
    } else if (score >= t.bad_actor_min) {
      return 'BAD_ACTOR';
    } else if (score >= t.watchlist_min) {
      return 'WATCHLIST';
    } else {
      return 'NOT_BAD_ACTOR';
    }
  }
}
