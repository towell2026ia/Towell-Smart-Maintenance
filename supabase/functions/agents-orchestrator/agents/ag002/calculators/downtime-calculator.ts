// supabase/functions/agents-orchestrator/agents/ag002/calculators/downtime-calculator.ts
// Deterministic Downtime and Machine Stops Calculator (§23, §24, §25 PRD)

import { BitacoraItem, DowntimeMetrics } from '../types/ag002.types.ts';

export function calculateDowntimeMetrics(
  machineId: string,
  bitacoras: BitacoraItem[],
  workOrdersWithDowntime: Array<{ maquina_id: string; tiempo_atencion_min?: number; fecha_inicio?: string; fecha_fin?: string; hora_inicio?: string; hora_fin?: string }>
): DowntimeMetrics {
  const machineBitacoras = bitacoras.filter(b => b.maquina_id === machineId);
  const machineOTs = workOrdersWithDowntime.filter(o => o.maquina_id === machineId);

  let totalMinutes = 0;
  const eventDurations: number[] = [];

  // 1. Process Bitacoras
  for (const b of machineBitacoras) {
    if (b.fecha_hora_inicio && b.fecha_hora_fin) {
      const start = new Date(b.fecha_hora_inicio).getTime();
      const end = new Date(b.fecha_hora_fin).getTime();
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        const durationMin = Math.round((end - start) / (1000 * 60));
        totalMinutes += durationMin;
        eventDurations.push(durationMin);
      }
    }
  }

  // 2. Process Work Orders
  for (const ot of machineOTs) {
    if (typeof ot.tiempo_atencion_min === 'number' && ot.tiempo_atencion_min > 0) {
      totalMinutes += ot.tiempo_atencion_min;
      eventDurations.push(ot.tiempo_atencion_min);
    }
  }

  if (eventDurations.length === 0) {
    return {
      downtime_minutes_12m: 0,
      downtime_hours_12m: 0,
      average_downtime_per_event_min: 0,
      maximum_downtime_event_min: 0,
      status: 'KNOWN_ZERO_DOWNTIME'
    };
  }

  const avgMin = Math.round(totalMinutes / eventDurations.length);
  const maxMin = Math.max(...eventDurations);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  return {
    downtime_minutes_12m: totalMinutes,
    downtime_hours_12m: totalHours,
    average_downtime_per_event_min: avgMin,
    maximum_downtime_event_min: maxMin,
    status: 'KNOWN_DOWNTIME'
  };
}
