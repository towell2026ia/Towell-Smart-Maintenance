// supabase/functions/agents-orchestrator/modules/m012/core/m012-work-scope-snapshot.ts
// Work Scope Snapshot Builder for M-012 (v1.0)
// Frozen under Token: M012-WORK-SCOPE-SNAPSHOT-001
// Invariant: Immutable snapshot of requested work (§16-17 PRD-M-012.2)

import type { WorkScopeSnapshot } from '../types/m012.types.ts';
import type { ResolvedOT } from '../resolvers/m012-ot-resolver.ts';

export class M012WorkScopeSnapshotBuilder {
  public static build(resolvedOT: ResolvedOT): WorkScopeSnapshot {
    return {
      work_order_id: resolvedOT.work_order_id,
      asset_id: resolvedOT.asset_id,
      title: resolvedOT.title,
      maintenance_type: resolvedOT.maintenance_type,
      component_id: resolvedOT.component_id,
      department: resolvedOT.department,
      requested_activities: [...resolvedOT.requested_activities],
      created_at: resolvedOT.created_at
    };
  }
}
