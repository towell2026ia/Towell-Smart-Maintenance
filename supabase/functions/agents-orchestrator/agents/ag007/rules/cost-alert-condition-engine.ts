// supabase/functions/agents-orchestrator/agents/ag007/rules/cost-alert-condition-engine.ts
// Deterministic Alert Condition Engine for AG-007 (v1.0)
// Frozen under Token: AG007-DETERMINISTIC-ENGINE-001
// Invariant: Structured alert conditions without LLM (§107-126 PRD)

import type { CostAlertEvent, CostPeriod } from '../types/ag007.types.ts';

export interface AlertThresholdConfig {
  budgetWarningPct: number; // default: 85.0
  budgetExceededPct: number; // default: 100.0
  costSpikeRatio: number; // default: 0.50 (+50%)
  partCostIncreaseRatio: number; // default: 0.20 (+20%)
}

export const DEFAULT_THRESHOLDS: AlertThresholdConfig = {
  budgetWarningPct: 85.0,
  budgetExceededPct: 100.0,
  costSpikeRatio: 0.50,
  partCostIncreaseRatio: 0.20
};

export function evaluateAlertConditions(params: {
  period: CostPeriod;
  actualSpend: number;
  budgetAmount: number | null;
  forecastSpend?: number | null;
  machineSpends?: Record<string, { current: number; historicalAvg: number }>;
  thresholds?: AlertThresholdConfig;
}): CostAlertEvent[] {
  const alerts: CostAlertEvent[] = [];
  const th = params.thresholds || DEFAULT_THRESHOLDS;
  const periodStr = params.period.month || String(params.period.year);

  // 1. Budget Exceeded Alert
  if (params.budgetAmount && params.budgetAmount > 0) {
    const spendPct = (params.actualSpend / params.budgetAmount) * 100;

    if (spendPct >= th.budgetExceededPct) {
      alerts.push({
        alert_id: `ALT-EXC-${periodStr}`,
        alert_code: 'BUDGET_EXCEEDED',
        severity: 'Crítica',
        period: params.period,
        message: `El gasto real acumulado ($${params.actualSpend.toFixed(2)} MXN) superó el 100% del presupuesto asignado ($${params.budgetAmount.toFixed(2)} MXN).`,
        actual_value: params.actualSpend,
        threshold_value: params.budgetAmount,
        variance_ratio: spendPct / 100,
        timestamp: new Date().toISOString(),
        idempotency_key: `IDEM-EXC-${periodStr}`
      });
    } else if (spendPct >= th.budgetWarningPct) {
      alerts.push({
        alert_id: `ALT-WARN-${periodStr}`,
        alert_code: 'BUDGET_WARNING',
        severity: 'Advertencia',
        period: params.period,
        message: `El gasto real acumulado ($${params.actualSpend.toFixed(2)} MXN) alcanzó el ${spendPct.toFixed(1)}% del presupuesto del período.`,
        actual_value: params.actualSpend,
        threshold_value: params.budgetAmount * (th.budgetWarningPct / 100),
        variance_ratio: spendPct / 100,
        timestamp: new Date().toISOString(),
        idempotency_key: `IDEM-WARN-${periodStr}`
      });
    }

    // Forecast Over Budget Alert
    if (params.forecastSpend && params.forecastSpend > params.budgetAmount) {
      alerts.push({
        alert_id: `ALT-FCST-${periodStr}`,
        alert_code: 'FORECAST_OVER_BUDGET',
        severity: 'Advertencia',
        period: params.period,
        message: `La proyección de cierre de período ($${params.forecastSpend.toFixed(2)} MXN) sobrepasa el presupuesto autorizado ($${params.budgetAmount.toFixed(2)} MXN).`,
        actual_value: params.forecastSpend,
        threshold_value: params.budgetAmount,
        timestamp: new Date().toISOString(),
        idempotency_key: `IDEM-FCST-${periodStr}`
      });
    }
  }

  // 2. Machine Cost Spike Alerts
  if (params.machineSpends) {
    for (const [machId, data] of Object.entries(params.machineSpends)) {
      if (data.historicalAvg > 0) {
        const spikeRatio = (data.current - data.historicalAvg) / data.historicalAvg;
        if (spikeRatio >= th.costSpikeRatio) {
          alerts.push({
            alert_id: `ALT-SPIKE-${machId}-${periodStr}`,
            alert_code: 'COST_SPIKE',
            severity: 'Advertencia',
            machine_id: machId,
            period: params.period,
            message: `El gasto en la máquina ${machId} ($${data.current.toFixed(2)} MXN) superó en +${(spikeRatio * 100).toFixed(1)}% su promedio histórico ($${data.historicalAvg.toFixed(2)} MXN).`,
            actual_value: data.current,
            threshold_value: data.historicalAvg * (1 + th.costSpikeRatio),
            variance_ratio: spikeRatio,
            timestamp: new Date().toISOString(),
            idempotency_key: `IDEM-SPIKE-${machId}-${periodStr}`
          });
        }
      }
    }
  }

  return alerts;
}
