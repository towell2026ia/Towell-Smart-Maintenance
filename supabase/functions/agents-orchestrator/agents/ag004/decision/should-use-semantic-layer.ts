// supabase/functions/agents-orchestrator/agents/ag004/decision/should-use-semantic-layer.ts
// Fast Path Decision Engine for AG-004

import { AutonomousSemanticInputPayload } from '../contracts/semantic-input.contract.ts';
import { evaluateSemanticCallEligibility, SemanticCallEligibilityResult } from '../rules/semantic-call.rules.ts';

export function shouldUseAutonomousSemanticLayer(
  input: AutonomousSemanticInputPayload,
  isMimoEnabled: boolean = true
): SemanticCallEligibilityResult {
  return evaluateSemanticCallEligibility(input, isMimoEnabled);
}
