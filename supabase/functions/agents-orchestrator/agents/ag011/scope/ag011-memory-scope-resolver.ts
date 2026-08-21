// supabase/functions/agents-orchestrator/agents/ag011/scope/ag011-memory-scope-resolver.ts
// Memory Scope Hierarchy & Promotion Resolver for AG-011 (v1.0)
// Frozen under Token: AG011-SCOPE-ENGINE-001
// Invariant: 6-Level Hierarchy & Conservative Default Scope (§51-57 PRD-AG-011.2)

import type { AG011MemoryScope, AG011ScopeLevel } from '../types/ag011.types.ts';

export class AG011MemoryScopeResolver {
  public static resolveScope(params: {
    requested_scope?: AG011ScopeLevel;
    asset_id?: string | null;
    machine_model?: string | null;
    machine_family?: string | null;
    component_id?: string | null;
    department?: string | null;
    validated_asset_count?: number;
    is_super_admin?: boolean;
  }): AG011MemoryScope {
    const requested = params.requested_scope || 'ASSET_SPECIFIC';
    const assetCount = params.validated_asset_count || 1;

    // Rule: Single asset evidence must remain ASSET_SPECIFIC unless authorized
    if (requested === 'GENERAL' && !params.is_super_admin) {
      console.warn('[AG011ScopeResolver] Promoción a GENERAL denegada sin autorización de Super Admin.');
      return {
        scope_level: 'ASSET_SPECIFIC',
        asset_id: params.asset_id || null,
        machine_model: params.machine_model || null,
        machine_family: params.machine_family || null,
        component_id: params.component_id || null,
        department: params.department || null,
        required_conditions: [],
        excluded_conditions: []
      };
    }

    if (requested === 'MACHINE_MODEL' && assetCount < 2 && !params.is_super_admin) {
      console.warn('[AG011ScopeResolver] Promoción a MACHINE_MODEL denegada: requiere evidencia en >= 2 activos.');
      return {
        scope_level: 'ASSET_SPECIFIC',
        asset_id: params.asset_id || null,
        machine_model: params.machine_model || null,
        machine_family: params.machine_family || null,
        component_id: params.component_id || null,
        department: params.department || null,
        required_conditions: [],
        excluded_conditions: []
      };
    }

    return {
      scope_level: requested,
      asset_id: requested === 'ASSET_SPECIFIC' ? (params.asset_id || null) : null,
      machine_model: params.machine_model || null,
      machine_family: params.machine_family || null,
      component_id: params.component_id || null,
      department: params.department || null,
      required_conditions: [],
      excluded_conditions: []
    };
  }
}
