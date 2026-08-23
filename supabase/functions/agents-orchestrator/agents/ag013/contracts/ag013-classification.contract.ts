// supabase/functions/agents-orchestrator/agents/ag013/contracts/ag013-classification.contract.ts
// Bad Actor Classification & Ranking Contract (AG013-CLASSIFICATION-001)
// Frozen under Token: AG013-DATA-MAP-001

import type { AssetBadActorResult, BadActorClassificationCode } from '../types/ag013.types.ts';

export const AG013ClassificationContract = {
  version: '1.0',
  contract_token: 'AG013-CLASSIFICATION-001',
  valid_classifications: [
    'NOT_BAD_ACTOR',
    'WATCHLIST',
    'BAD_ACTOR',
    'SEVERE_BAD_ACTOR',
    'INSUFFICIENT_DATA'
  ] as BadActorClassificationCode[],
  validate(result: AssetBadActorResult): boolean {
    return (
      typeof result.asset_id === 'string' &&
      this.valid_classifications.includes(result.classification) &&
      typeof result.rank === 'number' &&
      result.rank >= 1 &&
      typeof result.bad_actor_score === 'number' &&
      result.bad_actor_score >= 0 &&
      result.bad_actor_score <= 100 &&
      Array.isArray(result.hard_rules_triggered) &&
      Array.isArray(result.conflicts_identified) &&
      Array.isArray(result.key_drivers) &&
      result.data_sufficiency !== undefined &&
      typeof result.requires_engineering_review === 'boolean'
    );
  }
};
