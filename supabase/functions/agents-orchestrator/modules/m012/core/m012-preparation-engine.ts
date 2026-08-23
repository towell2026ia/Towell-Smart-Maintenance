// supabase/functions/agents-orchestrator/modules/m012/core/m012-preparation-engine.ts
// Master Deterministic OT Preparation Engine for M-012 (v1.0)
// Frozen under Token: M012-PREPARATION-ENGINE-001
// Invariant: Zero AI, Zero LLM calls, Zero mutations, 100% Deterministic (§1-8, 168-170 PRD-M-012.2)

import type { M012ExecutionRequest, M012ExecutionResponse, OTPreparationPackage } from '../types/m012.types.ts';
import { M012InputValidator } from '../validators/m012-input-validator.ts';
import { M012OTResolver } from '../resolvers/m012-ot-resolver.ts';
import { M012AssetResolver } from '../resolvers/m012-asset-resolver.ts';
import { M012Asset360Resolver } from '../resolvers/m012-asset360-resolver.ts';
import { M012TechnicalMemoryResolver } from '../resolvers/m012-technical-memory-resolver.ts';
import { M012PartsReadinessResolver } from '../resolvers/m012-parts-readiness-resolver.ts';
import { M012ToolsResourcesResolver } from '../resolvers/m012-tools-resources-resolver.ts';
import { M012ChecklistResolver } from '../resolvers/m012-checklist-resolver.ts';
import { M012DependencyResolver } from '../resolvers/m012-dependency-resolver.ts';
import { M012SafetyDependencyResolver } from '../resolvers/m012-safety-dependency-resolver.ts';
import { M012DataGapEngine } from '../readiness/m012-data-gap-engine.ts';
import { M012ReadinessEngine } from '../readiness/m012-readiness-engine.ts';
import { M012WorkScopeSnapshotBuilder } from './m012-work-scope-snapshot.ts';
import { M012ScopePreservationGuard } from '../guards/m012-scope-preservation-guard.ts';
import { M012PreparationPackageBuilder } from './m012-preparation-package-builder.ts';
import { M012OutputValidator } from '../validators/m012-output-validator.ts';
import { M012PreparationConfigRegistry } from '../config/m012-preparation-config-registry.ts';

export class M012PreparationEngine {
  public static execute(request: M012ExecutionRequest): M012ExecutionResponse {
    const startTime = Date.now();

    // 1. Input Validation
    const validation = M012InputValidator.validate(request);
    if (!validation.isValid) {
      throw new Error(validation.error || '[M012_INPUT_ERROR] Request inválido.');
    }

    const evaluationAt = request.evaluation_at || new Date().toISOString();

    // 2. OT Resolution
    const resolvedOT = M012OTResolver.resolve(request.work_order_id, request.work_order_raw);

    // 3. Asset Resolution
    const targetAssetId = request.asset_id || resolvedOT.asset_id;
    const resolvedAsset = M012AssetResolver.resolve(targetAssetId, request.asset_raw, resolvedOT.asset_id);

    // 4. Work Scope Snapshot & Preservation
    const scopeSnapshot = M012WorkScopeSnapshotBuilder.build(resolvedOT);
    M012ScopePreservationGuard.assertScopePreserved(scopeSnapshot, {
      ...scopeSnapshot,
      work_order_id: resolvedOT.work_order_id,
      asset_id: resolvedOT.asset_id,
      maintenance_type: resolvedOT.maintenance_type,
      requested_activities: [...resolvedOT.requested_activities]
    });

    // 5. Source Context Resolvers (M-010, M-011)
    const m010Context = M012Asset360Resolver.resolve(targetAssetId, request.m010_context, evaluationAt);
    const m011Context = request.m011_context;

    // 6. AG-011 Technical Memory Retrieval (Strict Top-5, approved only)
    const technicalMemories = M012TechnicalMemoryResolver.resolve(request.ag011_memories, evaluationAt);

    // 7. Checklist Resolution
    const resolvedChecklist = M012ChecklistResolver.resolve(
      resolvedOT.maintenance_type,
      resolvedAsset.machine_family,
      request.checklists_raw
    );

    // 8. Parts Readiness Resolution
    const parts = M012PartsReadinessResolver.resolve(
      request.parts_raw,
      technicalMemories,
      request.work_order_raw?.refacciones_planificadas
    );

    // 9. Tools & Resources Resolution
    const tools = M012ToolsResourcesResolver.resolveTools(
      request.work_order_raw?.herramientas_documentadas,
      technicalMemories
    );
    const resources = M012ToolsResourcesResolver.resolveResources(
      request.work_order_raw?.recursos_documentados
    );

    // 10. Dependency Resolution
    const dependencies = M012DependencyResolver.resolve(
      request.work_order_raw?.dependencias_raw,
      request.work_order_raw
    );

    // 11. Safety Dependency Resolution (Handoff to M-013)
    const safetyDependencies = M012SafetyDependencyResolver.resolve(
      request.work_order_raw?.seguridad_raw,
      technicalMemories,
      resolvedOT.component_id
    );

    // 12. Data Gap Engine
    const gaps = M012DataGapEngine.identifyGaps({
      scope: scopeSnapshot,
      parts,
      checklist: resolvedChecklist,
      hasConflictingData: request.work_order_raw?.has_conflicting_data,
      conflictDescription: request.work_order_raw?.conflict_description
    });

    // 13. Readiness Engine
    const readiness = M012ReadinessEngine.calculate({
      scope: scopeSnapshot,
      parts,
      checklist: resolvedChecklist,
      safetyDependencies,
      gaps
    });

    // 14. Build Preparation Package
    const pkg: OTPreparationPackage = M012PreparationPackageBuilder.build({
      workOrderId: resolvedOT.work_order_id,
      assetId: targetAssetId,
      evaluationAt,
      scope: scopeSnapshot,
      asset: resolvedAsset,
      m010Context,
      m011Context,
      memories: technicalMemories,
      checklist: resolvedChecklist,
      parts,
      tools,
      resources,
      dependencies,
      safetyDependencies,
      gaps,
      readiness
    });

    const durationMs = Date.now() - startTime;

    const response: M012ExecutionResponse = {
      success: true,
      module_id: 'M-012',
      version: '1.0',
      work_order_id: resolvedOT.work_order_id,
      asset_id: targetAssetId,
      evaluation_at: evaluationAt,
      package: pkg,
      telemetry: {
        duration_ms: durationMs,
        llm_calls: 0,
        tokens: 0,
        cost_usd: 0
      }
    };

    // 15. Validate Output Contract
    M012OutputValidator.validate(response);

    return response;
  }
}
