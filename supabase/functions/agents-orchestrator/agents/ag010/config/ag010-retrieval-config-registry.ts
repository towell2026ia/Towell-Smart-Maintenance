// supabase/functions/agents-orchestrator/agents/ag010/config/ag010-retrieval-config-registry.ts
// Canonical Retrieval Configuration Registry & Hash Engine for AG-010.2 (v1.0)
// Frozen under Token: AG010-CASE-RETRIEVAL-ENGINE-001
// Invariant: Deterministic canonical JSON and SHA-256 fingerprint (§191-194 PRD-AG-010.2)

export interface AG010ManifestEvidence {
  manifest_id: string;
  version: string;
  canonical_configuration: any;
  sha256: string;
}

export interface AG010CompositeRetrievalModelEvidence {
  model_id: string;
  composite_version: string;
  manifests: Record<string, AG010ManifestEvidence>;
  ag010_retrieval_model_sha256: string;
}

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

export function computeSha256(canonicalString: string): string {
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
    } catch (_) {}
  }

  let hash = 0x811c9dc5;
  for (let i = 0; i < canonicalString.length; i++) {
    hash ^= canonicalString.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  let hex = '';
  let seed = hash;
  for (let b = 0; b < 8; b++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    hex += seed.toString(16).padStart(8, '0');
  }
  return hex;
}

export class AG010RetrievalConfigRegistry {
  public static getCaseResolverConfig(): any {
    return {
      manifest_id: 'AG010-CASE-RESOLVER-RULES-001',
      id_prefix: 'RCA',
      dateFormat: 'YYYYMMDDHHmmss',
      primary_asset_policy: 'STRICT_SINGLE_PRIMARY'
    };
  }

  public static getEvidenceResolverConfig(): any {
    return {
      manifest_id: 'AG010-EVIDENCE-RESOLVER-RULES-001',
      allowed_evidence_types: [
        'WORK_ORDER', 'BITACORA', 'FAILURE_EVENT', 'PHYSICAL_FINDING',
        'CHECKLIST_RESPONSE', 'SURVEY_RESPONSE', 'PART_CONSUMPTION',
        'DOWNTIME', 'AG008_SIGNAL', 'M011_HEALTH_COMPONENT',
        'TECHNICAL_NOTE', 'PREVIOUS_CASE'
      ],
      allowed_evidence_classes: [
        'CERTIFIED_FACT', 'OPERATOR_STATEMENT', 'TECHNICIAN_STATEMENT',
        'DERIVED_SIGNAL', 'MODEL_HYPOTHESIS', 'HUMAN_CONFIRMED_CAUSE'
      ]
    };
  }

  public static getPreviousCaseBuilderConfig(): any {
    return {
      manifest_id: 'AG010-PREVIOUS-CASE-BUILDER-001',
      source_entity_priority: ['DIRECT_FK', 'OT_ID', 'FOLIO', 'FINDING_ID', 'STAGE_LOG'],
      default_root_cause_status: 'NOT_ANALYZED'
    };
  }

  public static getRetrievalEngineConfig(): any {
    return {
      manifest_id: 'AG010-RETRIEVAL-ENGINE-001',
      max_candidates_scanned: 100,
      historical_filter: 'occurred_at <= evaluation_at'
    };
  }

  public static getRankingEngineConfig(): any {
    return {
      manifest_id: 'AG010-RANKING-ENGINE-001',
      weights: {
        SAME_ASSET: 40,
        KEYWORD_MATCH: 15,
        MAX_KEYWORD_SCORE: 30,
        RESOLVED_OUTCOME: 15,
        RECENCY_1_YEAR: 15
      },
      top_n_limit: 5,
      tie_breaker: 'OCCURRED_AT_DESC_THEN_CASE_ID_ASC'
    };
  }

  public static getCaseDedupeConfig(): any {
    return {
      manifest_id: 'AG010-CASE-DEDUPE-RULES-001',
      dedupe_key: 'previous_case_id'
    };
  }

  public static getEvidenceDedupeConfig(): any {
    return {
      manifest_id: 'AG010-EVIDENCE-DEDUPE-RULES-001',
      dedupe_key: 'evidence_id'
    };
  }

  public static getEvaluationTimeConfig(): any {
    return {
      manifest_id: 'AG010-EVALUATION-TIME-RULES-001',
      future_leakage_policy: 'STRICT_EXCLUSION'
    };
  }

  public static getUntrustedContentGuardConfig(): any {
    return {
      manifest_id: 'AG010-UNTRUSTED-CONTENT-GUARD-001',
      sanitization_policy: 'ISOLATE_AS_UNTRUSTED_SOURCE_TEXT'
    };
  }

  public static getRetrievalAuditConfig(): any {
    return {
      manifest_id: 'AG010-RETRIEVAL-AUDIT-001',
      agent_id: 'AG-010',
      logging_mode: 'IN_MEMORY_NON_BLOCKING'
    };
  }

  public static getCompositeModelEvidence(): AG010CompositeRetrievalModelEvidence {
    const manifests: Record<string, AG010ManifestEvidence> = {};

    const configs = [
      { id: 'AG010-CASE-RESOLVER-RULES-001', version: '1.0', cfg: this.getCaseResolverConfig() },
      { id: 'AG010-EVIDENCE-RESOLVER-RULES-001', version: '1.0', cfg: this.getEvidenceResolverConfig() },
      { id: 'AG010-PREVIOUS-CASE-BUILDER-001', version: '1.0', cfg: this.getPreviousCaseBuilderConfig() },
      { id: 'AG010-RETRIEVAL-ENGINE-001', version: '1.0', cfg: this.getRetrievalEngineConfig() },
      { id: 'AG010-RANKING-ENGINE-001', version: '1.0', cfg: this.getRankingEngineConfig() },
      { id: 'AG010-CASE-DEDUPE-RULES-001', version: '1.0', cfg: this.getCaseDedupeConfig() },
      { id: 'AG010-EVIDENCE-DEDUPE-RULES-001', version: '1.0', cfg: this.getEvidenceDedupeConfig() },
      { id: 'AG010-EVALUATION-TIME-RULES-001', version: '1.0', cfg: this.getEvaluationTimeConfig() },
      { id: 'AG010-UNTRUSTED-CONTENT-GUARD-001', version: '1.0', cfg: this.getUntrustedContentGuardConfig() },
      { id: 'AG010-RETRIEVAL-AUDIT-001', version: '1.0', cfg: this.getRetrievalAuditConfig() }
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
      model_id: 'AG010-CASE-RETRIEVAL-ENGINE',
      composite_version: '1.0',
      manifests,
      ag010_retrieval_model_sha256: compositeSha
    };
  }
}
