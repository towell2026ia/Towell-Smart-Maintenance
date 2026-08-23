// supabase/functions/agents-orchestrator/agents/ag012/audit/ag012-decision-audit.ts
// Decision Audit Logger for AG-012 (v1.0)
// Frozen under Token: AG012-DECISION-ENGINE-001

import type { InterventionRecommendationPackage } from '../types/ag012.types.ts';
import { AG012DecisionConfigRegistry } from '../config/ag012-decision-config-registry.ts';

export class AG012DecisionAudit {
  public static logExecution(
    pkg: InterventionRecommendationPackage,
    durationMs: number,
    requestId?: string
  ): any {
    const evidence = AG012DecisionConfigRegistry.getCompositeDecisionModelEvidence();

    const auditEntry = {
      event_type: 'AG012_INTERVENTION_STRATEGY_EVALUATED',
      timestamp: new Date().toISOString(),
      request_id: requestId || `REQ-${pkg.asset_id}`,
      agent_id: 'AG-012',
      asset_id: pkg.asset_id,
      evaluation_at: pkg.evaluation_at,
      decision_context: pkg.decision_context,
      recommendation: pkg.recommendation,
      data_sufficiency_index: pkg.data_quality.data_sufficiency_index,
      sufficiency_level: pkg.data_quality.sufficiency_level,
      decision_scores_count: pkg.decision_scores.length,
      hard_rules_triggered_count: pkg.hard_rules_applied.filter(r => r.triggered).length,
      missing_information_count: pkg.missing_information.length,
      decision_model_sha256: evidence.ag012_decision_model_sha256,
      duration_ms: durationMs,
      provider: 'NONE',
      llm_calls: 0,
      tokens: 0,
      cost_usd: 0
    };

    return auditEntry;
  }
}
