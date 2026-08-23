// supabase/functions/agents-orchestrator/modules/m012/resolvers/m012-dependency-resolver.ts
// Dependency Resolver for M-012 (v1.0)
// Frozen under Token: M012-DEPENDENCY-ENGINE-001
// Invariant: subtask_creation = 0, dependency != action (§61-65 PRD-M-012.2)

import type { PreparationDependency } from '../types/m012.types.ts';

export class M012DependencyResolver {
  public static resolve(rawDependencies?: any[], rawOT?: any): PreparationDependency[] {
    const list: PreparationDependency[] = [];

    if (rawDependencies && Array.isArray(rawDependencies)) {
      for (const d of rawDependencies) {
        list.push({
          dependency_id: d.id || `DEP-${list.length + 1}`,
          dependency_type: d.type || 'PREVIOUS_OT',
          description: d.description || d.descripcion || 'Dependencia operacional',
          is_resolved: typeof d.is_resolved === 'boolean' ? d.is_resolved : false
        });
      }
    }

    // Check if OT requires operational stop
    if (rawOT?.requiere_paro_operacional && !list.some(d => d.dependency_type === 'OPERATIONAL_STOP')) {
      list.push({
        dependency_id: `DEP-STOP-${rawOT.id}`,
        dependency_type: 'OPERATIONAL_STOP',
        description: 'Requiere confirmación de paro de telar por producción',
        is_resolved: false
      });
    }

    return list;
  }
}
