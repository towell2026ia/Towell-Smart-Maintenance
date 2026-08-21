// supabase/functions/agents-orchestrator/agents/ag011/config/ag011-semantic-config-registry.ts
// Semantic Configuration Registry & Model Fingerprint for AG-011 (v1.0)
// Frozen under Token: AG011-SEMANTIC-LAYER-001
// Invariant: Canonical Fingerprint for Semantic Synthesis Model (§106-110 PRD-AG-011.3)

import { canonicalJsonStringify, computeSha256, type AG011ManifestEvidence } from './ag011-memory-config-registry.ts';
import { AG011TechnicalMemoryPrompt } from '../prompts/ag011-technical-memory.prompt.ts';
import { AG011_SEMANTIC_OUTPUT_JSON_SCHEMA } from '../contracts/ag011-semantic-output.contract.ts';

export interface AG011CompositeSemanticModelEvidence {
  model_id: string;
  composite_version: string;
  manifests: Record<string, AG011ManifestEvidence>;
  ag011_semantic_model_sha256: string;
}

export class AG011SemanticConfigRegistry {
  public static getSemanticInputManifest(): any {
    return {
      manifest_id: 'AG011-SEMANTIC-INPUT-001',
      version: '1.0',
      top_n_limit: 5,
      required_fields: ['query_context', 'retrieval_metadata', 'memories']
    };
  }

  public static getSemanticOutputManifest(): any {
    return {
      manifest_id: 'AG011-SEMANTIC-OUTPUT-001',
      version: '1.0',
      schema: AG011_SEMANTIC_OUTPUT_JSON_SCHEMA,
      strict_json: true
    };
  }

  public static getPromptManifest(): any {
    return {
      manifest_id: 'AG011-TECHNICAL-MEMORY-PROMPT-001',
      version: '1.0',
      prompt_version: AG011TechnicalMemoryPrompt.PROMPT_VERSION,
      system_prompt_sha256: computeSha256(AG011TechnicalMemoryPrompt.getSystemPrompt())
    };
  }

  public static getSemanticRulesManifest(): any {
    return {
      manifest_id: 'AG011-SEMANTIC-RULES-001',
      version: '1.0',
      rules: {
        ai_approvals_allowed: false,
        semantic_scope_widening_allowed: false,
        limitation_removal_allowed: false,
        reranking_allowed: false,
        untrusted_content_isolation: true
      }
    };
  }

  public static getOpenAIPolicyManifest(): any {
    return {
      manifest_id: 'AG011-OPENAI-POLICY-001',
      version: '1.0',
      provider: 'OpenAI',
      model: 'gpt-4o-mini',
      temperature: 0.1,
      input_tariff_per_1k: 0.00015,
      output_tariff_per_1k: 0.00060
    };
  }

  public static getCompositeSemanticModelEvidence(): AG011CompositeSemanticModelEvidence {
    const configs = [
      { id: 'AG011-SEMANTIC-INPUT-001', version: '1.0', cfg: this.getSemanticInputManifest() },
      { id: 'AG011-SEMANTIC-OUTPUT-001', version: '1.0', cfg: this.getSemanticOutputManifest() },
      { id: 'AG011-TECHNICAL-MEMORY-PROMPT-001', version: '1.0', cfg: this.getPromptManifest() },
      { id: 'AG011-SEMANTIC-RULES-001', version: '1.0', cfg: this.getSemanticRulesManifest() },
      { id: 'AG011-OPENAI-POLICY-001', version: '1.0', cfg: this.getOpenAIPolicyManifest() }
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
      model_id: 'AG011-SEMANTIC-LAYER',
      composite_version: '1.0',
      manifests,
      ag011_semantic_model_sha256: compositeSha
    };
  }
}
