// supabase/functions/agents-orchestrator/agents/ag002/guards/semantic-merge-guard.ts
// Semantic Merge Guard protecting deterministic fields (§9, §10, §11, §50 PRD)

import { PlannedPreventiveSlot } from '../types/ag002.types.ts';
import { EnrichedPreventivePlanItem, SemanticOutputPayload } from '../types/ag002-semantic.types.ts';

export const PROTECTED_DETERMINISTIC_FIELDS = [
  'machine_id',
  'department',
  'year',
  'scheduled_date',
  'week_number',
  'month_number',
  'priority_score',
  'priority_band',
  'service_code',
  'service_name',
  'estimated_duration_min',
  'planned_parts',
  'parts_cost_known',
  'budget_status',
  'calendar_reference'
] as const;

export interface MergeResult {
  enrichedItem: EnrichedPreventivePlanItem;
  overridesAttempted: string[];
  isCleanMerge: boolean;
}

export function mergeDeterministicAndSemantic(
  deterministicSlot: PlannedPreventiveSlot,
  semanticOutput?: SemanticOutputPayload | null,
  modelVersion: string = 'mimo-v2.5'
): MergeResult {
  const overridesAttempted: string[] = [];

  // Base deterministic enriched item
  const baseEnriched: EnrichedPreventivePlanItem = {
    machine_id: deterministicSlot.machine_id,
    department: deterministicSlot.department,
    year: deterministicSlot.year,
    scheduled_date: deterministicSlot.scheduled_date,
    week_number: deterministicSlot.week_number,
    month_number: deterministicSlot.month_number,
    priority_score: deterministicSlot.priority_score,
    priority_band: deterministicSlot.priority_band,
    service_code: deterministicSlot.service_code,
    service_name: deterministicSlot.service_name,
    estimated_duration_min: deterministicSlot.estimated_duration_min,
    planned_parts: deterministicSlot.planned_parts,
    parts_cost_known: deterministicSlot.parts_cost_known,
    budget_status: deterministicSlot.budget_status,
    calendar_reference: deterministicSlot.calendar_reference,
    semantic_status: 'DETERMINISTIC_ONLY_FALLBACK'
  };

  if (!semanticOutput) {
    return {
      enrichedItem: baseEnriched,
      overridesAttempted: [],
      isCleanMerge: true
    };
  }

  // Check if AI output attempted to pass different values for protected fields
  const semObj = semanticOutput as any;
  if (semObj.scheduled_date && semObj.scheduled_date !== deterministicSlot.scheduled_date) {
    overridesAttempted.push(`scheduled_date: AI='${semObj.scheduled_date}' vs DET='${deterministicSlot.scheduled_date}'`);
  }
  if (semObj.priority_score !== undefined && semObj.priority_score !== deterministicSlot.priority_score) {
    overridesAttempted.push(`priority_score: AI='${semObj.priority_score}' vs DET='${deterministicSlot.priority_score}'`);
  }
  if (semObj.service_code && semObj.service_code !== deterministicSlot.service_code) {
    overridesAttempted.push(`service_code: AI='${semObj.service_code}' vs DET='${deterministicSlot.service_code}'`);
  }
  if (semObj.machine_id && semObj.machine_id !== deterministicSlot.machine_id) {
    overridesAttempted.push(`machine_id: AI='${semObj.machine_id}' vs DET='${deterministicSlot.machine_id}'`);
  }

  // Pure clean merge: Semantic details are placed strictly into semantic_interpretation
  const enrichedWithSemantic: EnrichedPreventivePlanItem = {
    ...baseEnriched,
    semantic_status: 'ENRICHED',
    semantic_interpretation: {
      model_version: modelVersion,
      executive_summary: semanticOutput.executive_summary,
      priority_explanation: semanticOutput.priority_explanation,
      pattern_codes: semanticOutput.pattern_codes,
      preventive_focus: semanticOutput.preventive_focus,
      historical_observations: semanticOutput.historical_observations,
      parts_observations: semanticOutput.parts_observations,
      data_quality_warnings: semanticOutput.data_quality_warnings,
      recommendation: semanticOutput.recommendation,
      source_references: semanticOutput.source_references,
      requires_human_review: semanticOutput.requires_human_review
    }
  };

  return {
    enrichedItem: enrichedWithSemantic,
    overridesAttempted,
    isCleanMerge: overridesAttempted.length === 0
  };
}
