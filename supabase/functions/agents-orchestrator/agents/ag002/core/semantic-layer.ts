// supabase/functions/agents-orchestrator/agents/ag002/core/semantic-layer.ts
// Central Semantic Interpretation Layer for AG-002.3 (§1-102 PRD)

import { PlannedPreventiveSlot, MachinePreventiveProfile } from '../types/ag002.types.ts';
import { 
  EnrichedPreventivePlanItem, 
  SemanticAuditRecord, 
  SemanticInputPayload 
} from '../types/ag002-semantic.types.ts';
import { detectPrecalculatedPatterns } from '../catalog/pattern-catalog.ts';
import { AG002_PROMPT_VERSION } from '../prompts/ag002-semantic.prompt.ts';
import { AG002_SEMANTIC_INPUT_VERSION } from '../contracts/ag002-semantic-input.contract.ts';
import { AG002_SEMANTIC_OUTPUT_VERSION } from '../contracts/ag002-semantic-output.contract.ts';
import { validateSemanticOutput } from '../validators/semantic-validator.ts';
import { mergeDeterministicAndSemantic } from '../guards/semantic-merge-guard.ts';
import { evaluateShouldUseSemanticLayer } from '../decision/should-use-semantic-layer.ts';
import { IMiMoProvider, MockMiMoProvider } from '../adapters/mimo-provider.adapter.ts';

export class SemanticInterpretationLayer {
  private provider: IMiMoProvider;
  private modelVersion: string;

  constructor(provider?: IMiMoProvider, modelVersion: string = 'mimo-v2.5') {
    this.provider = provider || new MockMiMoProvider();
    this.modelVersion = modelVersion;
  }

