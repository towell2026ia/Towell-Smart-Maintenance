// supabase/functions/agents-orchestrator/agents/ag010/adapters/m011-health-risk-adapter.ts
// Adapter for M-011 Health & Risk Index Context Consumption (v1.0)
// Frozen under Token: AG010-DATA-MAP-001
// Invariant: POOR HEALTH != ROOT CAUSE; HIGH RISK != ROOT CAUSE (§34-35 PRD-AG-010.2)

import type { AG010EvidenceItem, ScoreSourceReference } from '../types/ag010.types.ts';

export class M011HealthRiskAdapter {
  public static extractSignals(
    assetId: string,
    healthRiskContext: any,
    evaluationAt: string
  ): AG010EvidenceItem[] {
    if (!healthRiskContext) return [];
    const items: AG010EvidenceItem[] = [];

    const defaultSourceRef: ScoreSourceReference = {
      source_name: 'm011_health_risk',
      source_table: 'evaluations',
      source_id: `EVAL-M011-${assetId}`,
      retrieved_at: evaluationAt,
      relationship_type: 'MODULE_CONTEXT'
    };

    if (healthRiskContext.health_score !== undefined && healthRiskContext.health_score !== null) {
      items.push({
        evidence_id: `EV-SIG-HEALTH-${assetId}`,
        evidence_type: 'M011_HEALTH_COMPONENT',
        evidence_class: 'DERIVED_SIGNAL',
        asset_id: assetId,
        occurred_at: evaluationAt,
        fact: `Índice de Salud de activo: ${healthRiskContext.health_score} (${healthRiskContext.health_state || 'UNKNOWN'}).`,
        source_reference: defaultSourceRef,
        quality: 'CERTIFIED'
      });
    }

    if (healthRiskContext.risk_score !== undefined && healthRiskContext.risk_score !== null) {
      items.push({
        evidence_id: `EV-SIG-RISK-${assetId}`,
        evidence_type: 'M011_HEALTH_COMPONENT',
        evidence_class: 'DERIVED_SIGNAL',
        asset_id: assetId,
        occurred_at: evaluationAt,
        fact: `Índice de Riesgo de activo: ${healthRiskContext.risk_score} (${healthRiskContext.risk_state || 'UNKNOWN'}).`,
        source_reference: defaultSourceRef,
        quality: 'CERTIFIED'
      });
    }

    return items;
  }
}
