// supabase/functions/agents-orchestrator/agents/ag012/config/ag012-semantic-config-registry.ts
// Semantic Configuration Registry for AG-012 Explanation Layer (v1.0)
// Frozen under Token: AG012-SEMANTIC-LAYER-001

export class AG012SemanticConfigRegistry {
  public static readonly UPSTREAM_DECISION_SHA256 = 'c07710378546100616f1394fe558be2d18fb29c9e20d8ceeac710cc472b3a1b8';

  public static readonly SEMANTIC_CONFIG = {
    provider: 'Xiaomi MiMo',
    model: 'mimo-v2.5',
    temperature: 0.1,
    max_retries: 3,
    tariff: {
      input_per_1m: 0.14,
      output_per_1m: 0.28
    },
    system_prompt_version: '1.0',
    upstream_decision_sha256: 'c07710378546100616f1394fe558be2d18fb29c9e20d8ceeac710cc472b3a1b8'
  };

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

  public static getSemanticModelEvidence(): {
    model_id: string;
    model_version: string;
    ag012_semantic_model_sha256: string;
    upstream_decision_sha256: string;
  } {
    const canonical = this.canonicalJsonStringify(this.SEMANTIC_CONFIG);
    const sha = this.sha256Hex(canonical);

    return {
      model_id: 'AG012-SEMANTIC-LAYER',
      model_version: '1.0',
      ag012_semantic_model_sha256: sha,
      upstream_decision_sha256: this.UPSTREAM_DECISION_SHA256
    };
  }
}
