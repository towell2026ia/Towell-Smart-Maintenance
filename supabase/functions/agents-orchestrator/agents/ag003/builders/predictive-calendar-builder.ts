// supabase/functions/agents-orchestrator/agents/ag003/builders/predictive-calendar-builder.ts
// Predictive Calendar Builder (§88-92 PRD)

import { PredictiveMonthlyScheduleItem, PredictiveSeverity } from '../types/ag003.types.ts';
import { ScheduledPredictiveSlot } from '../schedulers/monthly-predictive-scheduler.ts';
import { buildPredictiveSurveyContext } from './predictive-survey-context-builder.ts';

export function buildPredictiveScheduleItems(
  slots: ScheduledPredictiveSlot[],
  correlationId?: string
): PredictiveMonthlyScheduleItem[] {
  return slots.map(slot => {
    const cand = slot.candidate;
    const score = cand.priority_score?.total_score || 0;

    let severity: PredictiveSeverity = 'MEDIA';
    if (score >= 75) severity = 'CRITICA';
    else if (score >= 50) severity = 'ALTA';
    else if (score >= 30) severity = 'MEDIA';
    else severity = 'BAJA';

    const surveyCtx = buildPredictiveSurveyContext(cand, correlationId);
    const mStr = String(slot.target_month).padStart(2, '0');

    return {
      contract_id: 'PREDICTIVE-SCHEDULE-001',
      contract_version: '1.0',
      target_year: slot.target_year,
      target_month: slot.target_month,
      month_str: `${slot.target_year}-${mStr}`,
      machine_id: slot.machine_id,
      department: 'PF',
      rank_position: slot.rank_position,
      scheduled_date: slot.scheduled_date,
      activity_title: `Intervención Predictiva PF: Telar #${slot.rank_position} en Segundas`,
      description: `Levantamiento predictivo priorizado por ${cand.quality_metrics.total_segundas} segundas detectadas en los últimos 30 días (Score: ${score} pts).`,
      source_metric: 'SEGUNDAS_POR_ROLLO',
      total_segundas_30d: cand.quality_metrics.total_segundas,
      priority_score: score,
      severity,
      form_family: 'LEVANTAMIENTO_PREDICTIVO',
      required_blocks: surveyCtx.required_blocks,
      survey_context: surveyCtx
    };
  });
}
