// supabase/functions/agents-orchestrator/modules/m012/core/m012-preparation-package-builder.ts
// Preparation Package Builder for M-012 (v1.0)
// Frozen under Token: M012-OT-PREPARATION-PACKAGE-001
// Invariant: Assemble certified preparation package (§87-90 PRD-M-012.2)

import type {
  OTPreparationPackage,
  WorkScopeSnapshot,
  PreparationPart,
  PreparationTool,
  PreparationResource,
  ChecklistRequirement,
  TechnicalMemoryReference,
  PreparationDependency,
  SafetyDependency,
  DataGap,
  ReadinessResult
} from '../types/m012.types.ts';
import type { ResolvedAsset } from '../resolvers/m012-asset-resolver.ts';
import type { M010ResolvedContext } from '../resolvers/m012-asset360-resolver.ts';
import { M012TraceabilityBuilder } from './m012-traceability-builder.ts';

export class M012PreparationPackageBuilder {
  public static build(params: {
    workOrderId: string;
    assetId: string;
    evaluationAt: string;
    scope: WorkScopeSnapshot;
    asset: ResolvedAsset;
    m010Context: M010ResolvedContext;
    m011Context?: any;
    memories: TechnicalMemoryReference[];
    checklist: ChecklistRequirement | null;
    parts: PreparationPart[];
    tools: PreparationTool[];
    resources: PreparationResource[];
    dependencies: PreparationDependency[];
    safetyDependencies: SafetyDependency[];
    gaps: DataGap[];
    readiness: ReadinessResult;
  }): OTPreparationPackage {
    const traceability = M012TraceabilityBuilder.build({
      evaluationAt: params.evaluationAt,
      parts: params.parts,
      tools: params.tools,
      memories: params.memories,
      dependencies: params.dependencies,
      gaps: params.gaps
    });

    return {
      work_order_id: params.workOrderId,
      asset_id: params.assetId,
      evaluation_at: params.evaluationAt,
      scope_snapshot: params.scope,
      asset_context: {
        machine_model: params.asset.machine_model,
        machine_family: params.asset.machine_family,
        department: params.asset.department,
        m010_summary: params.m010Context.summary,
        m011_health_score: params.m011Context?.health_score ?? null,
        m011_risk_score: params.m011Context?.risk_score ?? null
      },
      technical_memories: params.memories,
      checklist: params.checklist,
      parts: params.parts,
      tools: params.tools,
      resources: params.resources,
      dependencies: params.dependencies,
      safety_dependencies: params.safetyDependencies,
      missing_information: params.gaps,
      readiness: params.readiness,
      traceability
    };
  }
}
