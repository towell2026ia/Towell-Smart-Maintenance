// supabase/functions/agents-orchestrator/modules/m010/freshness/asset-freshness-resolver.ts
// Logical Asset Record Fingerprint & Freshness Resolver (v1.0)
// Frozen under Token: M010-FRESHNESS-RULES-001
// Invariant: Stable fingerprint for identical data; changes when new source events occur (§126-132 PRD)

export function computeAssetRecordFingerprint(params: {
  assetId: string;
  recordCounts: Record<string, number>;
  maxTimestamp?: string | null;
  ruleVersion?: string;
}): string {
  const version = params.ruleVersion || 'M010-1.0';
  const countsKey = Object.entries(params.recordCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');

  const rawString = `${params.assetId}_${countsKey}_${params.maxTimestamp || 'none'}_${version}`;
  
  // Simple deterministic hash
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }

  return `VER-M010-${params.assetId}-${Math.abs(hash).toString(16)}`;
}
