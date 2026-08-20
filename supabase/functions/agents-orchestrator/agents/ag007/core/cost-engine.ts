// supabase/functions/agents-orchestrator/agents/ag007/core/cost-engine.ts
// Master Deterministic Cost Engine for AG-007 (v1.0)
// Frozen under Token: AG007-DETERMINISTIC-ENGINE-001
// Invariant: Full deterministic orchestration without LLM (§1-5, §202-203 PRD)

import type { EconomicEvent, CostPeriod, PeriodBudgetSummary, CostAlertEvent } from '../types/ag007.types.ts';
import { validateCurrency } from '../guards/currency-guard.ts';
import { resolveCostPeriod } from '../resolvers/cost-period-resolver.ts';
import { classifyCostDomain } from '../classifiers/cost-domain-classifier.ts';
import { resolveMachineAttribution, type MachineCatalogItem } from '../attributors/cost-attribution-engine.ts';
import { deduplicateEconomicEvents } from '../dedupers/economic-event-dedupe.ts';
import { aggregateCostPeriod, type PeriodAggregationResult } from '../aggregators/cost-period-aggregator.ts';
import { resolveBudgetSnapshot, type BudgetSnapshot } from '../resolvers/budget-resolver.ts';
import { calculateBudgetVariance, type VarianceCalculationResult } from '../calculators/budget-variance-engine.ts';
import { calculateDeterministicForecast, type ForecastResult } from '../calculators/deterministic-cost-forecast.ts';
import { evaluateAlertConditions, type AlertThresholdConfig } from '../rules/cost-alert-condition-engine.ts';
import { evaluateCostCompleteness } from '../completeness/cost-completeness-engine.ts';

export interface CostEngineExecutionResult {
  periodKey: string;
  period: CostPeriod;
  aggregation: PeriodAggregationResult;
  budgetSnapshot: BudgetSnapshot;
  variance: VarianceCalculationResult;
  forecast: ForecastResult;
  alerts: CostAlertEvent[];
  costCompleteness: 'COMPLETE' | 'PARTIAL_COST_TOTAL' | 'NOT_AVAILABLE';
  execution_duration_ms: number;
}

export class DeterministicCostEngine {
  private machineCatalog: MachineCatalogItem[] = [];
  private alertThresholds: AlertThresholdConfig | undefined;

  constructor(machineCatalog: MachineCatalogItem[] = [], thresholds?: AlertThresholdConfig) {
    this.machineCatalog = machineCatalog;
    this.alertThresholds = thresholds;
  }

  public buildEconomicEvent(
    sourceTable: string,
    sourceRecordId: string,
    rawRow: Record<string, any>
  ): EconomicEvent {
    const rawDate = rawRow.fecha || rawRow.fecha_inicio || rawRow.created_at;
    const { dateStr, period } = resolveCostPeriod(rawDate);
    const currCheck = validateCurrency(rawRow.moneda || 'MXN');
    const { cost_domain, maintenance_type } = classifyCostDomain(sourceTable, rawRow);

    const rawLoc = rawRow.maquina_id || rawRow.localidad || rawRow.destino;
    const { machine_id, department } = resolveMachineAttribution(rawLoc, this.machineCatalog);

    const cant = parseFloat(rawRow.cantidad_estandar || rawRow.cantidad || 1) || 1;
    const unitPrice = rawRow.precio_costo_unitario !== undefined && rawRow.precio_costo_unitario !== null && rawRow.precio_costo_unitario !== ''
      ? parseFloat(rawRow.precio_costo_unitario)
      : (rawRow.costo_unitario !== undefined && rawRow.costo_unitario !== null ? parseFloat(rawRow.costo_unitario) : null);

    const totalAmt = unitPrice !== null && !isNaN(unitPrice) ? Math.round(cant * unitPrice * 100) / 100 : null;
    const reportedTotal = rawRow.importe_costo_origen ? parseFloat(rawRow.importe_costo_origen) : null;

    const eventId = `ECO-${dateStr.replace(/-/g, '')}-${sourceTable.substring(0, 4)}-${sourceRecordId.substring(0, 8)}`;

    return {
      economic_event_id: eventId,
      source_table: sourceTable,
      source_record_id: sourceRecordId,
      date: dateStr,
      period,
      department,
      machine_id,
      work_order_folio: rawRow.folio || rawRow.orden_trabajo || null,
      maintenance_type,
      cost_origin: cost_domain,
      cost_status: 'ACTUAL',
      part_code: rawRow.codigo_articulo || null,
      part_name: rawRow.nombre_articulo || null,
      quantity: cant,
      unit_cost: unitPrice,
      total_amount: totalAmt,
      reported_total: reportedTotal,
      currency: currCheck.currency as 'MXN',
      cost_provenance: `SOURCE_${sourceTable.toUpperCase()}`,
      is_complete: totalAmt !== null
    };
  }

