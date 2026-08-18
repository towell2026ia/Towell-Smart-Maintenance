// supabase/functions/agents-orchestrator/agents/ag002/calculators/maintenance-history-calculator.ts
// Deterministic Maintenance History Calculator (§26 PRD)

import { WorkOrderItem, MaintenanceHistoryMetrics } from '../types/ag002.types.ts';

export function calculateMaintenanceHistory(
  machineId: string,
  workOrders: WorkOrderItem[],
  generationDateStr: string
): MaintenanceHistoryMetrics {
  const machineOrders = workOrders.filter(o => o.maquina_id === machineId);
  const genDate = new Date(generationDateStr);

  let lastWODate: string | null = null;
  let lastPrevDate: string | null = null;
  let prevLifetimeCount = 0;
  let correctives12m = 0;

  const twelveMonthsAgo = new Date(genDate.getTime() - 365 * 24 * 60 * 60 * 1000);

  for (const ot of machineOrders) {
    const otDateStr = ot.fecha_inicio || ot.fecha_fin;
    if (!otDateStr) continue;

    const otDate = new Date(otDateStr);
    if (isNaN(otDate.getTime())) continue;

    // Track latest work order
    if (!lastWODate || otDate > new Date(lastWODate)) {
      lastWODate = otDateStr;
    }

    if (ot.tipo_orden === 'Preventivo') {
      prevLifetimeCount++;
      if (!lastPrevDate || otDate > new Date(lastPrevDate)) {
        lastPrevDate = otDateStr;
      }
    } else if (ot.tipo_orden === 'Correctivo') {
      if (otDate >= twelveMonthsAgo && otDate <= genDate) {
        correctives12m++;
      }
    }
  }

  let daysSinceLastPrev: number | null = null;
  if (lastPrevDate) {
    const diffTime = genDate.getTime() - new Date(lastPrevDate).getTime();
    daysSinceLastPrev = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  }

  return {
    last_work_order_date: lastWODate,
    last_preventive_date: lastPrevDate,
    preventive_count_lifetime: prevLifetimeCount,
    days_since_last_preventive: daysSinceLastPrev,
    corrective_work_orders_12m: correctives12m
  };
}
