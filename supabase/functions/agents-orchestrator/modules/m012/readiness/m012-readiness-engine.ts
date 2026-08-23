// supabase/functions/agents-orchestrator/modules/m012/readiness/m012-readiness-engine.ts
// Readiness Engine for M-012 (v1.0)
// Frozen under Token: M012-READINESS-ENGINE-001
// Invariant: Deterministic scoring, READY != AUTHORIZED, READY != SAFETY_CLEARED (§78-86 PRD-M-012.2)

import type { ReadinessResult, M012ReadinessStatus, DataGap, SafetyDependency, PreparationPart, ChecklistRequirement, WorkScopeSnapshot } from '../types/m012.types.ts';

export class M012ReadinessEngine {
  public static calculate(params: {
    scope: WorkScopeSnapshot;
    parts: PreparationPart[];
    checklist: ChecklistRequirement | null;
    safetyDependencies: SafetyDependency[];
    gaps: DataGap[];
  }): ReadinessResult {
    const blockingReasons: string[] = [];
    const warnings: string[] = [];
    let readyScore = 100;

    // 1. Evaluate Data Gaps
    for (const gap of params.gaps) {
      if (gap.impact_level === 'BLOCKING') {
        blockingReasons.push(`[${gap.category}] ${gap.description}`);
        readyScore -= 30;
      } else if (gap.impact_level === 'WARNING') {
        warnings.push(`[${gap.category}] ${gap.description}`);
        readyScore -= 10;
      }
    }

    // 2. Evaluate Scope Integrity
    if (!params.scope.requested_activities || params.scope.requested_activities.length === 0) {
      if (!blockingReasons.some(r => r.includes('actividades'))) {
        blockingReasons.push('Sin actividades solicitadas documentadas.');
      }
    }

    // 3. Evaluate Checklist Status
    if (!params.checklist || params.checklist.status === 'MISSING_REQUIRED_CHECKLIST') {
      if (!blockingReasons.some(r => r.includes('checklist') || r.includes('plantilla'))) {
        blockingReasons.push('Falta checklist obligatorio para este tipo de mantenimiento.');
      }
    }

    // 4. Bound Score
    readyScore = Math.max(0, Math.min(100, readyScore));

    // 5. Determine Final Readiness Status
    let status: M012ReadinessStatus = 'READY';

    if (params.gaps.some(g => g.category === 'CONFLICTING')) {
      status = 'REVIEW_REQUIRED';
    } else if (blockingReasons.some(r => r.includes('Sin actividades') || r.includes('no existe'))) {
      status = 'BLOCKED_MISSING_INFORMATION';
    } else if (blockingReasons.length > 0) {
      status = 'BLOCKED_MISSING_RESOURCE';
    } else if (warnings.length > 0) {
      status = 'PARTIALLY_READY';
    } else {
      status = 'READY';
    }

    const readyItemsCount =
      (params.scope.requested_activities.length > 0 ? 1 : 0) +
      (params.checklist && params.checklist.status === 'RESOLVED' ? 1 : 0) +
      params.parts.filter(p => p.stock_status === 'AVAILABLE_IN_STOCK').length;

    const missingItemsCount = blockingReasons.length + warnings.length;

    return {
      status,
      readiness_score: readyScore,
      is_ready_for_execution: status === 'READY', // True only if status is strictly READY
      blocking_reasons: blockingReasons,
      warnings,
      ready_items_count: readyItemsCount,
      missing_items_count: missingItemsCount,
      safety_handoff_required: params.safetyDependencies.length > 0
    };
  }
}
