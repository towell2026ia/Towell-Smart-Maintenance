// supabase/functions/agents-orchestrator/agents/ag011/guards/ag011-status-transition-guard.ts
// Status Transition Guard for AG-011 (v1.0)
// Frozen under Token: AG011-LIFECYCLE-ENGINE-001
// Invariant: Finite State Machine Transition Validation (§79-88 PRD-AG-011.2)

import type { AG011MemoryStatus } from '../types/ag011.types.ts';

const VALID_TRANSITIONS: Record<AG011MemoryStatus, AG011MemoryStatus[]> = {
  CANDIDATE: ['REVIEW_REQUIRED', 'REJECTED'],
  REVIEW_REQUIRED: ['APPROVED', 'REJECTED', 'CANDIDATE'],
  APPROVED: ['SUPERSEDED', 'RETIRED', 'REVIEW_REQUIRED'],
  SUPERSEDED: ['RETIRED'],
  RETIRED: [],
  REJECTED: ['CANDIDATE']
};

export class AG011StatusTransitionGuard {
  public static assertValidTransition(from: AG011MemoryStatus, to: AG011MemoryStatus): void {
    if (from === to) return;

    const allowed = VALID_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      throw new Error(`[AG011_INVALID_STATUS_TRANSITION] Transición ilegal de '${from}' hacia '${to}'.`);
    }
  }
}
