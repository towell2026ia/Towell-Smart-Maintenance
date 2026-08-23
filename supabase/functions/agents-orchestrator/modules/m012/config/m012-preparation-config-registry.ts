// supabase/functions/agents-orchestrator/modules/m012/config/m012-preparation-config-registry.ts
// Canonical Configuration Registry & Composite Hash Engine for M-012 (v1.0)
// Frozen under Token: M012-CONFIG-EVIDENCE-001
// Invariant: Canonical JSON serialization & composite SHA-256 fingerprint (§110-117 PRD-M-012.2)

export interface M012ManifestEvidence {
  manifest_id: string;
  version: string;
  canonical_configuration: any;
  sha256: string;
}

export interface M012CompositeModelEvidence {
  model_id: string;
  composite_version: string;
  manifests: Record<string, M012ManifestEvidence>;
  m012_preparation_model_sha256: string;
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

export function computeSha256(text: string): string {
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

  const w = new Array(64);
  for (let i = 0; i < words.length; i += 16) {
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const gamma0 = ((w[j - 15] >>> 7) | (w[j - 15] << 25)) ^ ((w[j - 15] >>> 18) | (w[j - 15] << 14)) ^ (w[j - 15] >>> 3);
        const gamma1 = ((w[j - 2] >>> 17) | (w[j - 2] << 15)) ^ ((w[j - 2] >>> 19) | (w[j - 2] << 13)) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + gamma0 + w[j - 7] + gamma1) | 0;
      }
      const ch = (e & f) ^ (~e & g);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const sigma0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const sigma1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const t1 = (h + sigma1 + ch + k[j] + w[j]) | 0;
      const t2 = (sigma0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7);
}

export class M012PreparationConfigRegistry {
  public static getOTValidationConfig(): any {
    return {
      manifest_id: 'M012-OT-VALIDATION-001',
      version: '1.0',
      allowed_states: ['PENDING', 'SCHEDULED', 'IN_PREPARATION', 'IN_PROGRESS'],
      blocked_states: ['CANCELLED', 'CLOSED'],
      required_fields: ['id', 'maquina_id', 'tipo_mantenimiento']
    };
  }

  public static getAssetIdentityConfig(): any {
    return {
      manifest_id: 'M012-ASSET-IDENTITY-001',
      version: '1.0',
      table: 'cat_maquinas',
      id_field: 'codigo_maquina',
      prevent_cross_asset: true
    };
  }

  public static getScopePreservationConfig(): any {
    return {
      manifest_id: 'M012-SCOPE-PRESERVATION-001',
      version: '1.0',
      automatic_scope_expansion_allowed: false,
      extra_task_handling: 'REPORT_AS_DEPENDENCY_OR_REVIEW'
    };
  }

  public static getMemoryConsumptionConfig(): any {
    return {
      manifest_id: 'M012-MEMORY-CONSUMPTION-001',
      version: '1.0',
      required_status: 'APPROVED',
      top_n_limit: 5,
      allow_candidate: false,
      allow_superseded: false,
      allow_retired: false,
      reranking_allowed: false
    };
  }

  public static getPartsRulesConfig(): any {
    return {
      manifest_id: 'M012-PARTS-RULES-001',
      version: '1.0',
      categories: ['REQUIRED', 'RECOMMENDED', 'OPTIONAL', 'UNKNOWN'],
      allow_auto_reservation: false,
      allow_auto_purchase: false,
      treat_unknown_as_zero: false
    };
  }

  public static getToolsResourcesRulesConfig(): any {
    return {
      manifest_id: 'M012-TOOLS-RESOURCES-RULES-001',
      version: '1.0',
      categories: ['REQUIRED', 'RECOMMENDED', 'OPTIONAL', 'STANDARD_TOOLKIT', 'NOT_DOCUMENTED'],
      allow_invented_tools: false,
      allow_skills_matrix: false,
      allow_technician_assignment: false
    };
  }

  public static getChecklistMappingConfig(): any {
    return {
      manifest_id: 'M012-CHECKLIST-MAPPING-001',
      version: '1.0',
      flows: {
        PREVENTIVE: 'NORMAL_OT_CHECKLIST',
        PREDICTIVE: 'PREDICTIVE_SURVEY_CONTEXT',
        AUTONOMOUS: 'AUTONOMOUS_CHECKLIST',
        CORRECTIVE: 'CORRECTIVE_VERIFICATION_CHECKLIST'
      },
      allow_checklist_creation: false
    };
  }

