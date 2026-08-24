// supabase/functions/agents-orchestrator/agents/ag004/builders/autonomous-schedule-contract-builder.ts
// Contract Builder for AUTONOMOUS-SCHEDULE-001 (PRD-AG004-R1)

import { ScheduledAutonomousItem, AutonomousScheduleContractPayload } from '../types/ag004.types.ts';

export function buildAutonomousScheduleContract(
  item: ScheduledAutonomousItem,
  correlationId: string
): AutonomousScheduleContractPayload {
  return {
    contract_id: 'AUTONOMOUS-SCHEDULE-001',
    contract_version: '1.0',
    machine_id: item.machine_id,
    scheduled_date: item.scheduled_date,
    week_reference: item.iso_week,
    year: item.iso_year,
    calendar_reference: item.calendar_reference,
    form_reference: 'LEVANTAMIENTO_AUTONOMO',
    source_reference: 'AUTONOMO',
    department: item.department,
    correlation_id: correlationId
  };
}

