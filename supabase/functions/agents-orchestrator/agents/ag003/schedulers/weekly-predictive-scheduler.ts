// supabase/functions/agents-orchestrator/agents/ag003/schedulers/weekly-predictive-scheduler.ts
// Weekly Predictive Slot Scheduler (§13-19, §38-53, §90-100 PRD-AG003-R2)

import { WeeklyPredictiveCandidate, WeeklyPredictiveCycle, WeeklyScheduledItem } from '../types/ag003.types.ts';
import { WEEKLY_CONFIG } from '../rules/weekly.rules.ts';

const DAY_NAMES_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * Calculates the canonical 7-day Wednesday-to-Tuesday cycle given a reference upload date.
 */
export function resolveWeeklyPredictiveCycle(uploadDateStr: string, sourceIngestionId?: string): WeeklyPredictiveCycle {
  // Parse date components safely YYYY-MM-DD
  const parts = uploadDateStr.split('T')[0].split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  const refDate = new Date(Date.UTC(y, m, d));
  const dow = refDate.getUTCDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat

  // Target cycle start is the next Wednesday (or today if today is Wednesday)
  // If upload is Tuesday (dow=2), daysToAdd = 1 (Wednesday)
  // If upload is Wednesday (dow=3), daysToAdd = 0 (Wednesday)
  // If upload is Thursday (dow=4), daysToAdd = 6 (next Wednesday)
  let daysToAdd = (3 - dow + 7) % 7;
  if (daysToAdd === 0 && dow !== 3) {
    daysToAdd = 7;
  }

  const startDate = new Date(refDate.getTime() + daysToAdd * 86400000);
  const endDate = new Date(startDate.getTime() + 6 * 86400000); // 6 days later = Tuesday

  const startIso = startDate.toISOString().split('T')[0];
  const endIso = endDate.toISOString().split('T')[0];

  return {
    cycle_id: `PRED-CYCLE-${startIso}`,
    source_ingestion_id: sourceIngestionId,
    source_upload_date: uploadDateStr.split('T')[0],
    cycle_start: startIso,
    cycle_end: endIso,
    days_count: 7,
    sunday_eligible: true
  };
}

/**
 * Deterministically schedules top candidates across the 7-day Wednesday-to-Tuesday window.
 * Enforces maximum temporal dispersion, Sunday eligibility, and 4 unique dates for 4 candidates.
 */
export function scheduleWeeklyPredictiveSlots(
  selectedCandidates: WeeklyPredictiveCandidate[],
  cycle: WeeklyPredictiveCycle,
  correlationId = 'corr-ag003-weekly'
): WeeklyScheduledItem[] {
  if (!selectedCandidates || selectedCandidates.length === 0) {
    return [];
  }

  // Dispersion day offsets within the 7-day cycle [0: Wed, 1: Thu, 2: Fri, 3: Sat, 4: Sun, 5: Mon, 6: Tue]
  // 4 items -> Day 0 (Wed), Day 2 (Fri), Day 4 (Sun), Day 6 (Tue)
  // 3 items -> Day 0 (Wed), Day 2 (Fri), Day 4 (Sun)
  // 2 items -> Day 0 (Wed), Day 3 (Sat)
  // 1 item  -> Day 0 (Wed)
  const dispersionMap: Record<number, number[]> = {
    1: [0],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 2, 4, 6]
  };

  const count = Math.min(selectedCandidates.length, WEEKLY_CONFIG.MAX_WEEKLY_SELECTIONS);
  const offsets = dispersionMap[count] || [0, 2, 4, 6];

  const startParts = cycle.cycle_start.split('-');
  const startUtc = new Date(Date.UTC(
    parseInt(startParts[0], 10),
    parseInt(startParts[1], 10) - 1,
    parseInt(startParts[2], 10)
  ));

  const items: WeeklyScheduledItem[] = [];

  for (let i = 0; i < count; i++) {
    const cand = selectedCandidates[i];
    const offsetDays = offsets[i] !== undefined ? offsets[i] : i;
    const scheduledDateObj = new Date(startUtc.getTime() + offsetDays * 86400000);
    const scheduledDateStr = scheduledDateObj.toISOString().split('T')[0];
    const dow = scheduledDateObj.getUTCDay();
    const dayName = DAY_NAMES_ES[dow] || 'Miércoles';

    items.push({
      contract_id: 'PREDICTIVE-WEEKLY-SCHEDULE-002',
      contract_version: '2.0',
      cycle_id: cycle.cycle_id,
      source_ingestion_id: cycle.source_ingestion_id,
      source_upload_date: cycle.source_upload_date,
      cycle_start: cycle.cycle_start,
      cycle_end: cycle.cycle_end,
      asset_id: cand.machine_id,
      machine_identifier: cand.machine_id,
      department: 'PF',
      rank: cand.rank || (i + 1),
      segundas_percentage: cand.segundas_percentage,
      total_segundas: cand.total_segundas,
      total_pzas: cand.total_pzas,
      scheduled_date: scheduledDateStr,
      day_of_week_name: dayName,
      service_code: 'SRV-PRED-01',
      activity_name: WEEKLY_CONFIG.DEFAULT_ACTIVITY_NAME,
      form_family: 'LEVANTAMIENTO_PREDICTIVO',
      required_blocks: ['Electrónico', 'Mecánico', 'Limpieza', 'Lubricación'],
      source_ingestion_reference: cycle.source_ingestion_id || cycle.cycle_id
    });
  }

  return items;
}
