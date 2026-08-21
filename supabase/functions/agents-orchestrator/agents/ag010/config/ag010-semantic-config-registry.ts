// supabase/functions/agents-orchestrator/agents/ag010/config/ag010-semantic-config-registry.ts
// Canonical Semantic Configuration Registry & Hash Engine for AG-010.3-R1 (v1.0)
// Frozen under Token: AG010-SEMANTIC-LAYER-001
// Invariant: Canonical JSON serialization and individual/composite SHA-256 fingerprints (§66-70 PRD-AG-010.3-R1)

import { canonicalJsonStringify, computeSha256 } from './ag010-retrieval-config-registry.ts';

export interface AG010SemanticManifestEvidence {
  manifest_id: string;
  version: string;
  canonical_configuration: any;
  sha256: string;
}

export interface AG010CompositeSemanticModelEvidence {
  model_id: string;
  composite_version: string;
  manifests: Record<string, AG010SemanticManifestEvidence>;
  ag010_semantic_model_sha256: string;
}

export class AG010SemanticConfigRegistry {
  public static getPromptConfig(): any {
    return {
      manifest_id: 'AG010-FIVE-WHYS-PROMPT-001',
      version: '1.0',
      model_role: 'ASSISTANT_FOR_FIVE_WHYS_AND_PREVIOUS_CASES',
      untrusted_data_policy: 'STRICT_RAW_ISOLATION',
      prohibited_actions: ['CREATE_OT', 'STOP_MACHINE', 'AUTHORIZE_EXPENSE']
    };
  }

  public static getSemanticRulesConfig(): any {
    return {
      manifest_id: 'AG010-SEMANTIC-RULES-001',
      version: '1.0',
      max_why_depth: 5,
      early_stop_policy: 'PERMITTED_ON_EVIDENCE_EXHAUSTION',
      root_cause_authority: 'HYPOTHESIS_ONLY_AI_CONFIRMATION_FORBIDDEN',
      human_validation_required: true
    };
  }

  public static getMiMoPolicyConfig(): any {
    return {
      manifest_id: 'AG010-MIMO-POLICY-001',
      version: '1.0',
      provider: 'Xiaomi MiMo',
      model: 'mimo-v2.5',
      pricing: {
        input_per_1m_usd: 0.14,
        output_per_1m_usd: 0.28
      },
      fast_path_policy: 'INSUFFICIENT_DATA_FAST_PATH_ENABLED'
    };
  }

  public static getSemanticInputConfig(): any {
    return {
      manifest_id: 'AG010-SEMANTIC-INPUT-001',
      version: '1.0',
      source_package: 'AG010-EVIDENCE-PACKAGE-001',
      protected_fields: [
        'case_id', 'asset_id', 'evaluation_at', 'certified_facts',
        'operator_statements', 'previous_cases', 'data_quality', 'retrieval_model_sha256'
      ]
    };
  }

  public static getSemanticOutputConfig(): any {
    return {
      manifest_id: 'AG010-SEMANTIC-OUTPUT-001',
      version: '1.0',
      strict_json: true,
      additional_properties: false,
      allowed_root_cause_statuses: ['HYPOTHESIS', 'SUPPORTED_HYPOTHESIS', 'INSUFFICIENT_EVIDENCE', 'DISPROVEN'],
      prohibited_root_cause_statuses: ['CONFIRMED']
    };
  }

  public static getCompositeSemanticModelEvidence(): AG010CompositeSemanticModelEvidence {
    const configs = [
      { id: 'AG010-FIVE-WHYS-PROMPT-001', version: '1.0', cfg: this.getPromptConfig() },
      { id: 'AG010-SEMANTIC-RULES-001', version: '1.0', cfg: this.getSemanticRulesConfig() },
      { id: 'AG010-MIMO-POLICY-001', version: '1.0', cfg: this.getMiMoPolicyConfig() },
      { id: 'AG010-SEMANTIC-INPUT-001', version: '1.0', cfg: this.getSemanticInputConfig() },
      { id: 'AG010-SEMANTIC-OUTPUT-001', version: '1.0', cfg: this.getSemanticOutputConfig() }
    ];

    const manifests: Record<string, AG010SemanticManifestEvidence> = {};

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
      model_id: 'AG010-SEMANTIC-LAYER',
      composite_version: '1.0',
      manifests,
      ag010_semantic_model_sha256: compositeSha
    };
  }
}
