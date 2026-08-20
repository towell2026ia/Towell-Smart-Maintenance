// supabase/functions/agents-orchestrator/agents/ag003/core/predictive-engine.ts
// Master Deterministic Predictive Engine for AG-003 (§1-13 PRD)

import {
  PredictiveCandidate,
  PredictiveEngineOutput,
  RawQualityRow,
  RawFailureRow,
  RawTelegramRow,
  RawBitacoraRow,
  RuleVersionsManifest
} from '../types/ag003.types.ts';
import { validateLoomEligibility } from '../guards/loom-eligibility-guard.ts';
import { evaluateDataQuality } from '../guards/data-quality-guard.ts';
import { checkMonthlyCapacity } from '../guards/monthly-capacity-guard.ts';
import { collectQualityWindow } from '../collectors/quality-window-collector.ts';
import { collectHistoricalContext } from '../collectors/historical-context-collector.ts';
import { calculateSecondsPerRoll } from '../calculators/seconds-per-roll-calculator.ts';
import { calculateBaseline } from '../calculators/baseline-calculator.ts';
import { calculateDeviation } from '../calculators/deviation-calculator.ts';
import { calculatePredictivePriorityScore } from '../engine/predictive-priority-engine.ts';
import { selectTop4PredictiveCandidates } from '../selectors/top4-predictive-selector.ts';
import { scheduleMonthlyPredictiveSlots } from '../schedulers/monthly-predictive-scheduler.ts';
import { buildPredictiveScheduleItems } from '../builders/predictive-calendar-builder.ts';
import { validatePredictiveOutput } from '../validators/predictive-output-validator.ts';

import { DATA_QUALITY_RULES_VERSION } from '../rules/data-quality.rules.ts';
import { BASELINE_RULES_VERSION } from '../rules/baseline.rules.ts';
import { DEVIATION_RULES_VERSION } from '../rules/deviation.rules.ts';
import { HISTORICAL_CONTEXT_RULES_VERSION } from '../rules/historical-context.rules.ts';
import { PRIORITY_RULES_VERSION } from '../rules/priority.rules.ts';
import { SELECTION_RULES_VERSION } from '../rules/selection.rules.ts';
import { SCHEDULING_RULES_VERSION } from '../rules/scheduling.rules.ts';

export interface EngineInput {
  targetYear: number;
  targetMonth: number;
  targetDate?: string;
  machines: Array<{
    equipo_towell?: string;
    machine_id?: string;
    departamento_codigo?: string;
    area?: string;
    activo?: boolean;
    criticidad?: string;
  }>;
  qualityRows: RawQualityRow[];
  historicalQualityRows?: RawQualityRow[]; // for machine baseline
  failureRows?: RawFailureRow[];
  telegramRows?: RawTelegramRow[];
  bitacoraRows?: RawBitacoraRow[];
  existingScheduledMonthlyMachines?: string[];
  pastPredictiveSurveys?: Record<string, { lastDate: string; daysAgo: number }>;
  correlationId?: string;
  featureFlagEnabled?: boolean;
}

