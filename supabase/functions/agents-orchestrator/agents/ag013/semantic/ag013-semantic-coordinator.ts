// supabase/functions/agents-orchestrator/agents/ag013/semantic/ag013-semantic-coordinator.ts
// Semantic Coordinator for AG-013 Analista de Malos Actores v1.0
// Frozen under Token: AG013-SEMANTIC-LAYER-001

import type { BadActorAnalysisPackage } from '../types/ag013.types.ts';
import { AG013SemanticInputBuilder } from './ag013-semantic-input-builder.ts';
import { AG013MiMoProviderAdapter, type MiMoExecutionResult } from '../adapters/mimo-provider.adapter.ts';
import { AG013SemanticSchemaValidator } from './ag013-semantic-schema-validator.ts';
import { AG013ProtectedFieldValidator } from './ag013-protected-field-validator.ts';
import { AG013SemanticReferenceValidator } from './ag013-semantic-reference-validator.ts';
import { AG013MaterialClaimValidator } from './ag013-material-claim-validator.ts';
import { AG013SemanticMergeGuard } from './ag013-semantic-merge-guard.ts';
import { AG013SemanticConfigRegistry } from '../config/ag013-semantic-config-registry.ts';

export class AG013SemanticCoordinator {
  public static async explain(
    deterministicPkg: BadActorAnalysisPackage,
    upstreamSha: string,
    apiKey?: string,
    mockResponse?: any
  ): Promise<{
    merged_package: BadActorAnalysisPackage;
    telemetry: {
      duration_ms: number;
      llm_calls: number;
      tokens: number;
      input_tokens: number;
      output_tokens: number;
      cost_usd: number;
      provider: string;
      model: string;
    };
  }> {
    // 1. Verify upstream Bad Actor Decision SHA
    if (upstreamSha !== AG013SemanticConfigRegistry.UPSTREAM_BAD_ACTOR_SHA256) {
      throw new Error(
        `[AG013_SEMANTIC_UPSTREAM_MODEL_MISMATCH] Upstream Bad Actor SHA mismatch: esperado ${AG013SemanticConfigRegistry.UPSTREAM_BAD_ACTOR_SHA256}, recibido ${upstreamSha}`
      );
    }

    // 2. Build semantic input
    const inputPayload = AG013SemanticInputBuilder.build(deterministicPkg, upstreamSha);

    // 3. Execute MiMo via domain adapter
    const mimoResult: MiMoExecutionResult = await AG013MiMoProviderAdapter.execute(
      inputPayload,
      apiKey,
      mockResponse
    );

    // 4. Validate schema
    AG013SemanticSchemaValidator.validate(mimoResult.output);

    // 5. Validate protected fields (echo match for classification, rank, score)
    AG013ProtectedFieldValidator.validate(mimoResult.output, inputPayload);

    // 6. Validate material claims
    AG013MaterialClaimValidator.validate(mimoResult.output, inputPayload);

    // 7. Validate cited references
    AG013SemanticReferenceValidator.validate(mimoResult.output, inputPayload);

    // 8. Merge semantic explanation into immutable deterministic package
    const merged = AG013SemanticMergeGuard.merge(deterministicPkg, mimoResult.output);

    return {
      merged_package: merged,
      telemetry: {
        duration_ms: mimoResult.latency_ms,
        llm_calls: 1,
        tokens: mimoResult.total_tokens,
        input_tokens: mimoResult.input_tokens,
        output_tokens: mimoResult.output_tokens,
        cost_usd: mimoResult.cost_usd,
        provider: mimoResult.provider,
        model: mimoResult.model
      }
    };
  }
}
