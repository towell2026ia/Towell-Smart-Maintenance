// supabase/functions/agents-orchestrator/agents/ag007/calculators/preventive-material-budget-engine.ts
// Master Canonical Preventive Material Budget Engine for AG-007 (PRD-AG007-R1.3.4)
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
  QuantityStatus,
  PreventiveScheduleItemInput,
  PreventiveSourceType
} from '../contracts/ag007-preventive-budget.contract.ts';

export const AG007_BUDGET_ENGINE_VERSION = '1.3.4-PRD-AG007-R1.3.4';

const SOURCE_PRECEDENCE: Record<PreventiveSourceType, number> = {
  COMPLETED_REAL: 1,
  VALID_SCHEDULED: 2,
  NEWLY_SCHEDULED: 3
};

/**
 * Calculates the canonical preventive parts budget deterministically (PRD-AG007-R1.3.4).
 * Rules:
 *  1. planned_part_cost = planned_quantity * reference_unit_price (AC-002, FH-004)
 *  2. Missing price is NOT converted to $0; marked as UNKNOWN_PRICE and PARTIAL coverage (AF-004).
 *  3. Missing quantity is NOT assumed as 1; marked as MISSING.
 *  4. Read-only deterministic deduplication by asset_id + calendar_year (FH-002, AF-001, AC-001).
 *  5. 12-Month distribution in ANNUAL_MONTHLY mode with annual_material_budget = SUM(12 months).
 *  6. Single calculation authority: zero frontend arithmetic, zero SQL calculation.
 */
