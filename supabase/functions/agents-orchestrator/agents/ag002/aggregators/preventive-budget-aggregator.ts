// supabase/functions/agents-orchestrator/agents/ag002/aggregators/preventive-budget-aggregator.ts
// Budget Aggregator for weekly, monthly, and annual preventive parts (§53-58 PRD)

import { BudgetStatus, BudgetSummary, PlannedPreventiveSlot } from '../types/ag002.types.ts';

export function aggregatePreventiveBudget(slots: PlannedPreventiveSlot[]): BudgetSummary {
  const weeklyBudget: Record<number, { week: number; events_count: number; known_cost: number; has_unknown_prices: boolean }> = {};
  const monthlyBudget: Record<number, { month: number; events_count: number; known_cost: number; has_unknown_prices: boolean }> = {};

  let annualTotalCost = 0;
  let totalPartsCount = 0;
  let unknownItemsCount = 0;
  let knownItemsCount = 0;

  for (const s of slots) {
    const w = s.week_number;
    const m = s.month_number;

    if (!weeklyBudget[w]) {
      weeklyBudget[w] = { week: w, events_count: 0, known_cost: 0, has_unknown_prices: false };
    }
    if (!monthlyBudget[m]) {
      monthlyBudget[m] = { month: m, events_count: 0, known_cost: 0, has_unknown_prices: false };
    }

    weeklyBudget[w].events_count++;
    weeklyBudget[w].known_cost += s.parts_cost_known;
    if (s.budget_status !== 'COMPLETE') weeklyBudget[w].has_unknown_prices = true;

    monthlyBudget[m].events_count++;
    monthlyBudget[m].known_cost += s.parts_cost_known;
    if (s.budget_status !== 'COMPLETE') monthlyBudget[m].has_unknown_prices = true;

    annualTotalCost += s.parts_cost_known;
    totalPartsCount += s.planned_parts.reduce((acc, p) => acc + p.cantidad, 0);

    for (const p of s.planned_parts) {
      if (typeof p.costo_unitario === 'number') {
        knownItemsCount++;
      } else {
        unknownItemsCount++;
      }
    }
  }

  // Round values
  annualTotalCost = Math.round(annualTotalCost * 100) / 100;
  for (const k of Object.keys(weeklyBudget)) {
    weeklyBudget[Number(k)].known_cost = Math.round(weeklyBudget[Number(k)].known_cost * 100) / 100;
  }
  for (const k of Object.keys(monthlyBudget)) {
    monthlyBudget[Number(k)].known_cost = Math.round(monthlyBudget[Number(k)].known_cost * 100) / 100;
  }

  let globalBudgetStatus: BudgetStatus = 'COMPLETE';
  if (unknownItemsCount > 0 && knownItemsCount > 0) {
    globalBudgetStatus = 'PARTIAL';
  } else if (unknownItemsCount > 0 && knownItemsCount === 0) {
    globalBudgetStatus = 'NO_KNOWN_PRICES';
  }

  return {
    weekly_budget: weeklyBudget,
    monthly_budget: monthlyBudget,
    annual_total_known_cost: annualTotalCost,
    annual_total_events: slots.length,
    total_parts_estimated: totalPartsCount,
    budget_status: globalBudgetStatus,
    unknown_cost_items_count: unknownItemsCount
  };
}
