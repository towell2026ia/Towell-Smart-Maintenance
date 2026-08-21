// supabase/functions/agents-orchestrator/agents/ag010/adapters/ag008-failure-intelligence-adapter.ts
// Adapter for AG-008 Failure Intelligence Signals (v1.0)
// Frozen under Token: AG010-DATA-MAP-001
// Invariant: AG-008 signal is DERIVED_SIGNAL; AG-010 does NOT recalculate metrics (§31-33 PRD-AG-010.2)

import type { AG010EvidenceItem, ScoreSourceReference } from '../types/ag010.types.ts';

export class AG008FailureIntelligenceAdapter {
  public static extractSignals(
    assetId: string,
    failureContext: any,
    evaluationAt: string
  ): AG010EvidenceItem[] {
    if (!failureContext) return [];
    const items: AG010EvidenceItem[] = [];

    const defaultSourceRef: ScoreSourceReference = {
      source_name: 'ag008_intelligence',
      source_table: 'signals',
      source_id: `SIG-AG008-${assetId}`,
      retrieved_at: evaluationAt,
      relationship_type: 'AGENT_CONTEXT'
    };

    if (failureContext.total_failures_90d !== undefined) {
      items.push({
        evidence_id: `EV-SIG-FAIL-COUNT-${assetId}`,
        evidence_type: 'AG008_SIGNAL',
        evidence_class: 'DERIVED_SIGNAL',
        asset_id: assetId,
        occurred_at: evaluationAt,
        fact: `Frecuencia de fallas en 90 días: ${failureContext.total_failures_90d} eventos.`,
        source_reference: defaultSourceRef,
        quality: 'CERTIFIED'
      });
    }

    if (failureContext.failure_trend) {
      items.push({
        evidence_id: `EV-SIG-TREND-${assetId}`,
        evidence_type: 'AG008_SIGNAL',
        evidence_class: 'DERIVED_SIGNAL',
        asset_id: assetId,
        occurred_at: evaluationAt,
        fact: `Tendencia de falla calculada por AG-008: ${failureContext.failure_trend}.`,
        source_reference: defaultSourceRef,
        quality: 'CERTIFIED'
      });
    }

    return items;
  }
}
