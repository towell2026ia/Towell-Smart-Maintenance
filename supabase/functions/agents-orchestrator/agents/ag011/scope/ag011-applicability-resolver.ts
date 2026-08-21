// supabase/functions/agents-orchestrator/agents/ag011/scope/ag011-applicability-resolver.ts
// Applicability & Limitations Resolver for AG-011 (v1.0)
// Frozen under Token: AG011-SCOPE-ENGINE-001
// Invariant: Deterministic Matching of Scope & Operational Conditions (§58-62 PRD-AG-011.2)

import type { AG011MemoryScope } from '../types/ag011.types.ts';

export interface ScopeMatchResult {
  matches: boolean;
  scoreBonus: number;
  matchType: string;
}

export class AG011ApplicabilityResolver {
  public static evaluateScopeMatch(
    memoryScope: AG011MemoryScope,
    queryContext: {
      asset_id?: string;
      machine_model?: string;
      machine_family?: string;
      component_id?: string;
      department?: string;
    }
  ): ScopeMatchResult {
    // 1. ASSET_SPECIFIC check
    if (memoryScope.scope_level === 'ASSET_SPECIFIC') {
      if (memoryScope.asset_id && memoryScope.asset_id === queryContext.asset_id) {
        return { matches: true, scoreBonus: 35, matchType: 'EXACT_ASSET' };
      }
      return { matches: false, scoreBonus: 0, matchType: 'ASSET_MISMATCH' };
    }

    // 2. MACHINE_MODEL check
    if (memoryScope.scope_level === 'MACHINE_MODEL') {
      if (memoryScope.machine_model && memoryScope.machine_model === queryContext.machine_model) {
        return { matches: true, scoreBonus: 25, matchType: 'MODEL_MATCH' };
      }
      return { matches: false, scoreBonus: 0, matchType: 'MODEL_MISMATCH' };
    }

    // 3. MACHINE_FAMILY check
    if (memoryScope.scope_level === 'MACHINE_FAMILY') {
      if (memoryScope.machine_family && memoryScope.machine_family === queryContext.machine_family) {
        return { matches: true, scoreBonus: 15, matchType: 'FAMILY_MATCH' };
      }
      return { matches: false, scoreBonus: 0, matchType: 'FAMILY_MISMATCH' };
    }

    // 4. COMPONENT check
    if (memoryScope.scope_level === 'COMPONENT') {
      if (memoryScope.component_id && memoryScope.component_id === queryContext.component_id) {
        return { matches: true, scoreBonus: 20, matchType: 'COMPONENT_MATCH' };
      }
      return { matches: false, scoreBonus: 0, matchType: 'COMPONENT_MISMATCH' };
    }

    // 5. DEPARTMENT check
    if (memoryScope.scope_level === 'DEPARTMENT') {
      if (memoryScope.department && memoryScope.department === queryContext.department) {
        return { matches: true, scoreBonus: 10, matchType: 'DEPT_MATCH' };
      }
      return { matches: false, scoreBonus: 0, matchType: 'DEPT_MISMATCH' };
    }

    // 6. GENERAL check
    if (memoryScope.scope_level === 'GENERAL') {
      return { matches: true, scoreBonus: 5, matchType: 'GENERAL_MATCH' };
    }

    return { matches: false, scoreBonus: 0, matchType: 'NO_MATCH' };
  }
}
