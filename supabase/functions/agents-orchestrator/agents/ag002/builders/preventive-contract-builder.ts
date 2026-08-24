// supabase/functions/agents-orchestrator/agents/ag002/builders/preventive-contract-builder.ts
// Official Contract Builder for PREVENTIVE-SCHEDULE-001 (§73, §74 PRD)

import { PlannedPartReference, PlannedPreventiveSlot } from '../types/ag002.types.ts';

export interface PreventiveScheduleContractPayload {
  contract_id: string;
  contract_version: string;
  preventive_id?: string;
  asset_id: string;
  area_code: string;
  machine_id: string;
  scheduled_date: string;
  year: number;
  service_code: string;
  service_name: string;
  calendar_reference: string;
  source_reference: string;
  department: string;
  description: string;
  planned_parts: PlannedPartReference[];
  estimated_duration_min: number;
}

export function buildPreventiveScheduleContract(slot: PlannedPreventiveSlot): PreventiveScheduleContractPayload {
  const desc = `Mantenimiento preventivo anual programado para equipo ${slot.machine_id} (Periodo: ${slot.period}, Semana: ${slot.week_number}, Prioridad: ${slot.priority_band} ${slot.priority_score} pts).`;

  const plannedParts: PlannedPartReference[] = (slot.planned_parts || []).map((p: any) => ({
    part_id: p.part_id,
    part_code: p.cve_refaccion || p.part_code || p.codigo_articulo,
    part_name: p.nombre || p.part_name || p.nombre_articulo || (p.cve_refaccion || p.part_code),
    planned_quantity: typeof p.cantidad === 'number' ? p.cantidad : (typeof p.planned_quantity === 'number' ? p.planned_quantity : 1),
    unit_of_measure: p.unit_of_measure || p.unidad_medida || 'PZA',
    quantity_source: p.quantity_source || 'SERVICE_DEFAULT',
    quantity_status: p.quantity_status || 'KNOWN_QUANTITY'
  }));

  return {
    contract_id: 'PREVENTIVE-SCHEDULE-001',
    contract_version: '1.0',
    preventive_id: slot.slot_id,
    asset_id: slot.machine_id,
    area_code: slot.department,
    machine_id: slot.machine_id,
    scheduled_date: slot.scheduled_date,
    year: slot.year,
    service_code: slot.service_code,
    service_name: slot.service_name,
    calendar_reference: slot.calendar_reference,
    source_reference: 'AG-002',
    department: slot.department,
    description: desc,
    planned_parts: plannedParts,
    estimated_duration_min: slot.estimated_duration_min
  };
}
