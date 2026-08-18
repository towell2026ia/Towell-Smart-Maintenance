// supabase/functions/agents-orchestrator/agents/ag002/engine/preventive-priority-engine.ts
// Deterministic Preventive Priority Engine (§30-41 PRD)

import { 
  CriticalityLevel, 
  DowntimeMetrics, 
  MaintenanceHistoryMetrics, 
  PriorityBand, 
  PriorityScoreComponents, 
  RecurrenceMetrics 
} from '../types/ag002.types.ts';
import { PRIORITY_BANDS, PRIORITY_WEIGHTS } from '../rules/preventive-rules.config.ts';

export function calculatePreventivePriority(
  criticality: CriticalityLevel | undefined,
  recurrence: RecurrenceMetrics,
  downtime: DowntimeMetrics,
  maintenanceHistory: MaintenanceHistoryMetrics
): PriorityScoreComponents {
  // 1. Criticality Score (Max 35)
  const critKey = String(criticality || 'Media').trim();
  const critScore = PRIORITY_WEIGHTS.criticality[critKey] || 15;

  // 2. Recurrence Score (Max 25)
  const recRaw = recurrence.failure_count_12m * PRIORITY_WEIGHTS.recurrence.points_per_failure;
  const recScore = Math.min(PRIORITY_WEIGHTS.recurrence.max_points, Math.round(recRaw * 10) / 10);

  // 3. Downtime Score (Max 20)
  const downRaw = (downtime.downtime_minutes_12m / 100) * PRIORITY_WEIGHTS.downtime.points_per_100_minutes;
  const downScore = Math.min(PRIORITY_WEIGHTS.downtime.max_points, Math.round(downRaw * 10) / 10);

  // 4. Corrective Frequency Score (Max 10)
  const corrRaw = maintenanceHistory.corrective_work_orders_12m * PRIORITY_WEIGHTS.corrective_frequency.points_per_ot;
  const corrScore = Math.min(PRIORITY_WEIGHTS.corrective_frequency.max_points, Math.round(corrRaw * 10) / 10);

  // 5. Preventive Age Score (Max 10)
  let ageScore = 0;
  if (maintenanceHistory.days_since_last_preventive !== null) {
    const monthsSincePrev = maintenanceHistory.days_since_last_preventive / 30.4;
    if (monthsSincePrev > 12) {
      const overdueMonths = monthsSincePrev - 12;
      ageScore = Math.min(PRIORITY_WEIGHTS.preventive_age.max_points, Math.round(overdueMonths * PRIORITY_WEIGHTS.preventive_age.points_per_month_overdue));
    }
  } else if (maintenanceHistory.preventive_count_lifetime === 0) {
    ageScore = 5; // New machine or machine with no recorded preventive
  }

  // 6. Total Score (0 - 100)
  const total = Math.min(100, Math.round((critScore + recScore + downScore + corrScore + ageScore) * 10) / 10);

  // 7. Priority Band
  let band: PriorityBand = 'NORMAL';
  if (total >= PRIORITY_BANDS.VERY_HIGH) band = 'VERY_HIGH';
  else if (total >= PRIORITY_BANDS.HIGH) band = 'HIGH';
  else if (total >= PRIORITY_BANDS.MEDIUM) band = 'MEDIUM';

  return {
    criticality_score: critScore,
    recurrence_score: recScore,
    downtime_score: downScore,
    corrective_frequency_score: corrScore,
    preventive_age_score: ageScore,
    total_score: total,
    priority_band: band,
    data_completeness_flag: 'COMPLETE'
  };
}
