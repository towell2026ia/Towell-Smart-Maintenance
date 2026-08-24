// supabase/functions/agents-orchestrator/agents/ag007/calculators/preventive-material-budget-engine.ts
// Master Canonical Preventive Material Budget Engine for AG-007 (PRD-AG007-R1)
// Single Calculation Authority: Deterministic mathematical calculation of planned spare parts.

import { resolvePreventiveBudgetPeriod, type PreventiveBudgetPeriod } from '../resolvers/budget-period-resolver.ts';
import type {
  PreventiveBudgetEngineInput,
  PreventiveBudgetEngineOutput,
  PreventiveItemBudgetResult,
  PricedPartLine,
  MonthlyPreventiveBudgetResult,
  AreaBudgetSummary,
  BudgetCoverageStatus,
  PriceStatus,
  QuantityStatus
} from '../contracts/ag007-preventive-budget.contract.ts';

export const AG007_BUDGET_ENGINE_VERSION = '1.0.0-PRD-AG007-R1';

/**
 * Calculates the canonical preventive parts budget deterministically.
 * Rules:
 *  1. planned_part_cost = planned_quantity * reference_unit_price
 *  2. Missing price is NOT converted to $0; marked as UNKNOWN_PRICE and PARTIAL coverage.
 *  3. Missing quantity is NOT assumed as 1; marked as MISSING.
 *  4. Labor is explicitly NOT_IN_SCOPE (no $0).
 *  5. Dynamic asset count (active_applicable_machine_count) based on runtime input.
 *  6. Single calculation authority: SQL view and frontend consume this canonical calculation.
 */
