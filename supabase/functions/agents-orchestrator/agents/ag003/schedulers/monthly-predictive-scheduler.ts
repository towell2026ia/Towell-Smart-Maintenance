// supabase/functions/agents-orchestrator/agents/ag003/schedulers/monthly-predictive-scheduler.ts
// Monthly Predictive Slot Scheduler (§79-87 PRD)

import { PredictiveCandidate } from '../types/ag003.types.ts';

export interface ScheduledPredictiveSlot {
  machine_id: string;
  rank_position: number;
  target_year: number;
  target_month: number;
  scheduled_date: string; // YYYY-MM-DD
  candidate: PredictiveCandidate;
}

export function scheduleMonthlyPredictiveSlots(
  selectedCandidates: PredictiveCandidate[],
  targetYear: number,
  targetMonth: number
): ScheduledPredictiveSlot[] {
  if (!selectedCandidates || selectedCandidates.length === 0) {
    return [];
  }

  const year = Number(targetYear);
  const month = Number(targetMonth); // 1 - 12
  const results: ScheduledPredictiveSlot[] = [];

  // Find all Fridays or balanced working days in target month
  const daysInMonth = new Date(year, month, 0).getDate();
  const fridays: number[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month - 1, d);
    if (dt.getDay() === 5) { // Friday
      fridays.push(d);
    }
  }

  // If month has fewer fridays than selected candidates, distribute evenly
  const slotDays = fridays.length >= selectedCandidates.length
    ? fridays.slice(0, selectedCandidates.length)
    : [7, 14, 21, 28].filter(d => d <= daysInMonth);

  selectedCandidates.forEach((cand, idx) => {
    const rank = cand.predictive_priority_rank || idx + 1;
    const day = slotDays[idx] || Math.min(daysInMonth, (idx + 1) * 7);

    const mStr = String(month).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${mStr}-${dStr}`;

    results.push({
      machine_id: cand.machine_id,
      rank_position: rank,
      target_year: year,
      target_month: month,
      scheduled_date: dateStr,
      candidate: cand
    });
  });

  return results;
}
