// supabase/functions/agents-orchestrator/agents/ag012/config/ag012-decision-config-registry.ts
// Master Configuration Registry for AG-012 Intervention Strategy Engine (v1.0)
// Frozen under Token: AG012-DECISION-ENGINE-001

export interface DecisionConfigManifest {
  manifest_id: string;
  category: string;
  version: string;
  payload: any;
}

export class AG012DecisionConfigRegistry {
  private static readonly MANIFESTS: DecisionConfigManifest[] = [
    {
      manifest_id: 'AG012-INPUT-VALIDATION-001',
      category: 'INPUT_RULES',
      version: '1.0',
      payload: {
        required_fields: ['asset_id'],
        allowed_contexts: [
          'MAJOR_FAILURE',
          'REPEATED_FAILURES',
          'HIGH_MAINTENANCE_BURDEN',
          'LIFECYCLE_REVIEW',
          'OBSOLESCENCE_REVIEW',
          'CAPEX_PREANALYSIS'
        ],
        allow_browser_override: false
      }
    },
    {
      manifest_id: 'AG012-ASSET-IDENTITY-001',
      category: 'ASSET_RULES',
      version: '1.0',
      payload: {
        source: 'M-010',
        allow_cross_asset_leakage: false,
        allow_auto_create_asset: false
      }
    },
    {
      manifest_id: 'AG012-HEALTH-RISK-RULES-001',
      category: 'RELIABILITY_RULES',
      version: '1.0',
      payload: {
        source: 'M-011',
        health_threshold_degraded: 50,
        risk_threshold_critical: 75,
        allow_health_recalculation: false,
        allow_risk_recalculation: false
      }
    },
    {
      manifest_id: 'AG012-FAILURE-METRICS-RULES-001',
      category: 'FAILURE_RULES',
      version: '1.0',
      payload: {
        source: 'AG-008',
        recurrence_alert_count: 3,
        allow_failure_recalculation: false
      }
    },
    {
      manifest_id: 'AG012-RCA-RULES-001',
      category: 'RCA_RULES',
      version: '1.0',
      payload: {
        source: 'AG-010',
        require_confirmed_root_cause: true,
        allow_hypothesis_as_fact: false
      }
    },
    {
      manifest_id: 'AG012-TECHNICAL-MEMORY-RULES-001',
      category: 'MEMORY_RULES',
      version: '1.0',
      payload: {
        source: 'AG-011',
        require_approved_memory: true,
        allow_candidate_memory_authority: false
      }
    },
    {
      manifest_id: 'AG012-ECONOMIC-RULES-001',
      category: 'ECONOMIC_RULES',
      version: '1.0',
      payload: {
        source: 'AG-007',
        allow_unknown_cost_as_zero: false,
        allow_invented_replacement_cost: false,
        mci_high_burden_threshold: 0.60
      }
    },
    {
      manifest_id: 'AG012-MAINTAINABILITY-RULES-001',
      category: 'MAINTAINABILITY_RULES',
      version: '1.0',
      payload: {
        mttr_acceptable_hours: 8,
        service_complexity_penalty: 15
      }
    },
    {
      manifest_id: 'AG012-OBSOLESCENCE-RULES-001',
      category: 'OBSOLESCENCE_RULES',
      version: '1.0',
      payload: {
        allow_stock_zero_as_obsolescence: false,
        allow_age_as_obsolescence: false,
        allow_unknown_age_classification: false
      }
    },
    {
      manifest_id: 'AG012-DATA-SUFFICIENCY-RULES-001',
      category: 'SUFFICIENCY_RULES',
      version: '1.0',
      payload: {
        min_sufficiency_index_for_recommendation: 50,
        high_confidence_threshold: 70,
        allow_forced_recommendation_with_insufficient_data: false
      }
    },
    {
      manifest_id: 'AG012-HARD-RULES-001',
      category: 'HARD_RULES',
      version: '1.0',
      payload: {
        rules: [
          { code: 'HR-01', name: 'INSUFFICIENT_CRITICAL_DATA', forced: 'INSUFFICIENT_DATA' },
          { code: 'HR-02', name: 'ISOLATED_FAILURE_HEALTHY_ASSET', forced: 'REPAIR' },
          { code: 'HR-03', name: 'IRREVERSIBLE_OBSOLESCENCE_EXCESSIVE_COST', forced: 'REPLACE' },
          { code: 'HR-04', name: 'HEALTHY_STRUCTURE_EXHAUSTED_SUBSYSTEMS', forced: 'RENEW' }
        ]
      }
    },
    {
      manifest_id: 'AG012-DECISION-WEIGHTS-001',
      category: 'SCORING_WEIGHTS',
      version: '1.0',
      payload: {
        weights: {
          reliability_and_failures: 25,
          maintenance_economic_burden: 25,
          technical_repairability: 20,
          maintainability_and_support: 15,
          obsolescence_and_lifecycle: 15
        },
        total_sum_check: 100
      }
    },
    {
      manifest_id: 'AG012-TEMPORAL-RULES-001',
      category: 'TEMPORAL_RULES',
      version: '1.0',
      payload: {
        allow_future_data_leakage: false,
        enforce_server_evaluation_at: true
      }
    },
    {
      manifest_id: 'AG012-TRACEABILITY-RULES-001',
      category: 'TRACEABILITY_RULES',
      version: '1.0',
      payload: {
        require_100_percent_traceability: true,
        data_map_token: 'AG012-DATA-MAP-001'
      }
    }
  ];

