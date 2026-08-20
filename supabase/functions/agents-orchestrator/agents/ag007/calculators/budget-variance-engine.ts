// supabase/functions/agents-orchestrator/agents/ag007/calculators/budget-variance-engine.ts
// Budget Variance Engine for AG-007 (v1.0)
// Frozen under Token: AG007-DETERMINISTIC-ENGINE-001
// Invariant: Exact variance and division-by-zero protection (§84-95 PRD)

export interface VarianceCalculationResult {
  actual: number;
  budget: number | null;
  variance_amount: number | null;
  variance_pct: number | null;
  status: 'FAVORABLE' | 'UNFAVORABLE' | 'NEUTRAL' | 'BUDGET_NOT_AVAILABLE' | 'VARIANCE_PERCENT_NOT_APPLICABLE';
}

export function calculateBudgetVariance(
  actualSpend: number,
  budgetAmount: number | null
): VarianceCalculationResult {
  if (budgetAmount === null || budgetAmount === undefined) {
    return {
      actual: actualSpend,
      budget: null,
      variance_amount: null,
      variance_pct: null,
      status: 'BUDGET_NOT_AVAILABLE'
    };
  }

  const diff = actualSpend - budgetAmount;
  const varianceAmt = Math.round(diff * 100) / 100;

  if (budgetAmount === 0) {
    return {
      actual: actualSpend,
      budget: 0,
      variance_amount: varianceAmt,
      variance_pct: null,
      status: 'VARIANCE_PERCENT_NOT_APPLICABLE'
    };
  }

  const pct = (diff / budgetAmount) * 100;
  const variancePct = Math.round(pct * 100) / 100;

  let status: 'FAVORABLE' | 'UNFAVORABLE' | 'NEUTRAL' = 'NEUTRAL';
  if (varianceAmt > 0) status = 'UNFAVORABLE'; // Over budget
  else if (varianceAmt < 0) status = 'FAVORABLE'; // Under budget

  return {
    actual: actualSpend,
    budget: budgetAmount,
    variance_amount: varianceAmt,
    variance_pct: variancePct,
    status
  };
}
