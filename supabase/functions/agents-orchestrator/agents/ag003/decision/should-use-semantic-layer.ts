// supabase/functions/agents-orchestrator/agents/ag003/decision/should-use-semantic-layer.ts
// Decision Module: Semantic Fast Path (§92-95 PRD)

export interface SemanticDecisionInput {
  isSelected: boolean;
  mimoEnabled?: boolean;
  llmCallsEnabled?: boolean;
  isTestModeDeterministicOnly?: boolean;
  hasSufficientContext?: boolean;
}

export function shouldUseSemanticLayer(input: SemanticDecisionInput): boolean {
  if (!input.isSelected) return false;
  if (input.mimoEnabled === false) return false;
  if (input.llmCallsEnabled === false) return false;
  if (input.isTestModeDeterministicOnly === true) return false;
  if (input.hasSufficientContext === false) return false;
  return true;
}
