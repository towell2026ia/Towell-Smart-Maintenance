// supabase/functions/agents-orchestrator/modules/m011/freshness/health-risk-freshness-resolver.ts
// Calculation Fingerprint & Freshness Resolver for M-011 (v1.0)
// Frozen under Token: M011-FRESHNESS-RULES-001
// Invariant: Identical context + model produce identical calculation fingerprint (§148-153 PRD-M-011.2)

export function computeHealthRiskFingerprint(params: {
  assetId: string;
  evaluationAt: string;
  healthScore: number | null;
  riskScore: number | null;
  healthModelVersion: string;
  riskModelVersion: string;
}): string {
  const rawString = `${params.assetId}_${params.evaluationAt}_H:${params.healthScore}_R:${params.riskScore}_${params.healthModelVersion}_${params.riskModelVersion}`;
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `VER-M011-${params.assetId}-${Math.abs(hash).toString(16)}`;
}
