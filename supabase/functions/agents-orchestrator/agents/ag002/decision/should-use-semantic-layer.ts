// supabase/functions/agents-orchestrator/agents/ag002/decision/should-use-semantic-layer.ts
// Fast Path Decision Engine for AG-002.3 (§57, §58 PRD)

import { MachinePreventiveProfile } from '../types/ag002.types.ts';

export interface SemanticCallDecision {
  shouldCall: boolean;
  reason: string;
}

export function evaluateShouldUseSemanticLayer(
  profile: MachinePreventiveProfile,
  envFlags: {
    mimoEnabled?: boolean;
    llmCallsEnabled?: boolean;
    hasApiKey?: boolean;
  }
): SemanticCallDecision {
  if (envFlags.llmCallsEnabled === false || envFlags.mimoEnabled === false) {
    return { shouldCall: false, reason: 'SEMANTIC_LAYER_DISABLED_BY_FEATURE_FLAG' };
  }

  if (envFlags.hasApiKey === false) {
    return { shouldCall: false, reason: 'MIMO_API_KEY_UNAVAILABLE' };
  }

  if (!profile.is_active || !profile.can_schedule) {
    return { shouldCall: false, reason: 'MACHINE_INACTIVE_OR_BLOCKED' };
  }

  return { shouldCall: true, reason: 'ELIGIBLE_FOR_SEMANTIC_INTERPRETATION' };
}
