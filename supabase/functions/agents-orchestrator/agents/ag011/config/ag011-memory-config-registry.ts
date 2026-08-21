// supabase/functions/agents-orchestrator/agents/ag011/config/ag011-memory-config-registry.ts
// Canonical Deterministic Configuration Registry & Hash Engine for AG-011 (v1.0)
// Frozen under Token: AG011-MEMORY-ENGINE-001
// Invariant: Canonical JSON serialization & composite SHA-256 fingerprint (§175-181 PRD-AG-011.2)

export interface AG011ManifestEvidence {
  manifest_id: string;
  version: string;
  canonical_configuration: any;
  sha256: string;
}

export interface AG011CompositeMemoryModelEvidence {
  model_id: string;
  composite_version: string;
  manifests: Record<string, AG011ManifestEvidence>;
  ag011_memory_model_sha256: string;
}

export function canonicalJsonStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(k => JSON.stringify(k) + ':' + canonicalJsonStringify(obj[k]));
  return '{' + pairs.join(',') + '}';
}

export function computeSha256(text: string): string {
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.subtle) {
    // Deno / Modern Web Crypto fallback sync mock if async unavailable in sync context
  }
  try {
    const cryptoModule = (typeof require !== 'undefined') ? require('crypto') : null;
    if (cryptoModule && cryptoModule.createHash) {
      return cryptoModule.createHash('sha256').update(text, 'utf8').digest('hex');
    }
  } catch (_) {}

  // Pure JS fallback sha256
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const utf8 = unescape(encodeURIComponent(text));
  const words: number[] = [];
  for (let i = 0; i < utf8.length; i++) {
    words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  const bitLen = utf8.length * 8;
  words[bitLen >> 5] |= 0x80 << (24 - (bitLen % 32));
  words[(((bitLen + 64) >> 9) << 4) + 15] = bitLen;

  for (let i = 0; i < words.length; i += 16) {
    const w = new Array(64);
    for (let t = 0; t < 16; t++) w[t] = words[i + t] | 0;
    for (let t = 16; t < 64; t++) {
      const s0 = ((w[t - 15] >>> 7) | (w[t - 15] << 25)) ^ ((w[t - 15] >>> 18) | (w[t - 15] << 14)) ^ (w[t - 15] >>> 3);
      const s1 = ((w[t - 2] >>> 17) | (w[t - 2] << 15)) ^ ((w[t - 2] >>> 19) | (w[t - 2] << 13)) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; t++) {
      const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[t] + w[t]) | 0;
      const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

export class AG011MemoryConfigRegistry {
  public static getCandidateEngineConfig(): any {
    return {
      manifest_id: 'AG011-CANDIDATE-ENGINE-001',
      version: '1.0',
      allowed_sources: ['HUMAN_CONFIRMED_RCA', 'VALIDATED_INTERVENTION', 'TECHNICAL_MANUAL'],
      prohibited_sources: ['UNSUPPORTED_AI_HYPOTHESIS'],
      min_evidence_items: 1,
      default_status: 'CANDIDATE'
    };
  }

  public static getEvidenceResolverConfig(): any {
    return {
      manifest_id: 'AG011-EVIDENCE-RESOLVER-001',
      version: '1.0',
      evidence_classes: [
        'CERTIFIED_FACT', 'HUMAN_CONFIRMED_CAUSE', 'VALIDATED_INTERVENTION',
        'DOCUMENTED_OUTCOME', 'DERIVED_SIGNAL', 'TECHNICIAN_STATEMENT',
        'OPERATOR_STATEMENT', 'MODEL_HYPOTHESIS'
      ],
      strict_lineage_required: true
    };
  }

  public static getScopeEngineConfig(): any {
    return {
      manifest_id: 'AG011-SCOPE-ENGINE-001',
      version: '1.0',
      scope_levels: ['ASSET_SPECIFIC', 'MACHINE_MODEL', 'MACHINE_FAMILY', 'COMPONENT', 'DEPARTMENT', 'GENERAL'],
      default_scope: 'ASSET_SPECIFIC',
      promotion_rules: {
        to_machine_model_min_assets: 2,
        to_general_requires_super_admin: true
      }
    };
  }

  public static getQualityEngineConfig(): any {
    return {
      manifest_id: 'AG011-QUALITY-ENGINE-001',
      version: '1.0',
      quality_tiers: ['STRONG', 'ADEQUATE', 'PARTIAL', 'CONFLICTING', 'INSUFFICIENT'],
      weights: {
        certified_fact_pts: 40,
        confirmed_cause_pts: 30,
        validated_outcome_pts: 20,
        no_contradictions_pts: 10
      }
    };
  }

  public static getCircularityGuardConfig(): any {
    return {
      manifest_id: 'AG011-CIRCULARITY-GUARD-001',
      version: '1.0',
      policy: 'STRICT_SAME_CASE_EXCLUSION',
      allow_sequential_learning: true,
      self_reinforcing_loop_tolerance: 0
    };
  }

  public static getLifecycleEngineConfig(): any {
    return {
      manifest_id: 'AG011-LIFECYCLE-ENGINE-001',
      version: '1.0',
      lifecycle_states: ['CANDIDATE', 'REVIEW_REQUIRED', 'APPROVED', 'SUPERSEDED', 'RETIRED', 'REJECTED'],
      productive_retrieval_allowed_states: ['APPROVED']
    };
  }

  public static getApprovalGuardConfig(): any {
    return {
      manifest_id: 'AG011-APPROVAL-GUARD-001',
      version: '1.0',
      ai_approvals_allowed: false,
      authorized_roles: ['SUPER_ADMIN', 'JEFE_MANTENIMIENTO', 'INGENIERO_CONFIABILIDAD'],
      require_evidence_snapshot_hash: true
    };
  }

  public static getVersioningEngineConfig(): any {
    return {
      manifest_id: 'AG011-VERSIONING-ENGINE-001',
      version: '1.0',
      version_format: 'MAJOR.MINOR',
      immutable_approved_versions: true,
      supersession_policy: 'APPEND_ONLY_SUPERSEDES_PRIOR'
    };
  }

  public static getFreshnessEngineConfig(): any {
    return {
      manifest_id: 'AG011-FRESHNESS-ENGINE-001',
      version: '1.0',
      stale_triggers: ['ASSET_CONFIG_CHANGE', 'ENGINEERING_STANDARD_CHANGE', 'POST_INTERVENTION_FAILURE_30D', 'PART_DISCONTINUED'],
      arbitrary_age_expiration: false
    };
  }

  public static getRetrievalEngineConfig(): any {
    return {
      manifest_id: 'AG011-RETRIEVAL-ENGINE-001',
      version: '1.0',
      embeddings_enabled: false,
      top_n_limit: 5,
      tie_break_rule: 'EFFECTIVE_FROM_DESC_THEN_MEMORY_ID_ASC',
      temporal_cutoff_field: 'evaluation_at'
    };
  }

  public static getRankingEngineConfig(): any {
    return {
      manifest_id: 'AG011-RANKING-ENGINE-001',
      version: '1.0',
      factors: {
        SAME_ASSET: 35,
        SAME_MACHINE_MODEL: 25,
        SAME_COMPONENT: 20,
        KEYWORD_FAILURE_MATCH: 15,
        APPROVED_STATUS: 5
      },
      max_score: 100
    };
  }

  public static getCompositeMemoryModelEvidence(): AG011CompositeMemoryModelEvidence {
    const configs = [
      { id: 'AG011-CANDIDATE-ENGINE-001', version: '1.0', cfg: this.getCandidateEngineConfig() },
      { id: 'AG011-EVIDENCE-RESOLVER-001', version: '1.0', cfg: this.getEvidenceResolverConfig() },
      { id: 'AG011-SCOPE-ENGINE-001', version: '1.0', cfg: this.getScopeEngineConfig() },
      { id: 'AG011-QUALITY-ENGINE-001', version: '1.0', cfg: this.getQualityEngineConfig() },
      { id: 'AG011-CIRCULARITY-GUARD-001', version: '1.0', cfg: this.getCircularityGuardConfig() },
      { id: 'AG011-LIFECYCLE-ENGINE-001', version: '1.0', cfg: this.getLifecycleEngineConfig() },
      { id: 'AG011-APPROVAL-GUARD-001', version: '1.0', cfg: this.getApprovalGuardConfig() },
      { id: 'AG011-VERSIONING-ENGINE-001', version: '1.0', cfg: this.getVersioningEngineConfig() },
      { id: 'AG011-FRESHNESS-ENGINE-001', version: '1.0', cfg: this.getFreshnessEngineConfig() },
      { id: 'AG011-RETRIEVAL-ENGINE-001', version: '1.0', cfg: this.getRetrievalEngineConfig() },
      { id: 'AG011-RANKING-ENGINE-001', version: '1.0', cfg: this.getRankingEngineConfig() }
    ];

    const manifests: Record<string, AG011ManifestEvidence> = {};

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
      model_id: 'AG011-MEMORY-ENGINE',
      composite_version: '1.0',
      manifests,
      ag011_memory_model_sha256: compositeSha
    };
  }
}