  public async enrichSlot(
    slot: PlannedPreventiveSlot,
    profile: MachinePreventiveProfile,
    rawHistoricalItems: Array<{ source: string; date: string; description: string; reference_id: string }> = [],
    envFlags: { mimoEnabled?: boolean; llmCallsEnabled?: boolean; hasApiKey?: boolean } = { mimoEnabled: true, llmCallsEnabled: true, hasApiKey: true }
  ): Promise<{ enrichedItem: EnrichedPreventivePlanItem; auditRecord: SemanticAuditRecord }> {
    const decision = evaluateShouldUseSemanticLayer(profile, envFlags);

    // Fast Path fallback if semantic interpretation is skipped
    if (!decision.shouldCall) {
      const fallbackMerge = mergeDeterministicAndSemantic(slot, null, this.modelVersion);
      return {
        enrichedItem: fallbackMerge.enrichedItem,
        auditRecord: {
          event_id: `sem-audit-${Date.now()}-${slot.machine_id}`,
          agent_id: 'AG-002',
          machine_id: slot.machine_id,
          provider: 'MOCK',
          model: this.modelVersion,
          prompt_version: AG002_PROMPT_VERSION,
          input_version: AG002_SEMANTIC_INPUT_VERSION,
          output_version: AG002_SEMANTIC_OUTPUT_VERSION,
          llm_used: false,
          input_tokens: 0,
          output_tokens: 0,
          estimated_cost_usd: 0,
          cost_status: 'ZERO',
          latency_ms: 0,
          validation_passed: true,
          merge_passed: true,
          status: 'FALLBACK_TO_DETERMINISTIC',
          error_code: decision.reason
        }
      };
    }

    // 1. Build Precalculated Patterns
    const prePatterns = detectPrecalculatedPatterns({
      criticality: profile.criticality_level,
      failuresCount: profile.recurrence_metrics.failure_count_12m,
      repeatedFailures: profile.recurrence_metrics.repeated_failure_count,
      downtimeHours: profile.downtime_metrics.downtime_hours_12m,
      correctivesCount: profile.maintenance_history.corrective_work_orders_12m,
      daysSinceLastPrev: profile.maintenance_history.days_since_last_preventive,
      hasPartsUnknownCost: profile.budget_status === 'PARTIAL',
      isNewMachine: profile.maintenance_history.preventive_count_lifetime === 0 && profile.recurrence_metrics.failure_count_12m === 0
    });

    // 2. Build Semantic Input Payload
    const semanticInput: SemanticInputPayload = {
      contract_id: 'AG002-SEMANTIC-INPUT-001',
      contract_version: '1.0',
      target_year: slot.year,
      generation_date: new Date().toISOString().split('T')[0],
      machine: {
        machine_id: slot.machine_id,
        department_code: slot.department,
        is_active: profile.is_active,
        is_loom: slot.is_loom,
        criticality_level: profile.criticality_level
      },
      metrics: {
        failure_count_12m: profile.recurrence_metrics.failure_count_12m,
        repeated_failure_count: profile.recurrence_metrics.repeated_failure_count,
        failures_by_category: profile.recurrence_metrics.categories_count,
        work_order_count_12m: profile.recurrence_metrics.work_order_count_12m,
        corrective_work_orders_12m: profile.maintenance_history.corrective_work_orders_12m,
        downtime_minutes_12m: profile.downtime_metrics.downtime_minutes_12m,
        downtime_hours_12m: profile.downtime_metrics.downtime_hours_12m,
        days_since_last_preventive: profile.maintenance_history.days_since_last_preventive
      },
      priority: {
        priority_score: slot.priority_score,
        priority_band: slot.priority_band,
        components: {
          criticality_score: profile.priority_components.criticality_score,
          recurrence_score: profile.priority_components.recurrence_score,
          downtime_score: profile.priority_components.downtime_score,
          corrective_frequency_score: profile.priority_components.corrective_frequency_score,
          preventive_age_score: profile.priority_components.preventive_age_score
        }
      },
      service: {
        service_code: slot.service_code,
        service_name: slot.service_name,
        estimated_duration_min: slot.estimated_duration_min
      },
      parts: {
        parts_count: slot.planned_parts.length,
        parts_list: profile.estimated_parts.map(p => ({
          cve_refaccion: p.cve_refaccion,
          nombre: p.nombre,
          cantidad: p.cantidad,
          price_status: p.price_status
        })),
        known_cost_total: slot.parts_cost_known,
        budget_status: slot.budget_status
      },
      schedule: {
        scheduled_date: slot.scheduled_date,
        week_number: slot.week_number,
        month_number: slot.month_number,
        calendar_reference: slot.calendar_reference
      },
      precalculated_patterns: prePatterns,
      untrusted_historical_content: rawHistoricalItems
    };

    // 3. Invoke MiMo Provider
    const mimoRes = await this.provider.interpretMachine(semanticInput);

    if (!mimoRes.success) {
      const fallback = mergeDeterministicAndSemantic(slot, null, this.modelVersion);
      return {
        enrichedItem: fallback.enrichedItem,
        auditRecord: {
          event_id: `sem-audit-${Date.now()}-${slot.machine_id}`,
          agent_id: 'AG-002',
          machine_id: slot.machine_id,
          provider: 'MIMO',
          model: this.modelVersion,
          prompt_version: AG002_PROMPT_VERSION,
          input_version: AG002_SEMANTIC_INPUT_VERSION,
          output_version: AG002_SEMANTIC_OUTPUT_VERSION,
          llm_used: true,
          input_tokens: mimoRes.input_tokens,
          output_tokens: mimoRes.output_tokens,
          estimated_cost_usd: 0,
          cost_status: 'UNKNOWN',
          latency_ms: mimoRes.latency_ms,
          validation_passed: false,
          merge_passed: false,
          status: 'FALLBACK_TO_DETERMINISTIC',
          error_code: mimoRes.error_code || 'PROVIDER_ERROR'
        }
      };
    }

    // 4. Validate Semantic Output Schema
    const val = validateSemanticOutput(mimoRes.rawJson, slot.machine_id);

    if (!val.isValid) {
      const fallback = mergeDeterministicAndSemantic(slot, null, this.modelVersion);
      return {
        enrichedItem: fallback.enrichedItem,
        auditRecord: {
          event_id: `sem-audit-${Date.now()}-${slot.machine_id}`,
          agent_id: 'AG-002',
          machine_id: slot.machine_id,
          provider: 'MIMO',
          model: this.modelVersion,
          prompt_version: AG002_PROMPT_VERSION,
          input_version: AG002_SEMANTIC_INPUT_VERSION,
          output_version: AG002_SEMANTIC_OUTPUT_VERSION,
          llm_used: true,
          input_tokens: mimoRes.input_tokens,
          output_tokens: mimoRes.output_tokens,
          estimated_cost_usd: 0,
          cost_status: 'UNKNOWN',
          latency_ms: mimoRes.latency_ms,
          validation_passed: false,
          merge_passed: false,
          status: 'VALIDATION_FAILED',
          error_code: val.errors[0]
        }
      };
    }

    // 5. Merge through Merge Guard
    const merge = mergeDeterministicAndSemantic(slot, val.repairedPayload, this.modelVersion);

    return {
      enrichedItem: merge.enrichedItem,
      auditRecord: {
        event_id: `sem-audit-${Date.now()}-${slot.machine_id}`,
        agent_id: 'AG-002',
        machine_id: slot.machine_id,
        provider: 'MIMO',
        model: this.modelVersion,
        prompt_version: AG002_PROMPT_VERSION,
        input_version: AG002_SEMANTIC_INPUT_VERSION,
        output_version: AG002_SEMANTIC_OUTPUT_VERSION,
        llm_used: true,
        input_tokens: mimoRes.input_tokens,
        output_tokens: mimoRes.output_tokens,
        estimated_cost_usd: 0,
        cost_status: 'UNKNOWN',
        latency_ms: mimoRes.latency_ms,
        validation_passed: true,
        merge_passed: merge.isCleanMerge,
        status: 'SUCCESS'
      }
    };
  }
}
