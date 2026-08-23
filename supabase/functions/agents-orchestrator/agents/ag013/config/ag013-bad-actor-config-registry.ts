// supabase/functions/agents-orchestrator/agents/ag013/config/ag013-bad-actor-config-registry.ts
// Configuration Registry & Composite Fingerprint for AG-013 Analista de Malos Actores v1.0
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

export interface BadActorWeightConfig {
  chronicity: number;
  failure_burden: number;
  economic_burden: number;
  health_risk: number;
  intervention_ineffectiveness: number;
}

export interface BadActorThresholdConfig {
  watchlist_min: number;
  bad_actor_min: number;
  severe_bad_actor_min: number;
  data_sufficiency_min: number;
}

export interface BadActorHardRuleConfig {
  code: string;
  name: string;
  description: string;
}

export interface BadActorConfigManifest {
  manifest_id: string;
  category: string;
  version: string;
  payload: any;
}

export class AG013BadActorConfigRegistry {
  public static readonly VERSION = '1.0';
  public static readonly AGENT_ID = 'AG-013';

  public static readonly WEIGHTS: BadActorWeightConfig = {
    chronicity: 0.30,
    failure_burden: 0.25,
    economic_burden: 0.20,
    health_risk: 0.15,
    intervention_ineffectiveness: 0.10
  };

  public static readonly THRESHOLDS: BadActorThresholdConfig = {
    watchlist_min: 40,
    bad_actor_min: 65,
    severe_bad_actor_min: 85,
    data_sufficiency_min: 50
  };

  public static readonly HARD_RULES: BadActorHardRuleConfig[] = [
    {
      code: 'HR-01',
      name: 'Datos Insuficientes',
      description: 'Si DSI < 50% o faltan dimensiones críticas, clasificar como INSUFFICIENT_DATA.'
    },
    {
      code: 'HR-02',
      name: 'Falla Aislada en Activo Sano',
      description: 'Si Salud >= 80, fallas <= 2 y cronicidad = 0, clasificar como NOT_BAD_ACTOR.'
    },
    {
      code: 'HR-03',
      name: 'Degradación Crónica Severa',
      description: 'Si Cronicidad >= 80, Reincidencia > 0.40 y Score >= 85, clasificar como SEVERE_BAD_ACTOR.'
    }
  ];

  public static readonly CLASSIFICATION_CATALOG = [
    'NOT_BAD_ACTOR',
    'WATCHLIST',
    'BAD_ACTOR',
    'SEVERE_BAD_ACTOR',
    'INSUFFICIENT_DATA'
  ] as const;

  public static readonly ANALYSIS_WINDOWS = [
    'ROLLING_90D',
    'ROLLING_180D',
    'ROLLING_365D'
  ] as const;

  public static readonly POPULATION_SCOPES = [
    'PLANT_WIDE',
    'AREA_SPECIFIC',
    'FAMILY_SPECIFIC'
  ] as const;

  public static readonly TIE_BREAK_POLICY = 'LEXICOGRAPHICAL_ASSET_ID_ASC';

