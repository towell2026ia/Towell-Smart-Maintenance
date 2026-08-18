// supabase/functions/agents-orchestrator/agents/ag002/builders/preventive-contract-builder.ts
// Official Contract Builder for PREVENTIVE-SCHEDULE-001 (§73, §74 PRD)

import { PlannedPreventiveSlot } from '../types/ag002.types.ts';

export interface PreventiveScheduleContractPayload {
  contract_id: string;
  contract_version: string;
  machine_id: string;
  scheduled_date: string;
  year: number;
  service_code: string;
  calendar_reference: string;
  source_reference: string;
  department: string;
  description: string;
  planned_parts?: Array<{
    cve_refaccion: string;
    cantidad: number;
    costo_unitario?: number;
  }>;
  estimated_duration_min: number;
}

export function buildPreventiveScheduleContract(slot: PlannedPreventiveSlot): PreventiveScheduleContractPayload {
  const desc = `Mantenimiento preventivo anual programado para equipo ${slot.machine_id} (Periodo: ${slot.period}, Semana: ${slot.week_number}, Prioridad: ${slot.priority_band} ${slot.priority_score} pts).`;

  return {
    contract_id: 'PREVENTIVE-SCHEDULE-001',
    contract_version: '1.0',
    machine_id: slot.machine_id,
    scheduled_date: slot.scheduled_date,
    year: slot.year,
    service_code: slot.service_code,
    calendar_reference: slot.calendar_reference,
    source_reference: 'AG-002',
    department: slot.department,
    description: desc,
    planned_parts: slot.planned_parts.length > 0 ? slot.planned_parts : undefined,
    estimated_duration_min: slot.estimated_duration_min
  };
}
