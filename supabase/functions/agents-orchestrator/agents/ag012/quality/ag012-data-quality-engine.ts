// supabase/functions/agents-orchestrator/agents/ag012/quality/ag012-data-quality-engine.ts
// Data Quality Engine for AG-012 (v1.0)
// Frozen under Token: AG012-DATA-QUALITY-ENGINE-001

import type { DecisionFact, DataQualitySummary } from '../types/ag012.types.ts';

export class AG012DataQualityEngine {
  private static readonly CRITICAL_DIMENSIONS = [
    'asset_identity',
    'health_score',
    'failure_count_12m',
    'recent_maintenance_cost_12m'
  ];

  public static evaluate(facts: DecisionFact[]): DataQualitySummary {
    const certifiedFacts = facts.filter(f => f.quality === 'CERTIFIED');
    const presentFactNames = new Set(facts.map(f => f.name));

    const missingCritical: string[] = [];
    for (const dim of this.CRITICAL_DIMENSIONS) {
      if (!presentFactNames.has(dim)) {
        missingCritical.push(dim);
      }
    }

    const totalRequired = this.CRITICAL_DIMENSIONS.length + 3; // base 7 factors
    const dsi = Math.round((certifiedFacts.length / totalRequired) * 100);

    let sufficiencyLevel: 'HIGH' | 'MODERATE' | 'INSUFFICIENT' = 'INSUFFICIENT';
    if (dsi >= 70 && missingCritical.length === 0) {
      sufficiencyLevel = 'HIGH';
    } else if (dsi >= 50 && missingCritical.length <= 1) {
      sufficiencyLevel = 'MODERATE';
    }

    return {
      data_sufficiency_index: Math.min(100, dsi),
      sufficiency_level: sufficiencyLevel,
      certified_facts_count: certifiedFacts.length,
      total_required_facts_count: totalRequired,
      missing_critical_fields: missingCritical
    };
  }
}
