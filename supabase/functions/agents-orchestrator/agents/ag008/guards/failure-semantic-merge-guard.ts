// supabase/functions/agents-orchestrator/agents/ag008/guards/failure-semantic-merge-guard.ts
// Deterministic Semantic Merge Guard for AG-008 (v1.0)
// Frozen under Token: AG008-SEMANTIC-LAYER-001
// Invariant: Deterministic values ALWAYS win; reject semantic numerical overrides.

import type { SemanticFailureInputPayload } from '../contracts/ag008-semantic-input.contract.ts';
import type { SemanticFailureOutputPayload } from '../contracts/ag008-semantic-output.contract.ts';

export interface MergeGuardReport {
  isClean: boolean;
  overridesRejectedCount: number;
  rejectedFields: string[];
  sanitizedOutput: SemanticFailureOutputPayload;
}

export function enforceFailureSemanticMergeGuard(
  deterministicInput: SemanticFailureInputPayload,
  semanticOutput: SemanticFailureOutputPayload
): MergeGuardReport {
  let overridesRejectedCount = 0;
  const rejectedFields: string[] = [];

  const sanitized: SemanticFailureOutputPayload = {
    ...semanticOutput,
    scope: deterministicInput.scope,
    target_id: deterministicInput.target_id,
    period_granularity: deterministicInput.period_granularity
  };

  // 1. Verify scope & target_id
  if (semanticOutput.scope !== deterministicInput.scope) {
    overridesRejectedCount++;
    rejectedFields.push(`scope: '${semanticOutput.scope}' -> '${deterministicInput.scope}'`);
  }
  if (semanticOutput.target_id !== deterministicInput.target_id) {
    overridesRejectedCount++;
    rejectedFields.push(`target_id: '${semanticOutput.target_id}' -> '${deterministicInput.target_id}'`);
  }

  // 2. Enforce concentration values
  if (Array.isArray(sanitized.concentration_summary)) {
    sanitized.concentration_summary = sanitized.concentration_summary.map(item => {
      const matchingMach = deterministicInput.metrics.concentration.top_machines.find(m => m.machine_id === item.name);
      if (matchingMach && item.event_count !== matchingMach.failure_count) {
        overridesRejectedCount++;
        rejectedFields.push(`concentration[${item.name}].count: ${item.event_count} -> ${matchingMach.failure_count}`);
        return {
          name: matchingMach.machine_id,
          event_count: matchingMach.failure_count,
          share_percentage: matchingMach.share_percentage
        };
      }
      return item;
    });
  }

  // 3. Completeness & warnings protection: if data quality is UNRELIABLE or PARTIAL, ensure warnings are present
  if (deterministicInput.data_quality.warnings.length > 0) {
    for (const w of deterministicInput.data_quality.warnings) {
      if (!sanitized.data_quality_warnings.includes(w)) {
        sanitized.data_quality_warnings.push(w);
      }
    }
  }

  return {
    isClean: overridesRejectedCount === 0,
    overridesRejectedCount,
    rejectedFields,
    sanitizedOutput: sanitized
  };
}
