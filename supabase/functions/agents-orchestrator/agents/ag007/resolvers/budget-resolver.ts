// supabase/functions/agents-orchestrator/agents/ag007/resolvers/budget-resolver.ts
// Budget Resolver & Snapshot Manager for AG-007 (v1.0)
// Frozen under Token: AG007-DETERMINISTIC-ENGINE-001
// Invariant: Snapshot versioning and protection against divide-by-zero (§79-83 PRD)

import type { CostPeriod } from '../types/ag007.types.ts';

export interface BudgetSnapshot {
  budget_value: number | null;
  budget_period: string;
  budget_version: string;
  budget_source: string;
  currency: 'MXN';
  status: 'AVAILABLE' | 'BUDGET_NOT_AVAILABLE';
}

export function resolveBudgetSnapshot(
  period: CostPeriod,
  configuredBudgets: Record<string, { amount: number; version?: string; source?: string }> | null
): BudgetSnapshot {
  const periodKey = period.month || String(period.year);

  if (!configuredBudgets || !configuredBudgets[periodKey] || typeof configuredBudgets[periodKey].amount !== 'number') {
    return {
      budget_value: null,
      budget_period: periodKey,
      budget_version: 'V_UNCONFIGURED',
      budget_source: 'NONE',
      currency: 'MXN',
      status: 'BUDGET_NOT_AVAILABLE'
    };
  }

  const item = configuredBudgets[periodKey];

  return {
    budget_value: Math.round(item.amount * 100) / 100,
    budget_period: periodKey,
    budget_version: item.version || 'V2026.1_CORPORATE',
    budget_source: item.source || 'FINANZAS_TOWELL',
    currency: 'MXN',
    status: 'AVAILABLE'
  };
}
