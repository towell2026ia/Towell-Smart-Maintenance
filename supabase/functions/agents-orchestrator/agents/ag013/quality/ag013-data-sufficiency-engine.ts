// supabase/functions/agents-orchestrator/agents/ag013/quality/ag013-data-sufficiency-engine.ts
// Data Sufficiency & Eligibility Engine for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

export interface DataSufficiencyResult {
  data_sufficiency_index: number;
  sufficiency_level: 'HIGH' | 'MODERATE' | 'INSUFFICIENT';
  is_eligible_for_classification: boolean;
  missing_critical_dimensions: string[];
}

export class AG013DataSufficiencyEngine {
  public static evaluate(
    hasAssetInfo: boolean,
    hasFailures: boolean,
    hasCosts: boolean,
    hasHealth: boolean
  ): DataSufficiencyResult {
    const missing: string[] = [];
    if (!hasAssetInfo) missing.push('ASSET_IDENTITY');
    if (!hasFailures) missing.push('FAILURE_DATA');
    if (!hasCosts) missing.push('ECONOMIC_DATA');
    if (!hasHealth) missing.push('HEALTH_DATA');

    const totalCritical = 4;
    const present = totalCritical - missing.length;
    const dsi = Number(((present / totalCritical) * 100).toFixed(2));

    let level: 'HIGH' | 'MODERATE' | 'INSUFFICIENT' = 'INSUFFICIENT';
    let isEligible = false;

    if (dsi >= 75 && missing.length <= 1) {
      level = 'HIGH';
      isEligible = true;
    } else if (dsi >= 50 && missing.length <= 2) {
      level = 'MODERATE';
      isEligible = true;
    } else {
      level = 'INSUFFICIENT';
      isEligible = false;
    }

    return {
      data_sufficiency_index: dsi,
      sufficiency_level: level,
      is_eligible_for_classification: isEligible,
      missing_critical_dimensions: missing
    };
  }
}
