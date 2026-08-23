// supabase/functions/agents-orchestrator/modules/m012/guards/m012-scope-preservation-guard.ts
// Scope Preservation Guard for M-012 (v1.0)
// Frozen under Token: M012-SCOPE-ENGINE-001
// Invariant: automatic_work_scope_expansion = 0 (§18-19 PRD-M-012.2)

import type { WorkScopeSnapshot } from '../types/m012.types.ts';

export class M012ScopePreservationGuard {
  public static assertScopePreserved(
    originalScope: WorkScopeSnapshot,
    effectiveScope: WorkScopeSnapshot
  ): void {
    if (originalScope.work_order_id !== effectiveScope.work_order_id) {
      throw new Error('[M012_SCOPE_VIOLATION] work_order_id fue mutado durante la preparación.');
    }
    if (originalScope.asset_id !== effectiveScope.asset_id) {
      throw new Error('[M012_SCOPE_VIOLATION] asset_id fue mutado durante la preparación.');
    }
    if (originalScope.maintenance_type !== effectiveScope.maintenance_type) {
      throw new Error('[M012_SCOPE_VIOLATION] maintenance_type fue mutado durante la preparación.');
    }
    if (originalScope.requested_activities.length !== effectiveScope.requested_activities.length) {
      throw new Error('[M012_SCOPE_VIOLATION] Las actividades solicitadas de la OT fueron ampliadas o alteradas.');
    }
  }

  public static handleAdditionalDiscoveredTask(
    taskDescription: string,
    source: string
  ): { action: 'REPORT_AS_DEPENDENCY'; dependencyDescription: string } {
    // Under no circumstance is the task added to requested_activities.
    // It is reported as an external dependency requiring human supervision.
    return {
      action: 'REPORT_AS_DEPENDENCY',
      dependencyDescription: `Tarea complementaria sugerida por ${source}: ${taskDescription}`
    };
  }
}
