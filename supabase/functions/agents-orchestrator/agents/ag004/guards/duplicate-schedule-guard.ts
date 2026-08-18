// supabase/functions/agents-orchestrator/agents/ag004/guards/duplicate-schedule-guard.ts
// Strict Duplicate & Idempotency Guard for AG-004

import { ExistingScheduleRecord } from '../types/ag004.types.ts';

export interface ScheduleCoverageCheck {
  isAlreadyCovered: boolean;
  status?: 'ALREADY_SCHEDULED' | 'ALREADY_COMPLETED';
  existingRecord?: ExistingScheduleRecord;
}

export function checkExistingAutonomousSchedule(
  machineId: string,
  isoYear: number,
  isoWeek: number,
  existingRecords: ExistingScheduleRecord[]
): ScheduleCoverageCheck {
  const normId = String(machineId).trim().toUpperCase();

  const found = existingRecords.find(r => {
    if (r.tipo_mantenimiento !== 'AUTONOMO') return false;
    if (String(r.maquina_id).trim().toUpperCase() !== normId) return false;
    
    // Check year and week either via explicit fields or date parsing
    if (r.anio_plan && r.semana_plan) {
      return r.anio_plan === isoYear && r.semana_plan === isoWeek;
    }
    if (r.fecha_programada) {
      const d = new Date(r.fecha_programada);
      return d.getUTCFullYear() === isoYear; // coarse fallback
    }
    return false;
  });

  if (found) {
    const isCompleted = found.estatus === 'COMPLETADO' || found.estatus === 'FINALIZADO';
    return {
      isAlreadyCovered: true,
      status: isCompleted ? 'ALREADY_COMPLETED' : 'ALREADY_SCHEDULED',
      existingRecord: found
    };
  }

  return {
    isAlreadyCovered: false
  };
}
