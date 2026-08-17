// supabase/functions/agents-orchestrator/agents/ag009/ag009_1/builders/preventive-ot-builder.ts
// Preventive Work Order (OT) Builder (§30, §31, §32, §33 PRD-AG-009.1)

import { PreventiveSchedulePayload } from '../contracts/preventive-schedule.contract.ts';
import { MachineValidationOutput } from '../guards/machine-guard.ts';
import { ServiceValidationOutput } from '../guards/service-guard.ts';
import { ChecklistResolutionOutput } from '../resolvers/checklist-resolver.ts';

export interface PreventiveOTDraft {
  id_orden?: string;
  folio_propuesto: string;
  tipo_orden: 'Preventivo';
  orden_trabajo: string;
  origen: 'Preventivo';
  estatus: 'Abierta';
  maquina_id: string;
  departamento: string;
  fecha_inicio: string;
  fecha_hora_inicio: string;
  descripcion: string;
  observacion_inicial: string;
  id_plan?: string;
  calendar_reference: string;
  service_code: string;
  service_name: string;
  checklist_reference: string;
  planned_parts: any[];
  prioridad: 'Media' | 'Alta' | 'Crítica';
  correlation_id: string;
}

export function generateStandardPreventiveFolio(department: string, sequenceNum: number): string {
  const deptPrefix = department.toUpperCase().trim();
  const padded = String(sequenceNum).padStart(5, '0');
  return `${deptPrefix}${padded}`;
}

export function buildPreventiveOTDraft(
  payload: PreventiveSchedulePayload,
  machine: MachineValidationOutput,
  service: ServiceValidationOutput,
  checklist: ChecklistResolutionOutput,
  correlationId: string,
  sequenceNum: number = 1
): PreventiveOTDraft {
  const folio = generateStandardPreventiveFolio(machine.department, sequenceNum);
  const scheduledIso = payload.scheduled_date.includes('T')
    ? payload.scheduled_date
    : `${payload.scheduled_date}T08:00:00.000Z`;

  const dateOnly = scheduledIso.split('T')[0];

  const desc = payload.description
    ? payload.description
    : `Mantenimiento Preventivo Anual — ${service.nombre_servicio} (${service.service_code}) para equipo ${machine.machine_id}`;

  const priority: 'Media' | 'Alta' | 'Crítica' =
    machine.criticidad === 'A' ? 'Crítica' : machine.criticidad === 'B' ? 'Alta' : 'Media';

  return {
    folio_propuesto: folio,
    tipo_orden: 'Preventivo',
    orden_trabajo: `Preventivo — ${service.nombre_servicio}`,
    origen: 'Preventivo',
    estatus: 'Abierta',
    maquina_id: machine.machine_id,
    departamento: machine.department,
    fecha_inicio: dateOnly,
    fecha_hora_inicio: scheduledIso,
    descripcion: desc,
    observacion_inicial: `Generado automáticamente por AG-009.1 desde Calendario Preventivo (${payload.calendar_reference}). Checklist: ${checklist.checklist_reference} (${checklist.total_items} puntos).`,
    calendar_reference: payload.calendar_reference,
    service_code: service.service_code,
    service_name: service.nombre_servicio,
    checklist_reference: checklist.checklist_reference,
    planned_parts: payload.planned_parts || [],
    prioridad: priority,
    correlation_id: correlationId
  };
}