export function runDeterministicPredictiveEngine(input: EngineInput): PredictiveEngineOutput {
  const startTime = Date.now();
  const year = input.targetYear;
  const month = input.targetMonth;
  const mStr = String(month).padStart(2, '0');
  const targetMonthStr = `${year}-${mStr}`;
  const targetDate = input.targetDate || `${year}-${mStr}-01`;
  const correlationId = input.correlationId || `corr-ag003-${targetMonthStr}-${Date.now()}`;
  const eventId = `evt-pred-${targetMonthStr}-${Date.now()}`;

  const ruleVersions: RuleVersionsManifest = {
    'AG003-DATA-QUALITY-RULES': DATA_QUALITY_RULES_VERSION,
    'AG003-BASELINE-RULES': BASELINE_RULES_VERSION,
    'AG003-DEVIATION-RULES': DEVIATION_RULES_VERSION,
    'AG003-HISTORICAL-CONTEXT-RULES': HISTORICAL_CONTEXT_RULES_VERSION,
    'AG003-PRIORITY-RULES': PRIORITY_RULES_VERSION,
    'AG003-SELECTION-RULES': SELECTION_RULES_VERSION,
    'AG003-SCHEDULING-RULES': SCHEDULING_RULES_VERSION
  };

  // 1. Feature Flag Check
  if (input.featureFlagEnabled === false) {
    return {
      contract_id: 'PREDICTIVE-SCHEDULE-001',
      contract_version: '1.0',
      event_id: eventId,
      correlation_id: correlationId,
      target_month: targetMonthStr,
      generation_date: new Date().toISOString(),
      looms_scanned: input.machines?.length || 0,
      looms_with_data: 0,
      looms_eligible: 0,
      existing_monthly_items: 0,
      available_slots: 0,
      selected_count: 0,
      schedule_items: [],
      all_candidates: [],
      rule_versions: ruleVersions,
      audit_summary: {
        duration_ms: Date.now() - startTime,
        llm_used: false,
        tokens: 0,
        ai_cost: 0,
        status: 'DISABLED'
      }
    };
  }

  // 2. Capacity Guard Check
  const existingCount = input.existingScheduledMonthlyMachines?.length || 0;
  const capacityCheck = checkMonthlyCapacity(existingCount);

  // 3. Process Each Machine
  const allCandidates: PredictiveCandidate[] = [];
  let loomsWithData = 0;
  let loomsEligible = 0;

  for (const m of (input.machines || [])) {
    const machineId = String(m.equipo_towell || m.machine_id || '').trim().toUpperCase();
    const eligCheck = validateLoomEligibility(m);

    if (eligCheck.isEligible) {
      loomsEligible++;
    }

    // Collect 30-day Quality Window
    const qualityWindow = collectQualityWindow(machineId, input.qualityRows || [], targetDate, 30);
    if (qualityWindow.totalRows > 0) {
      loomsWithData++;
    }

    // Quality Metric Calculation
    const qualityMetric = calculateSecondsPerRoll(qualityWindow.totalSegundas, qualityWindow.totalRolls, qualityWindow.totalPzas);

    // Data Quality & Sufficiency Guard
    const dataQuality = evaluateDataQuality(
      qualityWindow.totalRows,
      qualityWindow.validRows.length,
      qualityWindow.invalidRows.length,
      false
    );

    // Historical Baseline Calculation
    const histQuality = collectQualityWindow(machineId, input.historicalQualityRows || [], targetDate, 180);
    const baseline = calculateBaseline(histQuality.totalSegundas, histQuality.totalRolls, histQuality.totalPzas);

    // Deviation Calculation
    const metricToCompare = qualityMetric.defectPercentage > 0 ? qualityMetric.defectPercentage : qualityMetric.segundasPerRoll;
    const deviation = calculateDeviation(metricToCompare, baseline.baseline_value);

    // Historical Breakdown & Paros Context
    const histContext = collectHistoricalContext(
      machineId,
      targetDate,
      input.failureRows || [],
      input.telegramRows || [],
      input.bitacoraRows || [],
      30
    );

    // Last Predictive Survey Recency
    const pastSurvey = input.pastPredictiveSurveys?.[machineId];
    const daysSincePredictive = pastSurvey ? pastSurvey.daysAgo : null;
    const lastPredictiveDate = pastSurvey ? pastSurvey.lastDate : null;

    // Predictive Priority Scoring (0 - 100)
    const priorityScore = calculatePredictivePriorityScore(
      deviation,
      qualityWindow.totalSegundas,
      dataQuality,
      histContext,
      m.criticidad || 'Media',
      daysSincePredictive
    );

    const isEligibleForSelection = eligCheck.isEligible && dataQuality.isAcceptableForRanking;

    allCandidates.push({
      machine_id: machineId,
      month: targetMonthStr,
      data_window_days: 30,
      quality_metrics: {
        total_segundas: qualityWindow.totalSegundas,
        total_rolls: qualityWindow.totalRolls,
        total_pzas: qualityWindow.totalPzas,
        segundas_rate: qualityMetric.segundasPerRoll,
        defect_percentage: qualityMetric.defectPercentage
      },
      baseline,
      deviation,
      historical_context: {
        failures_count: histContext.deduplicatedFailuresCount,
        downtime_hours: histContext.downtimeHours,
        criticality: m.criticidad || 'Media'
      },
      previous_predictive_date: lastPredictiveDate,
      eligibility: isEligibleForSelection,
      data_status: dataQuality.status,
      candidate_status: isEligibleForSelection ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
      priority_score: priorityScore
    });
  }

  // 4. Select Top-4 Candidates
  const selectionResult = selectTop4PredictiveCandidates(allCandidates, capacityCheck.availableSlots);

  // 5. Schedule Monthly Slots
  const scheduledSlots = scheduleMonthlyPredictiveSlots(selectionResult.selectedCandidates, year, month);

  // 6. Build Schedule Items
  const scheduleItems = buildPredictiveScheduleItems(scheduledSlots, correlationId);

  // 7. Validate Output
  const outputValidation = validatePredictiveOutput(scheduleItems, year, month);
  if (!outputValidation.isValid) {
    console.error('Validation errors in predictive engine output:', outputValidation.errors);
  }

  const durationMs = Date.now() - startTime;

  return {
    contract_id: 'PREDICTIVE-SCHEDULE-001',
    contract_version: '1.0',
    event_id: eventId,
    correlation_id: correlationId,
    target_month: targetMonthStr,
    generation_date: new Date().toISOString(),
    looms_scanned: input.machines?.length || 0,
    looms_with_data: loomsWithData,
    looms_eligible: loomsEligible,
    existing_monthly_items: existingCount,
    available_slots: capacityCheck.availableSlots,
    selected_count: scheduleItems.length,
    schedule_items: scheduleItems,
    all_candidates: allCandidates,
    rule_versions: ruleVersions,
    audit_summary: {
      duration_ms: durationMs,
      llm_used: false,
      tokens: 0,
      ai_cost: 0,
      status: scheduleItems.length > 0 ? 'SUCCESS' : (capacityCheck.isCapacityFull ? 'CAPACITY_REACHED' : 'NO_CANDIDATES')
    }
  };
}
