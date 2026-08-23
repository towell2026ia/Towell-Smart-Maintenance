// supabase/functions/agents-orchestrator/agents/ag012/semantic/ag012-semantic-coordinator.ts
// Semantic Coordinator executing the explanation pipeline (v1.0)
// Frozen under Token: AG012-SEMANTIC-LAYER-001

import type { InterventionRecommendationPackage } from '../types/ag012.types.ts';
import { AG012SemanticInputBuilder } from './ag012-semantic-input-builder.ts';
import { AG012MiMoProviderAdapter, type MiMoExecutionResult } from '../adapters/mimo-provider.adapter.ts';
import { AG012SemanticSchemaValidator } from './ag012-semantic-schema-validator.ts';
import { AG012SemanticReferenceValidator } from './ag012-semantic-reference-validator.ts';
import { AG012ProtectedFieldValidator } from './ag012-protected-field-validator.ts';
import { AG012SemanticMergeGuard } from './ag012-semantic-merge-guard.ts';
import { AG012SemanticConfigRegistry } from '../config/ag012-semantic-config-registry.ts';

export class AG012SemanticCoordinator {
  public static async explain(
    deterministicPkg: InterventionRecommendationPackage,
    upstreamSha: string,
    apiKey?: string,
    mockResponse?: any
  ): Promise<{
    merged_package: InterventionRecommendationPackage;
    telemetry: {
      duration_ms: number;
      llm_calls: number;
      tokens: number;
      cost_usd: number;
      provider: string;
      model: string;
    };
  }> {
    // 1. Verify upstream fingerprint
    if (upstreamSha !== AG012SemanticConfigRegistry.UPSTREAM_DECISION_SHA256) {
      throw new Error(
        `[AG012_SEMANTIC_UPSTREAM_MODEL_MISMATCH] Upstream decision SHA mismatch: esperado ${AG012SemanticConfigRegistry.UPSTREAM_DECISION_SHA256}, recibido ${upstreamSha}`
      );
    }

    // 2. Build semantic input
    const inputPayload = AG012SemanticInputBuilder.build(deterministicPkg, upstreamSha);

    // 3. Execute MiMo via adapter wrapper
    const mimoResult: MiMoExecutionResult = await AG012MiMoProviderAdapter.execute(
      inputPayload,
      apiKey,
      mockResponse
    );

    // 4. Validate schema
    AG012SemanticSchemaValidator.validate(mimoResult.output);

    // 5. Validate protected fields (recommendation echo match)
    AG012ProtectedFieldValidator.validate(mimoResult.output, inputPayload);

    // 6. Validate cited references
    AG012SemanticReferenceValidator.validate(mimoResult.output, inputPayload);

    // 7. Merge semantic explanation into immutable deterministic package
    const merged = AG012SemanticMergeGuard.merge(deterministicPkg, mimoResult.output);

    return {
      merged_package: merged,
      telemetry: {
        duration_ms: mimoResult.latency_ms,
        llm_calls: 1,
        tokens: mimoResult.total_tokens,
        cost_usd: mimoResult.cost_usd,
        provider: mimoResult.provider,
        model: mimoResult.model
      }
    };
  }
}
