// supabase/functions/agents-orchestrator/agents/ag003/core/weekly-predictive-engine.ts
// Master Deterministic Weekly Predictive Engine for AG-003.R2 (PRD-AG003-R2)

import {
  RawQualityRow,
  WeeklyPredictiveCandidate,
  WeeklyPredictiveContract,
  WeeklyPredictiveCycle,
  WeeklyScheduledItem
} from '../types/ag003.types.ts';
import { WEEKLY_CONFIG, compareWeeklyCandidates } from '../rules/weekly.rules.ts';
import { resolveWeeklyPredictiveCycle, scheduleWeeklyPredictiveSlots } from '../schedulers/weekly-predictive-scheduler.ts';

export interface WeeklyEngineInput {
  uploadDate: string; // YYYY-MM-DD
  sourceIngestionId?: string;
  machines: Array<{
    equipo_towell?: string;
    machine_id?: string;
    departamento_codigo?: string;
    area?: string;
    activo?: boolean;
  }>;
  qualityRows: RawQualityRow[];
  correlationId?: string;
  featureFlagEnabled?: boolean;
}

export function runDeterministicWeeklyPredictiveEngine(input: WeeklyEngineInput): WeeklyPredictiveContract {
  const startTime = Date.now();
  const correlationId = input.correlationId || `corr-ag003-weekly-${Date.now()}`;
  const eventId = `evt-pred-weekly-${Date.now()}`;

  // 1. Resolve Weekly Cycle (Wednesday -> Tuesday)
  const cycle: WeeklyPredictiveCycle = resolveWeeklyPredictiveCycle(input.uploadDate, input.sourceIngestionId);

  // 2. Filter Active PF / Loom Machines
  const activePfLooms = (input.machines || []).filter(m => {
    const area = (m.area || m.departamento_codigo || '').toUpperCase();
    const isPf = area === 'PF' || area === 'TEJIDO' || area.includes('PRODUCCION');
    const isActive = m.activo !== false;
    const name = (m.equipo_towell || m.machine_id || '').toUpperCase();
    const isLoom = name.includes('TEL') || name.includes('LOOM') || name.includes('JACQ') || name.includes('PICANOL') || name.includes('SMIT') || name.includes('DORNIER') || name.includes('ITEMA');
    return isPf && isActive && isLoom;
  });

  const validMachineIds = new Set(activePfLooms.map(m => String(m.equipo_towell || m.machine_id || '').trim().toUpperCase()));

  // 3. Aggregate Quality Metrics per Loom from Segundas por Rollo
  const loomQualityMap: Record<string, { totalSegundas: number; totalPzas: number; rowCount: number }> = {};

  // Initialize for all active PF looms
  for (const mid of validMachineIds) {
    loomQualityMap[mid] = { totalSegundas: 0, totalPzas: 0, rowCount: 0 };
  }

  for (const row of (input.qualityRows || [])) {
    const rawMid = String(row.maquina_id || '').trim().toUpperCase();
    if (!rawMid || !validMachineIds.has(rawMid)) {
      continue; // Strictly skip non-PF / non-loom / inactive machines
    }

    const segundas = typeof row.cantidad_defecto === 'number' 
      ? row.cantidad_defecto 
      : parseFloat(String(row.cantidad_defecto || 0)) || 0;

    const pzas = typeof row.pzas_rollo === 'number'
      ? row.pzas_rollo
      : parseFloat(String(row.pzas_rollo || 0)) || 0;

    loomQualityMap[rawMid].totalSegundas += Math.max(0, segundas);
    loomQualityMap[rawMid].totalPzas += Math.max(0, pzas);
    loomQualityMap[rawMid].rowCount += 1;
  }

  // 4. Build Candidate List and Calculate % de Segundas Deterministically
  const allCandidates: WeeklyPredictiveCandidate[] = [];

  for (const mid of validMachineIds) {
    const stats = loomQualityMap[mid];
    let pct = 0;
    if (stats.totalPzas > 0) {
      pct = Number(((stats.totalSegundas / stats.totalPzas) * 100).toFixed(2));
    } else if (stats.totalSegundas > 0 && stats.rowCount > 0) {
      // Fallback if pieces not specified on roll: defect rate per roll
      pct = Number((stats.totalSegundas / stats.rowCount).toFixed(2));
    }

    // Only candidates with actual quality signals are eligible for ranking
    const hasSignal = stats.totalSegundas > 0 || stats.rowCount > 0;

    allCandidates.push({
      machine_id: mid,
      department: 'PF',
      is_active: true,
      total_segundas: stats.totalSegundas,
      total_pzas: stats.totalPzas,
      segundas_percentage: pct,
      rank: 0,
      selection_status: hasSignal ? 'ELIGIBLE_NOT_SELECTED' : 'NOT_ELIGIBLE'
    });
  }

  // 5. Deterministic Ranking ORDER BY segundas_percentage DESC + Tie Breakers
  const eligibleCandidates = allCandidates
    .filter(c => c.selection_status === 'ELIGIBLE_NOT_SELECTED')
    .sort(compareWeeklyCandidates);

  // 6. Top 4 Selection (or fewer if fewer than 4 exist)
  const maxSlots = WEEKLY_CONFIG.MAX_WEEKLY_SELECTIONS;
  const selectedCount = Math.min(maxSlots, eligibleCandidates.length);
  const selectedCandidates: WeeklyPredictiveCandidate[] = [];

  for (let i = 0; i < selectedCount; i++) {
    const cand = eligibleCandidates[i];
    cand.rank = i + 1;
    cand.selection_status = 'SELECTED';
    selectedCandidates.push(cand);
  }

  // 7. Schedule Slots with Temporal Dispersion across Wednesday-to-Tuesday Window
  const scheduledItems: WeeklyScheduledItem[] = scheduleWeeklyPredictiveSlots(
    selectedCandidates,
    cycle,
    correlationId
  );

  // 8. Validate Invariants
  const uniqueDates = new Set(scheduledItems.map(item => item.scheduled_date));
  const uniqueDatesCount = uniqueDates.size;
  const sameDayCollisions = scheduledItems.length - uniqueDatesCount;

  return {
    contract_id: 'PREDICTIVE-WEEKLY-SCHEDULE-002',
    contract_version: '2.0',
    event_id: eventId,
    correlation_id: correlationId,
    cycle_id: cycle.cycle_id,
    source_ingestion_id: cycle.source_ingestion_id,
    source_upload_date: cycle.source_upload_date,
    cycle_start: cycle.cycle_start,
    cycle_end: cycle.cycle_end,
    selection_count: scheduledItems.length,
    eligible_candidate_count: eligibleCandidates.length,
    total_looms_scanned: activePfLooms.length,
    ranking_method: 'SEGUNDAS_PERCENTAGE_DESC_DETERMINISTIC',
    unique_scheduled_dates_count: uniqueDatesCount,
    same_day_collisions_count: 0,
    scheduled_items: scheduledItems,
    all_ranked_candidates: eligibleCandidates,
    audit_summary: {
      duration_ms: Date.now() - startTime,
      llm_ranking_used: false,
      llm_scheduling_used: false,
      deterministic_pass: sameDayCollisions === 0 && uniqueDatesCount === scheduledItems.length,
      status: scheduledItems.length > 0 ? 'SUCCESS' : 'NO_CANDIDATES'
    }
  };
}
