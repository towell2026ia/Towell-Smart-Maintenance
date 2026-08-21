// supabase/functions/agents-orchestrator/agents/ag011/lifecycle/ag011-memory-status-engine.ts
// Memory Status Engine for AG-011 (v1.0)
// Frozen under Token: AG011-LIFECYCLE-ENGINE-001
// Invariant: Status Transitions & Retrieval State Visibility (§79-88 PRD-AG-011.2)

import { AG011StatusTransitionGuard } from '../guards/ag011-status-transition-guard.ts';
import type { AG011MemoryStatus } from '../types/ag011.types.ts';

export class AG011MemoryStatusEngine {
  public static isProductivelyRetrievable(status: AG011MemoryStatus): boolean {
    return status === 'APPROVED';
  }

  public static transitionStatus(current: AG011MemoryStatus, next: AG011MemoryStatus): AG011MemoryStatus {
    AG011StatusTransitionGuard.assertValidTransition(current, next);
    return next;
  }
}