  public static getDependencyRulesConfig(): any {
    return {
      manifest_id: 'M012-DEPENDENCY-RULES-001',
      version: '1.0',
      types: ['PREVIOUS_OT', 'PARTS_DELIVERY', 'OPERATIONAL_STOP', 'SUPERVISION_REVIEW'],
      allow_subtask_creation: false
    };
  }

  public static getSafetyDependencyRulesConfig(): any {
    return {
      manifest_id: 'M012-SAFETY-DEPENDENCY-RULES-001',
      version: '1.0',
      types: [
        'LOTO_REQUIRED',
        'PERMIT_REQUIRED',
        'PPE_SPECIAL_REQUIRED',
        'CHEMICAL_SAFETY_REQUIRED',
        'ENERGY_ISOLATION_VERIFICATION'
      ],
      allow_safety_clearance: false,
      handoff_target: 'M-013'
    };
  }

  public static getDataGapRulesConfig(): any {
    return {
      manifest_id: 'M012-DATA-GAP-RULES-001',
      version: '1.0',
      categories: ['MISSING', 'UNKNOWN', 'NOT_APPLICABLE', 'NOT_AVAILABLE', 'CONFLICTING'],
      conflicts_require_review: true
    };
  }

  public static getReadinessRulesConfig(): any {
    return {
      manifest_id: 'M012-READINESS-RULES-001',
      version: '1.0',
      statuses: [
        'READY',
        'PARTIALLY_READY',
        'BLOCKED_MISSING_INFORMATION',
        'BLOCKED_MISSING_RESOURCE',
        'REVIEW_REQUIRED'
      ],
      ready_implies_authorization: false,
      ready_implies_safety_cleared: false,
      weights: {
        scope_present_pts: 25,
        checklist_resolved_pts: 25,
        required_parts_available_pts: 25,
        safety_dependencies_identified_pts: 25
      }
    };
  }

  public static getTemporalRulesConfig(): any {
    return {
      manifest_id: 'M012-TEMPORAL-RULES-001',
      version: '1.0',
      cutoff_field: 'evaluation_at',
      prevent_future_leakage: true
    };
  }

  public static getTraceabilityRulesConfig(): any {
    return {
      manifest_id: 'M012-TRACEABILITY-RULES-001',
      version: '1.0',
      required_traceability_percent: 100,
      data_map_token: 'M012-DATA-MAP-001'
    };
  }

  public static getCompositePreparationModelEvidence(): M012CompositeModelEvidence {
    const configs = [
      { id: 'M012-OT-VALIDATION-001', version: '1.0', cfg: this.getOTValidationConfig() },
      { id: 'M012-ASSET-IDENTITY-001', version: '1.0', cfg: this.getAssetIdentityConfig() },
      { id: 'M012-SCOPE-PRESERVATION-001', version: '1.0', cfg: this.getScopePreservationConfig() },
      { id: 'M012-MEMORY-CONSUMPTION-001', version: '1.0', cfg: this.getMemoryConsumptionConfig() },
      { id: 'M012-PARTS-RULES-001', version: '1.0', cfg: this.getPartsRulesConfig() },
      { id: 'M012-TOOLS-RESOURCES-RULES-001', version: '1.0', cfg: this.getToolsResourcesRulesConfig() },
      { id: 'M012-CHECKLIST-MAPPING-001', version: '1.0', cfg: this.getChecklistMappingConfig() },
      { id: 'M012-DEPENDENCY-RULES-001', version: '1.0', cfg: this.getDependencyRulesConfig() },
      { id: 'M012-SAFETY-DEPENDENCY-RULES-001', version: '1.0', cfg: this.getSafetyDependencyRulesConfig() },
      { id: 'M012-DATA-GAP-RULES-001', version: '1.0', cfg: this.getDataGapRulesConfig() },
      { id: 'M012-READINESS-RULES-001', version: '1.0', cfg: this.getReadinessRulesConfig() },
      { id: 'M012-TEMPORAL-RULES-001', version: '1.0', cfg: this.getTemporalRulesConfig() },
      { id: 'M012-TRACEABILITY-RULES-001', version: '1.0', cfg: this.getTraceabilityRulesConfig() }
    ];

    const manifests: Record<string, M012ManifestEvidence> = {};

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
      model_id: 'M012-PREPARATION-ENGINE',
      composite_version: '1.0',
      manifests,
      m012_preparation_model_sha256: compositeSha
    };
  }
}
