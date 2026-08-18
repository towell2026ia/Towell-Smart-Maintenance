// supabase/functions/agents-orchestrator/agents/ag004/calculators/weekly-compliance-calculator.ts
// Weekly Compliance Calculator for AG-004

import { calculateComplianceRate } from '../rules/compliance.rules.ts';

export interface WeeklyComplianceStats {
  eligibleCount: number;
  scheduledCount: number;
  completedCount: number;
  pendingCount: number;
  cancelledCount: number;
  overdueCount: number;
  complianceRate: number; // 0.0 to 1.0
}

export function calculateWeeklyCompliance(records: {
  estatus?: string;
}[]): WeeklyComplianceStats {
  const eligible = records.length;
  let completed = 0;
  let scheduled = 0;
  let pending = 0;
  let cancelled = 0;
  let overdue = 0;

  for (const r of records) {
    const st = (r.estatus || 'SCHEDULED').toUpperCase();
    if (st === 'COMPLETADO' || st === 'FINALIZADO') {
      completed++;
    } else if (st === 'CANCELADO') {
      cancelled++;
    } else if (st === 'OVERDUE' || st === 'VENCIDO') {
      overdue++;
    } else if (st === 'PENDIENTE' || st === 'PENDIENTE_ASIGNACION') {
      pending++;
    } else {
      scheduled++;
    }
  }

  const rate = calculateComplianceRate(completed, eligible);

  return {
    eligibleCount: eligible,
    scheduledCount: scheduled,
    completedCount: completed,
    pendingCount: pending,
    cancelledCount: cancelled,
    overdueCount: overdue,
    complianceRate: rate
  };
}