  public processPeriod(
    period: CostPeriod,
    rawEvents: EconomicEvent[],
    plannedPreventiveBudget: number = 0,
    configuredBudgets: Record<string, { amount: number; version?: string; source?: string }> | null = null,
    forecastContext?: { daysElapsed: number; totalDays: number }
  ): CostEngineExecutionResult {
    const startTime = Date.now();
    const periodKey = period.month || String(period.year);

    // 1. Deduplication
    const { uniqueEvents } = deduplicateEconomicEvents(rawEvents);

    // 2. Aggregation
    const aggregation = aggregateCostPeriod(periodKey, uniqueEvents, plannedPreventiveBudget);

    // 3. Budget Resolution
    const budgetSnapshot = resolveBudgetSnapshot(period, configuredBudgets);

    // 4. Variance Calculation
    const variance = calculateBudgetVariance(aggregation.actual_total, budgetSnapshot.budget_value);

    // 5. Forecast Calculation
    const daysElapsed = forecastContext?.daysElapsed || 20;
    const totalDays = forecastContext?.totalDays || 30;
    const forecast = calculateDeterministicForecast({
      actualSpendToDate: aggregation.actual_total,
      daysElapsed,
      totalDaysInPeriod: totalDays,
      plannedRemainingPreventive: 0,
      committedCosts: aggregation.committed_total
    });

    // 6. Alert Condition Evaluation
    const machineSpends: Record<string, { current: number; historicalAvg: number }> = {};
    for (const [mach, sum] of Object.entries(aggregation.by_machine)) {
      machineSpends[mach] = {
        current: sum.known_cost_total,
        historicalAvg: sum.known_cost_total * 0.7 // Deterministic reference for evaluation
      };
    }

    const alerts = evaluateAlertConditions({
      period,
      actualSpend: aggregation.actual_total,
      budgetAmount: budgetSnapshot.budget_value,
      forecastSpend: forecast.forecastTotal,
      machineSpends,
      thresholds: this.alertThresholds
    });

    // 7. Cost Completeness Evaluation
    const completeness = evaluateCostCompleteness([
      { domain: 'PART', status: aggregation.by_domain.PART.unknown_count > 0 ? 'PARTIAL' : 'COMPLETE', knownAmount: aggregation.by_domain.PART.amount, unknownCount: aggregation.by_domain.PART.unknown_count },
      { domain: 'LABOR', status: 'NOT_AVAILABLE', knownAmount: 0, unknownCount: 0 },
      { domain: 'DOWNTIME', status: 'NOT_AVAILABLE', knownAmount: 0, unknownCount: 0 },
      { domain: 'SERVICE', status: 'COMPLETE', knownAmount: aggregation.by_domain.SERVICE.amount, unknownCount: 0 },
      { domain: 'OTHER', status: 'COMPLETE', knownAmount: aggregation.by_domain.OTHER.amount, unknownCount: 0 }
    ]);

    const duration = Date.now() - startTime;

    return {
      periodKey,
      period,
      aggregation,
      budgetSnapshot,
      variance,
      forecast,
      alerts,
      costCompleteness: completeness.overallCompleteness,
      execution_duration_ms: duration
    };
  }
}
