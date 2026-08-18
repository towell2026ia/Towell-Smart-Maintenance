// supabase/functions/agents-orchestrator/agents/ag003/catalog/pattern-catalog.ts
// Closed Pattern Catalog for AG-003.3 (§33-37 PRD)

export const PATTERN_CATALOG_VERSION = 'AG003-PATTERN-CATALOG-001';

export const VALID_PREDICTIVE_PATTERNS = [
  'HIGH_QUALITY_DEVIATION',
  'MODERATE_QUALITY_DEVIATION',
  'PERSISTENT_QUALITY_DEGRADATION',
  'RECENT_QUALITY_INCREASE',
  'QUALITY_STABLE',
  'QUALITY_IMPROVING',
  'LOW_DATA_CONFIDENCE',
  'INSUFFICIENT_SAMPLE',
  'NO_PRODUCTION_DATA',
  'BASELINE_NOT_AVAILABLE',
  'HIGH_FAILURE_CONTEXT',
  'REPEATED_FAILURE_CONTEXT',
  'HIGH_DOWNTIME_CONTEXT',
  'CRITICAL_ASSET_CONTEXT',
  'RECENT_PREDICTIVE_INSPECTION',
  'LONG_TIME_SINCE_PREDICTIVE',
  'NO_SIGNIFICANT_PREDICTIVE_PATTERN'
] as const;

export type PredictivePatternCode = typeof VALID_PREDICTIVE_PATTERNS[number];

export function isAuthorizedPattern(pattern: string): pattern is PredictivePatternCode {
  return VALID_PREDICTIVE_PATTERNS.includes(pattern as PredictivePatternCode);
}