export function calculatePreventiveMaterialBudget(input: PreventiveBudgetEngineInput): PreventiveBudgetEngineOutput {
  const calculatedAt = new Date().toISOString();
  const corrId = input.correlation_id || `CORR-BUDGET-${Date.now()}`;
  const budgetRunId = input.budget_run_id || `RUN-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase();

  // 1. Resolve period with canonical server-side authority (FH-001, FH-005, FC-001)
  const period: PreventiveBudgetPeriod = resolvePreventiveBudgetPeriod(
    input.reference_date,
    input.budget_scope,
    input.target_year
  );

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

  // 4. Deterministic Read-Only Deduplication (FH-002, AF-001, AC-001)
  // Precedence: COMPLETED_REAL (1) > VALID_SCHEDULED (2) > NEWLY_SCHEDULED (3)
  // Tie-breaker: scheduled_date ASC, preventive_id ASC (Zero order dependency)
  const rawItems = [...(input.preventive_schedule_items || [])];
  const rawUniverseCount = rawItems.length;

  const sortedCandidates = rawItems.sort((a, b) => {
    const precA = SOURCE_PRECEDENCE[a.source_type || 'NEWLY_SCHEDULED'] || 3;
    const precB = SOURCE_PRECEDENCE[b.source_type || 'NEWLY_SCHEDULED'] || 3;
    if (precA !== precB) return precA - precB;
    const dateComp = String(a.scheduled_date || '').localeCompare(String(b.scheduled_date || ''));
    if (dateComp !== 0) return dateComp;
    return String(a.preventive_id || '').localeCompare(String(b.preventive_id || ''));
  });

  const uniqueAssetYearMap = new Map<string, PreventiveScheduleItemInput>();
  let duplicatesDetected = 0;
  let duplicatesExcluded = 0;
  let duplicateConflicts = 0;

  for (const item of sortedCandidates) {
    const assetId = String(item.asset_id || (item as any).machine_id || (item as any).id_maquina || '').toUpperCase().trim();
    const key = `${assetId}_${item.calendar_year || period.year}`;
    if (!uniqueAssetYearMap.has(key)) {
      uniqueAssetYearMap.set(key, {
        ...item,
        asset_id: assetId
      });
    } else {
      duplicatesDetected++;
      duplicatesExcluded++;
      const existing = uniqueAssetYearMap.get(key)!;
      const existingSrc = existing.source_type || 'NEWLY_SCHEDULED';
      const itemSrc = item.source_type || 'NEWLY_SCHEDULED';
      if ((existingSrc === 'COMPLETED_REAL' && itemSrc !== 'COMPLETED_REAL') ||
          (existingSrc === 'VALID_SCHEDULED' && itemSrc === 'VALID_SCHEDULED')) {
        duplicateConflicts++;
      }
    }
  }

  const canonicalUniverse = Array.from(uniqueAssetYearMap.values());
  const uniqueUniverseCount = canonicalUniverse.length;

  // 5. Process each canonical preventive schedule item and evaluate planned parts
  const evaluatedPreventives: PreventiveItemBudgetResult[] = [];

  for (const prev of canonicalUniverse) {
    const schedDate = String(prev.scheduled_date || '').substring(0, 10);
    const schedMonth = schedDate.substring(0, 7); // YYYY-MM
    const assetId = String(prev.asset_id || (prev as any).machine_id || (prev as any).id_maquina || '').toUpperCase().trim();

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
      const directPrice = typeof (part as any).reference_unit_price === 'number' && !isNaN((part as any).reference_unit_price) && (part as any).reference_unit_price > 0
        ? (part as any).reference_unit_price
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
      labor_cost_status: 'NOT_IN_SCOPE',
      source_type: prev.source_type
    });
  }

  // 6. Aggregate Monthly Distribution strictly within period.months (FC-004, AF-005)
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
    const isCurrent = (monthStr === period.current_month) && (period.current_month_index === i);

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
    let fullyPricedCount = 0;
    let partialCount = 0;
    let noMappingCount = 0;

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

      if (prev.parts_lines.length === 0) {
        noMappingCount++;
      } else if (prev.missing_price_lines_count === 0 && prev.priced_lines_count > 0) {
        fullyPricedCount++;
      } else {
        partialCount++;
      }

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
    
    // Status semantics (PRD §28, §55-60, AF-004):
    // If preventive_count === 0 -> COMPLETE ($0 is valid)
    // If preventive_count > 0 and no lines -> NO_DATA
    // If priced > 0 and missing == 0 -> COMPLETE
    // If missing > 0 and priced > 0 -> PARTIAL
    // If priced == 0 and missing > 0 -> NO_DATA
    let monthStatus: BudgetCoverageStatus = 'COMPLETE';
    if (monthPreventives.length === 0) {
      monthStatus = 'COMPLETE';
    } else if (totalMonthLines === 0) {
      monthStatus = 'NO_DATA';
    } else if (monthMissingPrice > 0) {
      monthStatus = monthPriced > 0 ? 'PARTIAL' : 'NO_DATA';
    } else {
      monthStatus = 'COMPLETE';
    }

    const roundedMonthBudget = Math.round(monthBudget * 100) / 100;

    monthlyResults.push({
      year: parseInt(monthStr.substring(0, 4), 10),
      month: monthStr,
      month_number: i + 1,
      month_key: monthStr,
      month_label: monthLabel,
      is_current_month: isCurrent,
      preventive_count: monthPreventives.length,
      asset_count: uniqueAssets.size,
      service_count: uniqueServices.size,
      fully_priced_preventives: fullyPricedCount,
      partial_preventives: partialCount,
      no_part_mapping_preventives: noMappingCount,
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

  // 7. Compute period area coverage
  for (const a of Object.keys(periodAreaSummary)) {
    const tot = periodAreaSummary[a].priced_lines_count + periodAreaSummary[a].missing_price_lines_count;
    periodAreaSummary[a].coverage_pct = tot > 0 ? Math.round((periodAreaSummary[a].priced_lines_count / tot) * 10000) / 100 : 100;
    periodAreaSummary[a].material_budget = Math.round(periodAreaSummary[a].material_budget * 100) / 100;
    periodAreaSummary[a].status = periodAreaSummary[a].missing_price_lines_count > 0 ? (periodAreaSummary[a].priced_lines_count > 0 ? 'PARTIAL' : 'NO_DATA') : 'COMPLETE';
  }

  const totalPeriodLines = periodPricedLines + periodMissingPrices;
  const periodCoverage = totalPeriodLines > 0 ? Math.round((periodPricedLines / totalPeriodLines) * 10000) / 100 : 100;
  let periodStatus: BudgetCoverageStatus = 'COMPLETE';
  if (totalPeriodLines === 0) {
    periodStatus = evaluatedPreventives.length === 0 ? 'COMPLETE' : 'NO_DATA';
  } else if (periodMissingPrices > 0) {
    periodStatus = periodPricedLines > 0 ? 'PARTIAL' : 'NO_DATA';
  } else {
    periodStatus = 'COMPLETE';
  }

  const roundedAnnualBudget = Math.round(periodMaterialBudgetTotal * 100) / 100;

  return {
    engine_version: AG007_BUDGET_ENGINE_VERSION,
    budget_run_id: budgetRunId,
    correlation_id: corrId,
    calculated_at: calculatedAt,
    budget_type: 'PREVENTIVE_PARTS_FORECAST',
    budget_scope: period.budget_scope,
    period,
    canonical_reference_date: period.canonical_reference_date,
    canonical_timezone: period.canonical_timezone,
    active_applicable_machine_count: activeApplicableMachineCount,
    preventives_in_period_count: evaluatedPreventives.filter(p => period.months.includes(p.scheduled_month)).length,
    period_material_budget_total: roundedAnnualBudget,
    annual_material_budget: roundedAnnualBudget, // PRD-AG007-R1.3 §24-25, §46
    annual_preventive_count: uniqueUniverseCount,
    annual_price_coverage_pct: periodCoverage,
    annual_budget_status: periodStatus,
    current_month_material_budget: currentMonthBudget,
    period_priced_lines_total: periodPricedLines,
    period_missing_price_lines_total: periodMissingPrices,
    period_missing_quantity_lines_total: periodMissingQty,
    period_budget_coverage_pct: periodCoverage,
    period_budget_status: periodStatus,
    by_area_period: periodAreaSummary,
    monthly_distribution: monthlyResults,
    raw_annual_universe_count: rawUniverseCount,
    duplicates_detected: duplicatesDetected,
    duplicates_excluded: duplicatesExcluded,
    duplicate_conflicts: duplicateConflicts,
    final_unique_annual_universe_count: uniqueUniverseCount,
    deduplication_order_dependency: 0,
    labor_cost_status: 'NOT_IN_SCOPE',
    traceability: {
      source_agent: 'AG-002',
      budget_agent: 'AG-007',
      orchestrator_agent: 'AG-001',
      calendar_plan_reference: `CAL-PLAN-${period.year}`
    }
  };
}
