// supabase/functions/agents-orchestrator/modules/m013/status/m013-safety-status-engine.ts
// Safety Status Engine deriving CONTROLS_COMPLETE, BLOCKED, REVIEW_REQUIRED (v1.0)
// Frozen under Token: M013-SAFETY-STATUS-RULES-001

import type { M013SafetyStatus, SafetyBlockingReason, SafetyConflict } from '../types/m013.types.ts';

export class M013SafetyStatusEngine {
  public static deriveStatus(
    blockingReasons: SafetyBlockingReason[],
    conflicts: SafetyConflict[],
    hasRequirements: boolean
  ): { status: M013SafetyStatus; is_blocked: boolean; controls_complete: boolean } {
    if (conflicts.length > 0) {
      return {
        status: 'REVIEW_REQUIRED',
        is_blocked: true,
        controls_complete: false
      };
    }

    const hasCriticalBlock = blockingReasons.some(r => r.severity === 'CRITICAL_BLOCK');
    if (hasCriticalBlock) {
      return {
        status: 'BLOCKED',
        is_blocked: true,
        controls_complete: false
      };
    }

    const hasWarning = blockingReasons.some(r => r.severity === 'WARNING');
    if (hasWarning) {
      return {
        status: 'CONTROLS_INCOMPLETE',
        is_blocked: false,
        controls_complete: false
      };
    }

    return {
      status: 'CONTROLS_COMPLETE',
      is_blocked: false,
      controls_complete: true
    };
  }
}
