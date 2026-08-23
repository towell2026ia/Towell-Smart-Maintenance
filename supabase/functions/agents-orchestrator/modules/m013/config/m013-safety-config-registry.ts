// supabase/functions/agents-orchestrator/modules/m013/config/m013-safety-config-registry.ts
// Master Configuration Registry & Composite SHA-256 Fingerprint for M-013 (v1.0)
// Frozen under Token: M013-SAFETY-ENGINE-001

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

export function computeSha256(input: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i = 0, j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = input[lengthProperty as any] * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

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

  let utf8Str = '';
  for (let idx = 0; idx < input.length; idx++) {
    const charcode = input.charCodeAt(idx);
    if (charcode < 0x80) utf8Str += String.fromCharCode(charcode);
    else if (charcode < 0x800) {
      utf8Str += String.fromCharCode(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8Str += String.fromCharCode(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      idx++;
      const code = 0x10000 + (((charcode & 0x3ff) << 10) | (input.charCodeAt(idx) & 0x3ff));
      utf8Str += String.fromCharCode(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }

  for (i = 0; i < utf8Str.length; i++) {
    words[i >> 2] |= (utf8Str.charCodeAt(i) & 0xff) << ((3 - (i % 4)) * 8);
  }
  words[utf8Str.length >> 2] |= 0x80 << ((3 - (utf8Str.length % 4)) * 8);
  words[(((utf8Str.length + 8) >> 6) << 4) + 15] = utf8Str.length * 8;

  for (i = 0; i < words.length; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);

    for (j = 0; j < 64; j++) {
      let s0, s1;
      if (j < 16) {
        // use w[j]
      } else {
        const gamma0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const gamma1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + gamma0 + w[j - 7] + gamma1) | 0;
      }

      s1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1 + ch + k[j] + w[j]) | 0;
      s0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0 + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

export const M013_INPUT_VALIDATION_MANIFEST = {
  manifest_id: 'M013-INPUT-VALIDATION-001',
  version: '1.0',
  required_fields: ['work_order_id'],
  allow_client_safety_override: false,
  reject_sql_injection: true
};

export const M013_ASSET_IDENTITY_MANIFEST = {
  manifest_id: 'M013-ASSET-IDENTITY-001',
  version: '1.0',
  strict_asset_matching: true,
  cross_asset_leakage_allowed: false
};

export const M013_M012_HANDOFF_MANIFEST = {
  manifest_id: 'M013-M012-HANDOFF-001',
  version: '1.0',
  accepted_upstream_token: 'M012-1.0-FROZEN',
  consume_safety_dependencies: true,
  dependency_is_not_completion: true
};

export const M013_SCOPE_GUARD_MANIFEST = {
  manifest_id: 'M013-SCOPE-GUARD-001',
  version: '1.0',
  technical_scope_expansion_allowed: false,
  safety_requirements_may_block: true
};

export const M013_SAFETY_REQUIREMENT_RULES_MANIFEST = {
  manifest_id: 'M013-SAFETY-REQUIREMENT-RULES-001',
  version: '1.0',
  categories: [
    'LOTO_REQUIRED',
    'PERMIT_REQUIRED',
    'PPE_SPECIAL_REQUIRED',
    'CHEMICAL_SAFETY_REQUIRED',
    'ENERGY_ISOLATION_VERIFICATION',
    'GUARDING_REQUIRED'
  ],
  allow_invented_requirements: false
};

export const M013_EVIDENCE_RULES_MANIFEST = {
  manifest_id: 'M013-EVIDENCE-RULES-001',
  version: '1.0',
  evidence_types: [
    'DOCUMENTED_REQUIREMENT',
    'HUMAN_CONFIRMATION',
    'PERMIT_RECORD',
    'ISOLATION_RECORD',
    'CHECKLIST_RESPONSE',
    'TECHNICAL_REFERENCE',
    'MISSING_EVIDENCE'
  ],
  cross_ot_reuse_allowed: false
};

export const M013_HUMAN_AUTHORITY_RULES_MANIFEST = {
  manifest_id: 'M013-HUMAN-AUTHORITY-RULES-001',
  version: '1.0',
  system_self_authorization_allowed: false,
  client_clearance_injection_allowed: false,
  authorized_roles: ['TECHNICIAN', 'SUPERVISOR', 'SAFETY_OFFICER']
};

export const M013_LOTO_RULES_MANIFEST = {
  manifest_id: 'M013-LOTO-RULES-001',
  version: '1.0',
  loto_states: ['NOT_REQUIRED', 'REQUIRED', 'PENDING', 'VERIFIED_BY_HUMAN', 'FAILED_OR_INCOMPLETE'],
  loto_execution_by_module: false,
  automatic_verification_allowed: false
};

export const M013_PERMIT_RULES_MANIFEST = {
  manifest_id: 'M013-PERMIT-RULES-001',
  version: '1.0',
  permit_states: ['NOT_REQUIRED', 'REQUIRED', 'PENDING', 'APPROVED_BY_HUMAN', 'EXPIRED', 'REJECTED'],
  automatic_permit_approval_allowed: false,
  expired_permit_valid: false
};

export const M013_CONFLICT_RULES_MANIFEST = {
  manifest_id: 'M013-CONFLICT-RULES-001',
  version: '1.0',
  suppress_contradicting_evidence: false,
  conflict_resolution_behavior: 'BLOCK_AND_FLAG_FOR_REVIEW'
};

export const M013_BLOCKING_RULES_MANIFEST = {
  manifest_id: 'M013-BLOCKING-RULES-001',
  version: '1.0',
  rules: [
    { code: 'BLK-SAF-01', description: 'LOTO pendiente de verificación humana', severity: 'CRITICAL_BLOCK' },
    { code: 'BLK-SAF-02', description: 'Permiso requerido no emitido o no aprobado', severity: 'CRITICAL_BLOCK' },
    { code: 'BLK-SAF-03', description: 'Permiso de trabajo expirado', severity: 'CRITICAL_BLOCK' },
    { code: 'BLK-SAF-04', description: 'EPP especial obligatorio no confirmado', severity: 'WARNING' },
    { code: 'BLK-SAF-05', description: 'Evidencias contradictorias de seguridad', severity: 'CRITICAL_BLOCK' }
  ]
};

export const M013_SAFETY_STATUS_RULES_MANIFEST = {
  manifest_id: 'M013-SAFETY-STATUS-RULES-001',
  version: '1.0',
  statuses: ['CONTROLS_COMPLETE', 'CONTROLS_INCOMPLETE', 'BLOCKED', 'REVIEW_REQUIRED', 'NOT_EVALUATED'],
  controls_complete_grants_execution_authorization: false
};

export const M013_TEMPORAL_RULES_MANIFEST = {
  manifest_id: 'M013-TEMPORAL-RULES-001',
  version: '1.0',
  future_evidence_leakage_allowed: false,
  strict_evaluation_at: true
};

export const M013_TRACEABILITY_RULES_MANIFEST = {
  manifest_id: 'M013-TRACEABILITY-RULES-001',
  version: '1.0',
  required_traceability_percentage: 100,
  untraceable_items_allowed: false
};

export class M013SafetyConfigRegistry {
  private static manifests = [
    M013_INPUT_VALIDATION_MANIFEST,
    M013_ASSET_IDENTITY_MANIFEST,
    M013_M012_HANDOFF_MANIFEST,
    M013_SCOPE_GUARD_MANIFEST,
    M013_SAFETY_REQUIREMENT_RULES_MANIFEST,
    M013_EVIDENCE_RULES_MANIFEST,
    M013_HUMAN_AUTHORITY_RULES_MANIFEST,
    M013_LOTO_RULES_MANIFEST,
    M013_PERMIT_RULES_MANIFEST,
    M013_CONFLICT_RULES_MANIFEST,
    M013_BLOCKING_RULES_MANIFEST,
    M013_SAFETY_STATUS_RULES_MANIFEST,
    M013_TEMPORAL_RULES_MANIFEST,
    M013_TRACEABILITY_RULES_MANIFEST
  ];

  public static getManifests() {
    return this.manifests;
  }

  public static getManifestHashes(): Record<string, string> {
    const hashes: Record<string, string> = {};
    for (const m of this.manifests) {
      const canonical = canonicalJsonStringify(m);
      hashes[m.manifest_id] = computeSha256(canonical);
    }
    return hashes;
  }

  public static getCompositeSafetyModelEvidence() {
    const manifestHashes = this.getManifestHashes();
    const sortedHashEntries = Object.keys(manifestHashes).sort().map(k => `${k}:${manifestHashes[k]}`);
    const compositePayload = sortedHashEntries.join('|');
    const compositeSha = computeSha256(compositePayload);

    return {
      model_id: 'M013-SAFETY-ENGINE',
      model_version: '1.0',
      manifest_count: this.manifests.length,
      manifest_hashes: manifestHashes,
      m013_safety_model_sha256: compositeSha
    };
  }
}
