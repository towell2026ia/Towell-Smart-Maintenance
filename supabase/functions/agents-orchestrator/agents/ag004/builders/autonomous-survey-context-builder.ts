// supabase/functions/agents-orchestrator/agents/ag004/builders/autonomous-survey-context-builder.ts
// Survey Context Builder for LEVANTAMIENTO_AUTONOMO

import { ScheduledAutonomousItem } from '../types/ag004.types.ts';
import { getAutonomousChecklistDefinition } from '../resolvers/autonomous-checklist-resolver.ts';

export interface AutonomousSurveyContext {
  surveyFolio: string;
  machineId: string;
  department: string;
  scheduledDate: string;
  calendarReference: string;
  formFamily: 'LEVANTAMIENTO_AUTONOMO';
  checklistBlocks: ReturnType<typeof getAutonomousChecklistDefinition>;
  correlationId: string;
  status: 'PENDIENTE_ASIGNACION';
}

export function buildAutonomousSurveyContext(
  item: ScheduledAutonomousItem,
  correlationId: string
): AutonomousSurveyContext {
  return {
    surveyFolio: item.survey_reference,
    machineId: item.machineId,
    department: item.department,
    scheduledDate: item.scheduledDate,
    calendarReference: item.calendar_reference,
    formFamily: 'LEVANTAMIENTO_AUTONOMO',
    checklistBlocks: getAutonomousChecklistDefinition(),
    correlationId: correlationId,
    status: 'PENDIENTE_ASIGNACION'
  };
}
