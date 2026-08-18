// supabase/functions/agents-orchestrator/agents/ag002/catalog/pattern-catalog.ts
// Closed Pattern Catalog for AG-002.3 (§19, §20, §21 PRD)

import { PatternCode } from '../types/ag002-semantic.types.ts';

export const AG002_PATTERN_CATALOG_VERSION = 'AG002-PATTERN-CATALOG-001';

export const VALID_PATTERN_CODES: ReadonlySet<PatternCode> = new Set([
  'HIGH_FAILURE_RECURRENCE',
  'SHORT_FAILURE_INTERVAL',
  'HIGH_CORRECTIVE_FREQUENCY',
  'HIGH_DOWNTIME',
  'CRITICAL_ASSET',
  'REPEATED_COMPONENT_FAILURE',
  'HIGH_PARTS_CONSUMPTION',
  'LONG_TIME_SINCE_PREVENTIVE',
  'INSUFFICIENT_HISTORY',
  'INCOMPLETE_DOWNTIME_DATA',
  'UNKNOWN_PART_COST',
  'NEW_MACHINE',
  'NO_SIGNIFICANT_PATTERN'
]);

export function isValidPatternCode(code: string): code is PatternCode {
  return VALID_PATTERN_CODES.has(code as PatternCode);
}

export function detectPrecalculatedPatterns(input: {
  criticality: string;
  failuresCount: number;
  repeatedFailures: number;
  downtimeHours: number;
  correctivesCount: number;
  daysSinceLastPrev: number | null;
  hasPartsUnknownCost: boolean;
  isNewMachine: boolean;
}): PatternCode[] {
  const patterns: PatternCode[] = [];

  if (input.isNewMachine) {
    patterns.push('NEW_MACHINE');
    patterns.push('INSUFFICIENT_HISTORY');
    return patterns;
  }

  if (input.criticality === 'Muy Alta' || input.criticality === 'A') {
    patterns.push('CRITICAL_ASSET');
  }

  if (input.failuresCount >= 5) {
    patterns.push('HIGH_FAILURE_RECURRENCE');
  }

  if (input.repeatedFailures >= 2) {
    patterns.push('REPEATED_COMPONENT_FAILURE');
  }

  if (input.downtimeHours >= 10) {
    patterns.push('HIGH_DOWNTIME');
  }

  if (input.correctivesCount >= 3) {
    patterns.push('HIGH_CORRECTIVE_FREQUENCY');
  }

  if (input.daysSinceLastPrev !== null && input.daysSinceLastPrev > 365) {
    patterns.push('LONG_TIME_SINCE_PREVENTIVE');
  }

  if (input.hasPartsUnknownCost) {
    patterns.push('UNKNOWN_PART_COST');
  }

  if (patterns.length === 0) {
    patterns.push('NO_SIGNIFICANT_PATTERN');
  }

  return patterns;
}
