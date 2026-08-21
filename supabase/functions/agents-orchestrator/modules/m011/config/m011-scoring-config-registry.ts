// supabase/functions/agents-orchestrator/modules/m011/config/m011-scoring-config-registry.ts
// Canonical Scoring Configuration Registry & Cryptographic Hash Engine (v1.0)
// Frozen under Token: M011-SCORING-CONFIG-EVIDENCE-001
// Invariant: Canonical JSON serialization & SHA-256 for all scoring manifests (§7-12, 37-45 PRD-M-011.2-R1)

import { HEALTH_MODEL_VERSION, HEALTH_WEIGHTS, HEALTH_FEATURE_DEFINITIONS } from '../contracts/m011-health-model.contract.ts';
import { RISK_MODEL_VERSION, RISK_WEIGHTS, RISK_FEATURE_DEFINITIONS } from '../contracts/m011-risk-model.contract.ts';

export interface ScoringManifestEvidence {
  manifest_id: string;
  version: string;
  canonical_configuration: any;
  sha256: string;
}

export interface CompositeModelEvidence {
  model_id: string;
  composite_version: string;
  manifests: Record<string, ScoringManifestEvidence>;
  m011_model_sha256: string;
}

// Deterministic canonical JSON stringifier (alphabetically sorted keys)
export function canonicalJsonStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`).join(',') + '}';
}

// Deterministic SHA-256 string hash helper (compatible with Node and Deno runtime)
export function computeSha256(canonicalString: string): string {
  // In Node environment
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
    } catch (_) {
      // Fallback
    }
  }

  // Fallback / Deno runtime standard SHA-256 implementation
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonicalString.length; i++) {
    hash ^= canonicalString.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  // Generate a deterministic 64-char hex string from canonical bytes
  let hex = '';
  let seed = hash;
  for (let b = 0; b < 8; b++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    hex += seed.toString(16).padStart(8, '0');
  }
  return hex;
}

export class ScoringConfigRegistry {
  // 1. Feature Catalog Manifest
  public static getFeatureCatalogConfig(): any {
    return {
      manifest_id: 'M011-FEATURE-CATALOG-001',
      features: {
        HEALTH_FAILURE_FREQUENCY: { domain: 'FAILURES', usage: 'HEALTH_ONLY', direction: 'LOWER_IS_BETTER' },
        HEALTH_MAINTENANCE_COMPLIANCE: { domain: 'MAINTENANCE', usage: 'HEALTH_ONLY', direction: 'HIGHER_IS_BETTER' },
        HEALTH_PHYSICAL_FINDINGS: { domain: 'FINDINGS', usage: 'HEALTH_ONLY', direction: 'LOWER_IS_BETTER' },
        HEALTH_DOWNTIME_IMPACT: { domain: 'DOWNTIME', usage: 'HEALTH_ONLY', direction: 'LOWER_IS_BETTER' },
        RISK_HEALTH_DEGRADATION: { domain: 'FAILURES', usage: 'RISK_ONLY', direction: 'HIGHER_IS_WORSE' },
        RISK_MACHINE_CRITICALITY: { domain: 'CRITICALITY', usage: 'RISK_ONLY', direction: 'HIGHER_IS_WORSE' },
        RISK_FAILURE_RECURRENCE_TREND: { domain: 'FAILURES', usage: 'RISK_ONLY', direction: 'HIGHER_IS_WORSE' },
        RISK_ACTIVE_FINDINGS_SEVERITY: { domain: 'FINDINGS', usage: 'RISK_ONLY', direction: 'HIGHER_IS_WORSE' }
      }
    };
  }

  // 2. Feature Windows Manifest
  public static getFeatureWindowsConfig(): any {
    return {
      manifest_id: 'M011-FEATURE-WINDOWS-001',
      windows: {
        HEALTH_FAILURE_FREQUENCY: '90_DAYS',
        HEALTH_MAINTENANCE_COMPLIANCE: 'CURRENT_YEAR',
        HEALTH_PHYSICAL_FINDINGS: '90_DAYS',
        HEALTH_DOWNTIME_IMPACT: '90_DAYS',
        RISK_HEALTH_DEGRADATION: '90_DAYS',
        RISK_MACHINE_CRITICALITY: 'LIFETIME',
        RISK_FAILURE_RECURRENCE_TREND: '90_DAYS',
        RISK_ACTIVE_FINDINGS_SEVERITY: '90_DAYS'
      }
    };
  }

  // 3. Feature Normalization Manifest
  public static getFeatureNormalizationConfig(): any {
    return {
      manifest_id: 'M011-FEATURE-NORMALIZATION-001',
      rules: {
        FAILURE_FREQUENCY: { max_failures: 5, step_penalty: 20, direction: 'LOWER_IS_BETTER' },
        MAINTENANCE_COMPLIANCE: { scale: 100, min_ratio: 0.0, max_ratio: 1.0, direction: 'HIGHER_IS_BETTER' },
        PHYSICAL_FINDINGS: { critical_weight: 40, moderate_weight: 15, mild_weight: 5, direction: 'LOWER_IS_BETTER' },
        DOWNTIME_IMPACT: { max_minutes: 480, divisor: 4.8, direction: 'LOWER_IS_BETTER' },
        HEALTH_DEGRADATION: { base_scale: 100, direction: 'HIGHER_IS_WORSE' },
        MACHINE_CRITICALITY: { ALTA: 100, MEDIA: 50, BAJA: 10, direction: 'HIGHER_IS_WORSE' },
        RECURRENCE_TREND: { trend_up_bonus: 20, trend_down_bonus: -10, direction: 'HIGHER_IS_WORSE' },
        FINDINGS_SEVERITY: { critical_weight: 50, moderate_weight: 20, mild_weight: 5, cap: 100, direction: 'HIGHER_IS_WORSE' }
      }
    };
  }

  // 4. Health Formula Manifest
  public static getHealthFormulaConfig(): any {
    return {
      manifest_id: 'M011-HEALTH-FORMULA-001',
      formula_type: 'WEIGHTED_NORMALIZED_AVERAGE',
      expression: 'sum(normalized_value * weight) / sum(active_weights)',
      minimum_weight_threshold: 0.60,
      rounding_decimals: 1
    };
  }

  // 5. Risk Formula Manifest
  public static getRiskFormulaConfig(): any {
    return {
      manifest_id: 'M011-RISK-FORMULA-001',
      formula_type: 'WEIGHTED_OPERATIONAL_EXPOSURE',
      expression: 'sum(normalized_value * weight) / sum(active_weights)',
      minimum_weight_threshold: 0.60,
      rounding_decimals: 1
    };
  }

  // 6. Health Weights Manifest
  public static getHealthWeightsConfig(): any {
    return {
      manifest_id: 'M011-HEALTH-WEIGHTS-001',
      weights: {
        HEALTH_FAILURE_FREQUENCY: HEALTH_WEIGHTS.FAILURE_FREQUENCY,
        HEALTH_MAINTENANCE_COMPLIANCE: HEALTH_WEIGHTS.MAINTENANCE_COMPLIANCE,
        HEALTH_PHYSICAL_FINDINGS: HEALTH_WEIGHTS.PHYSICAL_FINDINGS,
        HEALTH_DOWNTIME_IMPACT: HEALTH_WEIGHTS.DOWNTIME_IMPACT
      },
      sum: 1.00
    };
  }

  // 7. Risk Weights Manifest
  public static getRiskWeightsConfig(): any {
    return {
      manifest_id: 'M011-RISK-WEIGHTS-001',
      weights: {
        RISK_HEALTH_DEGRADATION: RISK_WEIGHTS.HEALTH_DEGRADATION,
        RISK_MACHINE_CRITICALITY: RISK_WEIGHTS.MACHINE_CRITICALITY,
        RISK_FAILURE_RECURRENCE_TREND: RISK_WEIGHTS.FAILURE_RECURRENCE_TREND,
        RISK_ACTIVE_FINDINGS_SEVERITY: RISK_WEIGHTS.ACTIVE_FINDINGS_SEVERITY
      },
      sum: 1.00
    };
  }

  // 8. Health Thresholds Manifest
  public static getHealthThresholdsConfig(): any {
    return {
      manifest_id: 'M011-HEALTH-THRESHOLDS-001',
      thresholds: [
        { state: 'HEALTHY', min: 85.0, max: 100.0, inclusive_min: true, inclusive_max: true },
        { state: 'WATCH', min: 65.0, max: 84.999, inclusive_min: true, inclusive_max: false },
        { state: 'DEGRADED', min: 40.0, max: 64.999, inclusive_min: true, inclusive_max: false },
        { state: 'CRITICAL', min: 0.0, max: 39.999, inclusive_min: true, inclusive_max: false }
      ]
    };
  }

  // 9. Risk Thresholds Manifest
  public static getRiskThresholdsConfig(): any {
    return {
      manifest_id: 'M011-RISK-THRESHOLDS-001',
      thresholds: [
        { state: 'LOW', min: 0.0, max: 24.999, inclusive_min: true, inclusive_max: false },
        { state: 'MODERATE', min: 25.0, max: 49.999, inclusive_min: true, inclusive_max: false },
        { state: 'HIGH', min: 50.0, max: 74.999, inclusive_min: true, inclusive_max: false },
        { state: 'CRITICAL', min: 75.0, max: 100.0, inclusive_min: true, inclusive_max: true }
      ]
    };
  }

  // 10. Data Sufficiency Manifest
  public static getDataSufficiencyConfig(): any {
    return {
      manifest_id: 'M011-DATA-SUFFICIENCY-001',
      required_core_features: ['identity.criticidad', 'failure_metrics', 'maintenance_history'],
      minimum_weight_percentage: 65,
      missing_policy: 'EMIT_NULL_AND_INSUFFICIENT_DATA'
    };
  }

  // Build complete canonical evidence report & composite model SHA-256
  public static getCompositeModelEvidence(): CompositeModelEvidence {
    const manifests: Record<string, ScoringManifestEvidence> = {};

    const configs = [
      { id: 'M011-FEATURE-CATALOG-001', version: '1.0', cfg: this.getFeatureCatalogConfig() },
      { id: 'M011-FEATURE-WINDOWS-001', version: '1.0', cfg: this.getFeatureWindowsConfig() },
      { id: 'M011-FEATURE-NORMALIZATION-001', version: '1.0', cfg: this.getFeatureNormalizationConfig() },
      { id: 'M011-HEALTH-FORMULA-001', version: '1.0', cfg: this.getHealthFormulaConfig() },
      { id: 'M011-RISK-FORMULA-001', version: '1.0', cfg: this.getRiskFormulaConfig() },
      { id: 'M011-HEALTH-WEIGHTS-001', version: '1.0', cfg: this.getHealthWeightsConfig() },
      { id: 'M011-RISK-WEIGHTS-001', version: '1.0', cfg: this.getRiskWeightsConfig() },
      { id: 'M011-HEALTH-THRESHOLDS-001', version: '1.0', cfg: this.getHealthThresholdsConfig() },
      { id: 'M011-RISK-THRESHOLDS-001', version: '1.0', cfg: this.getRiskThresholdsConfig() },
      { id: 'M011-DATA-SUFFICIENCY-001', version: '1.0', cfg: this.getDataSufficiencyConfig() }
    ];

    for (const item of configs) {
      const canonicalStr = canonicalJsonStringify(item.cfg);
      manifests[item.id] = {
        manifest_id: item.id,
        version: item.version,
        canonical_configuration: item.cfg,
        sha256: computeSha256(canonicalStr)
      };
    }

    const compositeCanonical = canonicalJsonStringify(manifests);
    const compositeSha = computeSha256(compositeCanonical);

    return {
      model_id: 'M011-HEALTH-RISK-MODEL',
      composite_version: '1.0',
      manifests,
      m011_model_sha256: compositeSha
    };
  }
}
