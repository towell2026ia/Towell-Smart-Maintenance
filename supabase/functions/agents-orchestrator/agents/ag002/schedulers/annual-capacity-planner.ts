// supabase/functions/agents-orchestrator/agents/ag002/schedulers/annual-capacity-planner.ts
// Capacity Planner managing weekly/monthly slots (§60-62 PRD)

import { CAPACITY_CONFIG } from '../rules/preventive-rules.config.ts';

export interface WeekCapacitySlot {
  week_number: number;
  month_number: number;
  approx_date: string; // YYYY-MM-DD
  max_capacity: number;
  assigned_count: number;
}

export function initializeAnnualCapacityMap(targetYear: number): Map<number, WeekCapacitySlot> {
  const capacityMap = new Map<number, WeekCapacitySlot>();

  for (let week = CAPACITY_CONFIG.start_week; week <= CAPACITY_CONFIG.end_week; week++) {
    // Calculate approximate date for Monday of given week in targetYear
    // Simple ISO week Monday calculation
    const jan4 = new Date(Date.UTC(targetYear, 0, 4));
    const dayOfWeek = jan4.getUTCDay() || 7; // 1 = Mon, 7 = Sun
    const isoWeek1Monday = new Date(jan4.getTime() - (dayOfWeek - 1) * 24 * 60 * 60 * 1000);
    const slotMonday = new Date(isoWeek1Monday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);

    const monthNum = slotMonday.getUTCMonth() + 1;
    const yyyy = slotMonday.getUTCFullYear();
    const mm = String(monthNum).padStart(2, '0');
    const dd = String(slotMonday.getUTCDate()).padStart(2, '0');

    capacityMap.set(week, {
      week_number: week,
      month_number: monthNum,
      approx_date: `${yyyy}-${mm}-${dd}`,
      max_capacity: CAPACITY_CONFIG.max_preventives_per_week,
      assigned_count: 0
    });
  }

  return capacityMap;
}