export function calculatePreventiveMaterialBudget(input: PreventiveBudgetEngineInput): PreventiveBudgetEngineOutput {
  const calculatedAt = new Date().toISOString();
  const corrId = input.correlation_id || `CORR-BUDGET-${Date.now()}`;
  const budgetRunId = input.budget_run_id || `RUN-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase();

  // 1. Resolve period with server-side authority
  const period: PreventiveBudgetPeriod = resolvePreventiveBudgetPeriod(input.reference_date);

  // 2. Dynamic active applicable machine count (Runtime source of truth, 0 hardcoded logic)
  const activeMachines = (input.active_machines || []).filter(m => m && m.activo !== false);
  const activeApplicableMachineCount = activeMachines.length;

  // 3. Price catalog lookup map
  const priceMap = new Map<string, number>();
  for (const p of input.price_catalog || []) {
    const code = String(p.codigo_articulo || '').trim().toUpperCase();
    const rawPrice = p.precio_costo_unitario !== undefined && p.precio_costo_unitario !== null
      ? p.precio_costo_unitario
      : p.costo_unitario;
    if (code && typeof rawPrice === 'number' && !isNaN(rawPrice) && rawPrice > 0) {
      priceMap.set(code, rawPrice);
    }
  }

  // 4. Process each preventive schedule item and evaluate planned parts
  const evaluatedPreventives: PreventiveItemBudgetResult[] = [];

  for (const prev of input.preventive_schedule_items || []) {
    const schedDate = String(prev.scheduled_date || '').substring(0, 10);
    const schedMonth = schedDate.substring(0, 7); // YYYY-MM

    let prevBudget = 0;
    let pricedCount = 0;
    let missingPriceCount = 0;
    let missingQtyCount = 0;
    const pricedParts: PricedPartLine[] = [];

    for (const part of prev.planned_parts || []) {
      const partCode = String(part.part_code || '').trim().toUpperCase();
      const partName = part.part_name || partCode;
      const uom = part.unit_of_measure || 'PZA';
      const qSource = part.quantity_source || 'SERVICE_DEFAULT';

      // Quantity validation (§54 PRD: No silent guessing 1 if missing)
      let qty = part.planned_quantity;
      let qStatus: QuantityStatus = part.quantity_status || 'KNOWN_QUANTITY';

      if (qty === null || qty === undefined || isNaN(qty) || qty <= 0) {
        qStatus = 'MISSING';
        qty = 0;
        missingQtyCount++;
      }

      // Price lookup (§55-60 PRD: No LLM, no external lookup, missing price is NOT $0)
      const directPrice = typeof part.reference_unit_price === 'number' && !isNaN(part.reference_unit_price) && part.reference_unit_price > 0
        ? part.reference_unit_price
        : undefined;
      const lookupPrice = priceMap.get(partCode) !== undefined ? priceMap.get(partCode) : directPrice;
      let unitPrice: number | null = null;
      let priceStatus: PriceStatus = 'UNKNOWN_PRICE';
      let partCost: number | null = null;

      if (lookupPrice !== undefined && lookupPrice !== null && lookupPrice > 0) {
        unitPrice = lookupPrice;
        priceStatus = 'KNOWN_PRICE';
        pricedCount++;
        if (qStatus !== 'MISSING') {
          partCost = Math.round(qty * unitPrice * 100) / 100;
          prevBudget += partCost;
        }
      } else {
        missingPriceCount++;
        priceStatus = 'UNKNOWN_PRICE';
      }

      pricedParts.push({
        part_id: part.part_id,
        part_code: partCode,
        part_name: partName,
        planned_quantity: qty,
        unit_of_measure: uom,
        reference_unit_price: unitPrice,
        planned_part_cost: partCost,
        price_source: unitPrice !== null ? 'CATALOG_REFERENCE' : 'MISSING_PRICE',
        price_effective_at: calculatedAt,
        price_status: priceStatus,
        quantity_status: qStatus,
        quantity_source: qSource
      });
    }

    const totalLines = pricedParts.length;
    const coveragePct = totalLines > 0 ? Math.round((pricedCount / totalLines) * 10000) / 100 : 100;
    let bStatus: BudgetCoverageStatus = 'COMPLETE';
    if (totalLines === 0) {
      bStatus = 'NO_DATA';
    } else if (missingPriceCount > 0) {
      bStatus = pricedCount > 0 ? 'PARTIAL' : 'NO_DATA';
    }

    evaluatedPreventives.push({
      preventive_id: prev.preventive_id,
      asset_id: prev.asset_id,
      area_code: String(prev.area_code || 'PF').toUpperCase().trim(),
      scheduled_date: schedDate,
      scheduled_month: schedMonth,
      service_code: prev.service_code,
      service_name: prev.service_name,
      parts_lines: pricedParts,
      preventive_material_budget: Math.round(prevBudget * 100) / 100,
      priced_lines_count: pricedCount,
      missing_price_lines_count: missingPriceCount,
      missing_quantity_lines_count: missingQtyCount,
      coverage_pct: coveragePct,
      budget_status: bStatus,
      labor_cost_status: 'NOT_IN_SCOPE'
    });
  }

  // 5. Aggregate Monthly Distribution strictly within period.months
  const monthlyResults: MonthlyPreventiveBudgetResult[] = [];
  let periodMaterialBudgetTotal = 0;
  let periodPricedLines = 0;
  let periodMissingPrices = 0;
  let periodMissingQty = 0;
  let currentMonthBudget = 0;

  const periodAreaSummary: Record<string, AreaBudgetSummary> = {
    PF: { area_code: 'PF', preventives_count: 0, assets_count: 0, material_budget: 0, priced_lines_count: 0, missing_price_lines_count: 0, coverage_pct: 100, status: 'COMPLETE' },
    CF: { area_code: 'CF', preventives_count: 0, assets_count: 0, material_budget: 0, priced_lines_count: 0, missing_price_lines_count: 0, coverage_pct: 100, status: 'COMPLETE' },
    TF: { area_code: 'TF', preventives_count: 0, assets_count: 0, material_budget: 0, priced_lines_count: 0, missing_price_lines_count: 0, coverage_pct: 100, status: 'COMPLETE' },
    AF: { area_code: 'AF', preventives_count: 0, assets_count: 0, material_budget: 0, priced_lines_count: 0, missing_price_lines_count: 0, coverage_pct: 100, status: 'COMPLETE' }
  };

  for (let i = 0; i < period.months.length; i++) {
    const monthStr = period.months[i];
    const monthLabel = period.month_labels[i] || monthStr;
    const isCurrent = monthStr === period.current_month;

    // Filter preventives falling in this month
    const monthPreventives = evaluatedPreventives.filter(p => p.scheduled_month === monthStr);
    const uniqueAssets = new Set(monthPreventives.map(p => p.asset_id));
    const uniqueServices = new Set(monthPreventives.map(p => p.service_code));

    let monthBudget = 0;
    let monthPriced = 0;
    let monthMissingPrice = 0;
    let monthMissingQty = 0;
    let monthPartLines = 0;
    let monthPartQty = 0;

    const areaMonthMap: Record<string, AreaBudgetSummary> = {
      PF: { area_code: 'PF', preventives_count: 0, assets_count: 0, material_budget: 0, priced_lines_count: 0, missing_price_lines_count: 0, coverage_pct: 100, status: 'COMPLETE' },
      CF: { area_code: 'CF', preventives_count: 0, assets_count: 0, material_budget: 0, priced_lines_count: 0, missing_price_lines_count: 0, coverage_pct: 100, status: 'COMPLETE' },
      TF: { area_code: 'TF', preventives_count: 0, assets_count: 0, material_budget: 0, priced_lines_count: 0, missing_price_lines_count: 0, coverage_pct: 100, status: 'COMPLETE' },
      AF: { area_code: 'AF', preventives_count: 0, assets_count: 0, material_budget: 0, priced_lines_count: 0, missing_price_lines_count: 0, coverage_pct: 100, status: 'COMPLETE' }
    };

    for (const prev of monthPreventives) {
      monthBudget += prev.preventive_material_budget;
      monthPriced += prev.priced_lines_count;
      monthMissingPrice += prev.missing_price_lines_count;
      monthMissingQty += prev.missing_quantity_lines_count;
      monthPartLines += prev.parts_lines.length;

      for (const line of prev.parts_lines) {
        monthPartQty += line.planned_quantity;
      }

      // Area summary for month
      const a = prev.area_code;
      if (areaMonthMap[a]) {
        areaMonthMap[a].preventives_count++;
        areaMonthMap[a].material_budget += prev.preventive_material_budget;
        areaMonthMap[a].priced_lines_count += prev.priced_lines_count;
        areaMonthMap[a].missing_price_lines_count += prev.missing_price_lines_count;
      }
      if (periodAreaSummary[a]) {
        periodAreaSummary[a].preventives_count++;
        periodAreaSummary[a].material_budget += prev.preventive_material_budget;
        periodAreaSummary[a].priced_lines_count += prev.priced_lines_count;
        periodAreaSummary[a].missing_price_lines_count += prev.missing_price_lines_count;
      }
    }

    // Compute area coverage for month
    for (const a of Object.keys(areaMonthMap)) {
      const tot = areaMonthMap[a].priced_lines_count + areaMonthMap[a].missing_price_lines_count;
      areaMonthMap[a].coverage_pct = tot > 0 ? Math.round((areaMonthMap[a].priced_lines_count / tot) * 10000) / 100 : 100;
      areaMonthMap[a].material_budget = Math.round(areaMonthMap[a].material_budget * 100) / 100;
      areaMonthMap[a].status = areaMonthMap[a].missing_price_lines_count > 0 ? (areaMonthMap[a].priced_lines_count > 0 ? 'PARTIAL' : 'NO_DATA') : 'COMPLETE';
    }

    const totalMonthLines = monthPriced + monthMissingPrice;
    const monthCoverage = totalMonthLines > 0 ? Math.round((monthPriced / totalMonthLines) * 10000) / 100 : 100;
    const monthStatus: BudgetCoverageStatus = totalMonthLines === 0 ? 'NO_DATA' : (monthMissingPrice > 0 ? (monthPriced > 0 ? 'PARTIAL' : 'NO_DATA') : 'COMPLETE');

    const roundedMonthBudget = Math.round(monthBudget * 100) / 100;

    monthlyResults.push({
      year: parseInt(monthStr.substring(0, 4), 10),
      month: monthStr,
      month_label: monthLabel,
      is_current_month: isCurrent,
      preventive_count: monthPreventives.length,
      asset_count: uniqueAssets.size,
      service_count: uniqueServices.size,
      planned_part_lines_total: monthPartLines,
      planned_part_quantity_total: monthPartQty,
      material_budget: roundedMonthBudget,
      priced_lines_count: monthPriced,
      missing_price_lines_count: monthMissingPrice,
      missing_quantity_lines_count: monthMissingQty,
      budget_coverage_pct: monthCoverage,
      budget_status: monthStatus,
      by_area: areaMonthMap,
      drilldown_preventives: monthPreventives,
      labor_cost_status: 'NOT_IN_SCOPE'
    });

    periodMaterialBudgetTotal += roundedMonthBudget;
    periodPricedLines += monthPriced;
    periodMissingPrices += monthMissingPrice;
    periodMissingQty += monthMissingQty;

    if (isCurrent) {
      currentMonthBudget = roundedMonthBudget;
    }
  }

  // 6. Compute period area coverage
  for (const a of Object.keys(periodAreaSummary)) {
    const tot = periodAreaSummary[a].priced_lines_count + periodAreaSummary[a].missing_price_lines_count;
    periodAreaSummary[a].coverage_pct = tot > 0 ? Math.round((periodAreaSummary[a].priced_lines_count / tot) * 10000) / 100 : 100;
    periodAreaSummary[a].material_budget = Math.round(periodAreaSummary[a].material_budget * 100) / 100;
    periodAreaSummary[a].status = periodAreaSummary[a].missing_price_lines_count > 0 ? (periodAreaSummary[a].priced_lines_count > 0 ? 'PARTIAL' : 'NO_DATA') : 'COMPLETE';
  }

  const totalPeriodLines = periodPricedLines + periodMissingPrices;
  const periodCoverage = totalPeriodLines > 0 ? Math.round((periodPricedLines / totalPeriodLines) * 10000) / 100 : 100;
  const periodStatus: BudgetCoverageStatus = totalPeriodLines === 0 ? 'NO_DATA' : (periodMissingPrices > 0 ? (periodPricedLines > 0 ? 'PARTIAL' : 'NO_DATA') : 'COMPLETE');

  return {
    engine_version: AG007_BUDGET_ENGINE_VERSION,
    budget_run_id: budgetRunId,
    correlation_id: corrId,
    calculated_at: calculatedAt,
    budget_type: 'PREVENTIVE_PARTS_FORECAST',
    period,
    active_applicable_machine_count: activeApplicableMachineCount,
    preventives_in_period_count: evaluatedPreventives.filter(p => period.months.includes(p.scheduled_month)).length,
    period_material_budget_total: Math.round(periodMaterialBudgetTotal * 100) / 100,
    current_month_material_budget: currentMonthBudget,
    period_priced_lines_total: periodPricedLines,
    period_missing_price_lines_total: periodMissingPrices,
    period_missing_quantity_lines_total: periodMissingQty,
    period_budget_coverage_pct: periodCoverage,
    period_budget_status: periodStatus,
    by_area_period: periodAreaSummary,
    monthly_distribution: monthlyResults,
    labor_cost_status: 'NOT_IN_SCOPE',
    traceability: {
      source_agent: 'AG-002',
      budget_agent: 'AG-007',
      orchestrator_agent: 'AG-001',
      calendar_plan_reference: `CAL-PLAN-${period.year}`
    }
  };
}
