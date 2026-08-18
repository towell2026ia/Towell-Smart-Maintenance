// supabase/functions/agents-orchestrator/agents/ag003/guards/semantic-merge-guard.ts
// Semantic Merge Guard for AG-003.3 (§71-79 PRD)

import { PredictiveCandidate, PredictiveMonthlyScheduleItem } from '../types/ag003.types.ts';
import { SemanticOutputPayload } from '../contracts/semantic-output.contract.ts';

export interface EnrichedPredictiveItem extends PredictiveMonthlyScheduleItem {
  semantic_enrichment?: SemanticOutputPayload;
  merge_status: 'DETERMINISTIC_PRESERVED' | 'MERGE_FAILED';
}

export function mergeDeterministicWithSemantic(
  deterministicItem: PredictiveMonthlyScheduleItem,
  candidate: PredictiveCandidate,
  semanticOutput?: SemanticOutputPayload
): EnrichedPredictiveItem {
  // Deterministic Invariants Always Win
  const preservedItem: EnrichedPredictiveItem = {
    ...deterministicItem,
    contract_id: 'PREDICTIVE-SCHEDULE-001',
    contract_version: '1.0',
    target_year: deterministicItem.target_year,
    target_month: deterministicItem.target_month,
    month_str: deterministicItem.month_str,
    machine_id: deterministicItem.machine_id,
    department: 'PF',
    rank_position: deterministicItem.rank_position,
    scheduled_date: deterministicItem.scheduled_date,
    source_metric: 'SEGUNDAS_POR_ROLLO',
    total_segundas_30d: deterministicItem.total_segundas_30d,
    priority_score: deterministicItem.priority_score,
    form_family: 'LEVANTAMIENTO_PREDICTIVO',
    required_blocks: ['Electrónico', 'Mecánico', 'Limpieza', 'Lubricación'],
    merge_status: 'DETERMINISTIC_PRESERVED'
  };

  if (semanticOutput && semanticOutput.machine_id === deterministicItem.machine_id) {
    preservedItem.semantic_enrichment = semanticOutput;
    // Update description and focus areas in context if available
    if (semanticOutput.executive_summary) {
      preservedItem.description = `${semanticOutput.executive_summary} (Score: ${deterministicItem.priority_score} pts)`;
    }
  }

  return preservedItem;
}
