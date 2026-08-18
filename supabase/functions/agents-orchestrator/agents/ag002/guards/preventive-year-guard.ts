// supabase/functions/agents-orchestrator/agents/ag002/guards/preventive-year-guard.ts
// Preventive Year Guard enforcing 1 Machine + 1 Year = Maximum 1 Preventive (§4, §27-29, §110 PRD)

import { PreventiveAvailability } from '../types/ag002.types.ts';

export interface ExistingCalendarItem {
  id_detalle?: string;
  maquina_id: string;
  anio_plan: number;
  fecha_programada: string;
  tipo_mantenimiento: string;
  estatus_detalle: string;
}

export interface YearGuardEvaluation {
  status: PreventiveAvailability;
  can_schedule: boolean;
  active_preventives_count: number;
  max_allowed: number;
  existing_slots: ExistingCalendarItem[];
}

export function evaluatePreventiveYearGuard(
  machineId: string,
  targetYear: number,
  existingCalendarDetails: ExistingCalendarItem[] = [],
  _departmentCode?: any
): YearGuardEvaluation {
  const m = String(machineId || '').trim().toUpperCase();
  const maxAllowed = 1; // Universal invariant: 1 machine + 1 year = max 1 preventive

  const relevantDetails = existingCalendarDetails.filter(d => 
    String(d.maquina_id || '').trim().toUpperCase() === m &&
    d.anio_plan === targetYear &&
    String(d.tipo_mantenimiento || '').toUpperCase() === 'PREVENTIVO'
  );

  const activeStates = ['PROPUESTO', 'APROBADO', 'ASIGNADA', 'EN_PROCESO', 'PENDIENTE_VALIDACION', 'CERRADA'];
  const cancelledStates = ['CANCELADO', 'RECHAZADO', 'CANCELADA', 'RECHAZADA'];

  const activeSlots = relevantDetails.filter(d => activeStates.includes(String(d.estatus_detalle || '').toUpperCase()));
  const cancelledSlots = relevantDetails.filter(d => cancelledStates.includes(String(d.estatus_detalle || '').toUpperCase()));

  const activeCount = activeSlots.length;

  if (activeCount >= maxAllowed) {
    const isExecuted = activeSlots.some(s => String(s.estatus_detalle).toUpperCase() === 'CERRADA');
    return {
      status: isExecuted ? 'PREVENTIVE_ALREADY_EXECUTED' : 'PREVENTIVE_ALREADY_SCHEDULED',
      can_schedule: false,
      active_preventives_count: activeCount,
      max_allowed: maxAllowed,
      existing_slots: activeSlots
    };
  }

  if (activeCount === 0 && cancelledSlots.length > 0) {
    return {
      status: 'PREVENTIVE_CANCELLED_REPLACEMENT_ALLOWED',
      can_schedule: true,
      active_preventives_count: 0,
      max_allowed: maxAllowed,
      existing_slots: cancelledSlots
    };
  }

  return {
    status: 'PREVENTIVE_AVAILABLE',
    can_schedule: true,
    active_preventives_count: activeCount,
    max_allowed: maxAllowed,
    existing_slots: activeSlots
  };
}
