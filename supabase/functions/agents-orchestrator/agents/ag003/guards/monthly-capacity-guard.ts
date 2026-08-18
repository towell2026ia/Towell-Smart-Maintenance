// supabase/functions/agents-orchestrator/agents/ag003/guards/monthly-capacity-guard.ts
// Monthly Capacity Guard (§10, §70-75 PRD)

export interface MonthlyCapacityResult {
  existingCount: number;
  availableSlots: number;
  isCapacityFull: boolean;
  isCapacityExceeded: boolean;
}

export function checkMonthlyCapacity(existingCount: number): MonthlyCapacityResult {
  const count = Math.max(0, existingCount || 0);
  const maxSlots = 4;
  const available = Math.max(0, maxSlots - count);

  return {
    existingCount: count,
    availableSlots: available,
    isCapacityFull: available === 0,
    isCapacityExceeded: count > maxSlots
  };
}