  public static canonicalJsonStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map(this.canonicalJsonStringify.bind(this)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => `${JSON.stringify(k)}:${this.canonicalJsonStringify(obj[k])}`).join(',') + '}';
  }

  public static sha256Hex(content: string): string {
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    const utf8 = new TextEncoder().encode(content);
    const words: number[] = [];
    for (let i = 0; i < utf8.length; i++) {
      words[i >> 2] |= (utf8[i] & 0xff) << (24 - (i % 4) * 8);
    }
    words[utf8.length >> 2] |= 0x80 << (24 - (utf8.length % 4) * 8);
    const bitLen = utf8.length * 8;
    const lenWords = Math.ceil((utf8.length + 9) / 64) * 16;
    words[lenWords - 1] = bitLen & 0xffffffff;
    words[lenWords - 2] = Math.floor(bitLen / 0x100000000);

    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    const W = new Array(64);
    for (let i = 0; i < lenWords; i += 16) {
      for (let t = 0; t < 16; t++) W[t] = (words[i + t] || 0) | 0;
      for (let t = 16; t < 64; t++) {
        const gamma0 = ((W[t-15] >>> 7) | (W[t-15] << 25)) ^ ((W[t-15] >>> 18) | (W[t-15] << 14)) ^ (W[t-15] >>> 3);
        const gamma1 = ((W[t-2] >>> 17) | (W[t-2] << 15)) ^ ((W[t-2] >>> 19) | (W[t-2] << 13)) ^ (W[t-2] >>> 10);
        W[t] = (((gamma1 + W[t-7]) | 0) + ((gamma0 + W[t-16]) | 0)) | 0;
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let t = 0; t < 64; t++) {
        const ch = (e & f) ^ (~e & g);
        const sigma1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const temp1 = ((((((h + sigma1) | 0) + ch) | 0) + K[t]) | 0 + W[t]) | 0;
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const sigma0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const temp2 = (sigma0 + maj) | 0;
        h = g; g = f; f = e; e = (d + temp1) | 0; d = c; c = b; b = a; a = (temp1 + temp2) | 0;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
      h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
    }
    const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
    return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7);
  }

  public static getManifests(): DecisionConfigManifest[] {
    return this.MANIFESTS;
  }

  public static getManifestHashes(): Record<string, string> {
    const hashes: Record<string, string> = {};
    for (const m of this.MANIFESTS) {
      const canonical = this.canonicalJsonStringify(m);
      hashes[m.manifest_id] = this.sha256Hex(canonical);
    }
    return hashes;
  }

  public static getCompositeDecisionModelEvidence(): {
    model_id: string;
    model_version: string;
    ag012_decision_model_sha256: string;
    manifests_count: number;
    manifest_hashes: Record<string, string>;
  } {
    const hashes = this.getManifestHashes();
    const compositeCanonical = this.canonicalJsonStringify({
      model_id: 'AG012-DECISION-ENGINE',
      model_version: '1.0',
      manifest_hashes: hashes
    });

    const sha256 = this.sha256Hex(compositeCanonical);

    return {
      model_id: 'AG012-DECISION-ENGINE',
      model_version: '1.0',
      ag012_decision_model_sha256: sha256,
      manifests_count: this.MANIFESTS.length,
      manifest_hashes: hashes
    };
  }
}
