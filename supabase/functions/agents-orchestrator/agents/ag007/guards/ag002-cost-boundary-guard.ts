// supabase/functions/agents-orchestrator/agents/ag007/guards/ag002-cost-boundary-guard.ts
// Boundary Guard between AG-002 (Preventivo) and AG-007 (Presupuestos) (v1.0)
// Frozen under Token: AG007-DETERMINISTIC-ENGINE-001
// Invariant: AG-002 is the sole authority for Planned Preventive Budget (§24-27 PRD)

export interface AG002BudgetImport {
  annual_budget_cost: number;
  monthly_budget: Record<number, { month: number; events_count: number; known_cost: number; has_unknown_prices?: boolean }>;
  weekly_budget: Record<number, { week: number; events_count: number; known_cost: number; has_unknown_prices?: boolean }>;
  budget_status: 'COMPLETE' | 'PARTIAL' | 'NO_KNOWN_PRICES';
}

export interface IngestedPreventivePlan {
  annual_planned_total: number;
  monthly_plan: Record<string, number>;
  weekly_plan: Record<string, number>;
  status: 'COMPLETE' | 'PARTIAL';
  source_agent: 'AG-002';
  immutable_timestamp: string;
}

export function ingestAG002PreventivePlan(
  ag002Output: AG002BudgetImport,
  targetYear: number = 2026
): IngestedPreventivePlan {
  if (!ag002Output || typeof ag002Output.annual_budget_cost !== 'number') {
    throw new Error('AG-002 Budget Output inválido o ausente. No se puede recalcular arbitrariamente.');
  }

  const monthlyPlan: Record<string, number> = {};
  if (ag002Output.monthly_budget) {
    for (const [mKey, mData] of Object.entries(ag002Output.monthly_budget)) {
      const mStr = String(mKey).padStart(2, '0');
      monthlyPlan[`${targetYear}-${mStr}`] = Math.round((mData.known_cost || 0) * 100) / 100;
    }
  }

  const weeklyPlan: Record<string, number> = {};
  if (ag002Output.weekly_budget) {
    for (const [wKey, wData] of Object.entries(ag002Output.weekly_budget)) {
      const wStr = String(wKey).padStart(2, '0');
      weeklyPlan[`${targetYear}-W${wStr}`] = Math.round((wData.known_cost || 0) * 100) / 100;
    }
  }

  return {
    annual_planned_total: Math.round(ag002Output.annual_budget_cost * 100) / 100,
    monthly_plan: monthlyPlan,
    weekly_plan: weeklyPlan,
    status: ag002Output.budget_status === 'COMPLETE' ? 'COMPLETE' : 'PARTIAL',
    source_agent: 'AG-002',
    immutable_timestamp: new Date().toISOString()
  };
}