  public static readonly MANIFESTS: BadActorConfigManifest[] = [
    {
      manifest_id: 'AG013-ASSET-POPULATION-RULES-001',
      category: 'POPULATION_RULES',
      version: '1.0',
      payload: {
        supported_scopes: ['PLANT_WIDE', 'AREA_SPECIFIC', 'FAMILY_SPECIFIC'],
        active_assets_only: true
      }
    },
    {
      manifest_id: 'AG013-PEER-GROUP-RULES-001',
      category: 'PEER_GROUP_RULES',
      version: '1.0',
      payload: {
        peer_dimensions: ['area', 'machine_family', 'criticality'],
        cross_peer_contamination_guard: true
      }
    },
    {
      manifest_id: 'AG013-ANALYSIS-WINDOW-RULES-001',
      category: 'TEMPORAL_WINDOW_RULES',
      version: '1.0',
      payload: {
        supported_windows: ['ROLLING_90D', 'ROLLING_180D', 'ROLLING_365D'],
        default_window: 'ROLLING_180D'
      }
    },
    {
      manifest_id: 'AG013-EXPOSURE-RULES-001',
      category: 'OPERATIONAL_EXPOSURE',
      version: '1.0',
      payload: {
        baseline_hours_180d: 2000,
        invented_exposure_allowed: false
      }
    },
    {
      manifest_id: 'AG013-DATA-SUFFICIENCY-RULES-001',
      category: 'DATA_SUFFICIENCY',
      version: '1.0',
      payload: {
        min_sufficiency_index: 50,
        high_confidence_threshold: 75,
        allow_forced_classification_with_insufficient_data: false
      }
    },
    {
      manifest_id: 'AG013-HARD-RULES-001',
      category: 'HARD_RULES',
      version: '1.0',
      payload: {
        rules: [
          { code: 'HR-01', name: 'INSUFFICIENT_CRITICAL_DATA', forced: 'INSUFFICIENT_DATA' },
          { code: 'HR-02', name: 'ISOLATED_FAILURE_HEALTHY_ASSET', forced: 'NOT_BAD_ACTOR' },
          { code: 'HR-03', name: 'SEVERE_CHRONIC_DEGRADATION', forced: 'SEVERE_BAD_ACTOR' }
        ]
      }
    },
    {
      manifest_id: 'AG013-DECISION-WEIGHTS-001',
      category: 'SCORING_WEIGHTS',
      version: '1.0',
      payload: {
        weights: {
          chronicity: 0.30,
          failure_burden: 0.25,
          economic_burden: 0.20,
          health_risk: 0.15,
          intervention_ineffectiveness: 0.10
        }
      }
    },
    {
      manifest_id: 'AG013-DECISION-THRESHOLDS-001',
      category: 'CLASSIFICATION_THRESHOLDS',
      version: '1.0',
      payload: {
        watchlist_min: 40,
        bad_actor_min: 65,
        severe_bad_actor_min: 85
      }
    },
    {
      manifest_id: 'AG013-RANKING-RULES-001',
      category: 'RANKING_RULES',
      version: '1.0',
      payload: {
        sort_hierarchy: [
          'classification_priority',
          'bad_actor_score_desc',
          'chronicity_score_desc',
          'economic_burden_score_desc',
          'asset_id_asc'
        ],
        tie_break: 'LEXICOGRAPHICAL_ASSET_ID_ASC'
      }
    }
  ];

  public static canonicalJsonStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map(AG013BadActorConfigRegistry.canonicalJsonStringify).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => `${JSON.stringify(k)}:${AG013BadActorConfigRegistry.canonicalJsonStringify(obj[k])}`).join(',') + '}';
  }

  public static sha256Hex(str: string): string {
    const utf8 = new TextEncoder().encode(str);
    const len = utf8.length;
    const lenWords = (((len + 8) >>> 6) + 1) * 16;
    const words = new Array(lenWords).fill(0);
    for (let i = 0; i < len; i++) {
      words[i >>> 2] |= utf8[i] << (24 - (i % 4) * 8);
    }
    words[len >>> 2] |= 0x80 << (24 - (len % 4) * 8);
    words[lenWords - 1] = len * 8;

    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

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
    ag013_bad_actor_model_sha256: string;
    manifests_count: number;
    manifest_hashes: Record<string, string>;
    config: any;
  } {
    const hashes = this.getManifestHashes();
    const compositeCanonical = this.canonicalJsonStringify({
      model_id: 'AG013-BAD-ACTOR-ENGINE',
      model_version: '1.0',
      manifest_hashes: hashes
    });

    const sha256 = this.sha256Hex(compositeCanonical);

    return {
      model_id: 'AG013-BAD-ACTOR-ENGINE',
      model_version: '1.0',
      ag013_bad_actor_model_sha256: sha256,
      manifests_count: this.MANIFESTS.length,
      manifest_hashes: hashes,
      config: {
        agent_id: this.AGENT_ID,
        version: this.VERSION,
        weights: this.WEIGHTS,
        thresholds: this.THRESHOLDS,
        hard_rules: this.HARD_RULES,
        classification_catalog: this.CLASSIFICATION_CATALOG,
        analysis_windows: this.ANALYSIS_WINDOWS,
        population_scopes: this.POPULATION_SCOPES,
        tie_break_policy: this.TIE_BREAK_POLICY
      }
    };
  }
}
