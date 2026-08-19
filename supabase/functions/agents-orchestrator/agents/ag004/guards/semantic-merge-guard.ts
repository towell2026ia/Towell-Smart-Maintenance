// supabase/functions/agents-orchestrator/agents/ag004/guards/semantic-merge-guard.ts
// Strict Merge Guard for AG-004 (Deterministic Inviolability)

import { AutonomousSemanticInputPayload } from '../contracts/semantic-input.contract.ts';
import { AutonomousSemanticOutputPayload } from '../contracts/semantic-output.contract.ts';
import { OFFICIAL_5_BLOCKS } from '../rules/checklist-validation.rules.ts';

export interface MergedAutonomousContext {
  machine_id: string;
  department: string;
  target_week: string;
  scheduled_date: string;
  calendar_reference: string;
  survey_reference: string;
  form_family: 'LEVANTAMIENTO_AUTONOMO';
  checklist_blocks: readonly string[];
  temperature_required: true;
  semantic_context: {
    executive_summary: string;
    historical_context_summary: string;
    pattern_codes: string[];
    inspection_focus: string[];
    attention_notes: string[];
    data_quality_warnings: string[];
    technical_context: string[];
    source_references: string[];
    requires_human_review: boolean;
  } | null;
  merge_audit: {
    deterministic_wins: true;
    overrides_rejected: number;
  };
}

export function mergeAutonomousDeterministicAndSemantic(
  deterministicInput: AutonomousSemanticInputPayload,
  semanticOutput: AutonomousSemanticOutputPayload | null
): MergedAutonomousContext {
  let overridesRejected = 0;

  // Verify that semantic output did not attempt to mutate protected deterministic values
  if (semanticOutput) {
    if (semanticOutput.machine_id !== deterministicInput.machine.machine_id) {
      overridesRejected++;
    }
  }

  return {
    machine_id: deterministicInput.machine.machine_id,
    department: deterministicInput.machine.department,
    target_week: deterministicInput.target_week.week_key,
    scheduled_date: deterministicInput.schedule.scheduled_date,
    calendar_reference: deterministicInput.schedule.calendar_reference,
    survey_reference: deterministicInput.schedule.survey_reference,
    form_family: 'LEVANTAMIENTO_AUTONOMO',
    checklist_blocks: OFFICIAL_5_BLOCKS,
    temperature_required: true,
    semantic_context: semanticOutput ? {
      executive_summary: semanticOutput.executive_summary,
      historical_context_summary: semanticOutput.historical_context_summary,
      pattern_codes: semanticOutput.pattern_codes,
      inspection_focus: semanticOutput.inspection_focus,
      attention_notes: semanticOutput.attention_notes,
      data_quality_warnings: semanticOutput.data_quality_warnings,
      technical_context: semanticOutput.technical_context,
      source_references: semanticOutput.source_references,
      requires_human_review: semanticOutput.requires_human_review
    } : null,
    merge_audit: {
      deterministic_wins: true,
      overrides_rejected: overridesRejected
    }
  };
}
