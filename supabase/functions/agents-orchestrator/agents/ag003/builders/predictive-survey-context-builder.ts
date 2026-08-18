// supabase/functions/agents-orchestrator/agents/ag003/builders/predictive-survey-context-builder.ts
// Predictive Survey Context Builder (§95, §96 PRD)

import { PredictiveBlock, PredictiveCandidate } from '../types/ag003.types.ts';

export interface PredictiveSurveyContext {
  form_family: 'LEVANTAMIENTO_PREDICTIVO';
  required_blocks: PredictiveBlock[];
  correlation_id: string;
  candidate_reason: string;
  focus_areas: string[];
}

export function buildPredictiveSurveyContext(
  candidate: PredictiveCandidate,
  correlationId?: string
): PredictiveSurveyContext {
  const corrId = correlationId || `corr-pred-${candidate.machine_id}-${Date.now()}`;
  const totalSeg = candidate.quality_metrics?.total_segundas || 0;
  const devRate = candidate.deviation?.relative_deviation || 0;

  const focusAreas: string[] = [];
  if (devRate > 0.20) {
    focusAreas.push(`Desviación de calidad +${(devRate * 100).toFixed(0)}% vs baseline`);
  }
  if (candidate.historical_context.failures_count > 0) {
    focusAreas.push(`Historial reciente de ${candidate.historical_context.failures_count} paros/fallas`);
  }
  if (focusAreas.length === 0) {
    focusAreas.push(`Inspección preventiva rutinaria de calidad (${totalSeg} segundas detectadas)`);
  }

  return {
    form_family: 'LEVANTAMIENTO_PREDICTIVO',
    required_blocks: ['Electrónico', 'Mecánico', 'Limpieza', 'Lubricación'],
    correlation_id: corrId,
    candidate_reason: candidate.selection_reason || `Telar prioritario por ${totalSeg} segundas en últimos 30 días.`,
    focus_areas: focusAreas
  };
}
