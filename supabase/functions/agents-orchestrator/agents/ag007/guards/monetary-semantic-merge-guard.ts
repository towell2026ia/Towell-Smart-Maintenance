// supabase/functions/agents-orchestrator/agents/ag007/guards/monetary-semantic-merge-guard.ts
// Monetary Semantic Merge Guard for AG-007 (v1.0)
// Frozen under Token: AG007-SEMANTIC-LAYER-001
// Invariant: Deterministic values ALWAYS win; reject semantic monetary overrides (§74-83 PRD)

import type { SemanticInputPayload } from '../contracts/ag007-semantic-input.contract.ts';
import type { SemanticOutputPayload } from '../contracts/ag007-semantic-output.contract.ts';

export interface MonetaryMergeReport {
  isClean: boolean;
  overridesRejectedCount: number;
  rejectedFields: string[];
  sanitizedOutput: SemanticOutputPayload;
}

export function enforceMonetaryMergeGuard(
  deterministicInput: SemanticInputPayload,
  semanticOutput: SemanticOutputPayload
): MonetaryMergeReport {
  let overridesRejectedCount = 0;
  const rejected: string[] = [];

  const sanitized: SemanticOutputPayload = {
    ...semanticOutput,
    period: deterministicInput.period.month || String(deterministicInput.period.year),
    scope: deterministicInput.scope
  };

  // 1. Verify period and scope
  if (semanticOutput.period !== sanitized.period) {
    overridesRejectedCount++;
    rejected.push(`period: '${semanticOutput.period}' -> '${sanitized.period}'`);
  }

  if (semanticOutput.scope !== sanitized.scope) {
    overridesRejectedCount++;
    rejected.push(`scope: '${semanticOutput.scope}' -> '${sanitized.scope}'`);
  }

  // 2. Verify and enforce drivers amounts
  if (Array.isArray(sanitized.cost_driver_summary)) {
    sanitized.cost_driver_summary = sanitized.cost_driver_summary.map(driver => {
      // Find matching machine driver in deterministic breakdown
      const matchingMach = deterministicInput.cost_breakdown.top_machine_drivers.find(
        m => m.machine_id === driver.name
      );
      if (matchingMach && driver.amount_mxn !== matchingMach.actual_cost) {
        overridesRejectedCount++;
        rejected.push(`driver[${driver.name}].amount: ${driver.amount_mxn} -> ${matchingMach.actual_cost}`);
        return {
          ...driver,
          amount_mxn: matchingMach.actual_cost,
          percentage: matchingMach.pct_of_known
        };
      }
      return driver;
    });
  }

  // 3. Completeness protection: if deterministic is PARTIAL, ensure warning is present
  if (deterministicInput.actual.completeness === 'PARTIAL_COST_TOTAL') {
    const hasPartialWarning = sanitized.data_quality_warnings.some(w =>
      w.toLowerCase().includes('parcial') || w.toLowerCase().includes('tarifa') || w.toLowerCase().includes('incompleto')
    );
    if (!hasPartialWarning) {
      sanitized.data_quality_warnings.push('Aviso de calidad: El costo registrado representa únicamente refacciones y componentes con precio conocido (tarifa de mano de obra y costo de paros pendientes).');
    }
  }

  return {
    isClean: overridesRejectedCount === 0,
    overridesRejectedCount,
    rejectedFields: rejected,
    sanitizedOutput: sanitized
  };
}
