// supabase/functions/agents-orchestrator/modules/m012/resolvers/m012-safety-dependency-resolver.ts
// Safety Dependency Resolver for M-012 (v1.0)
// Frozen under Token: M012-SAFETY-DEPENDENCY-ENGINE-001
// Invariant: safety_authorization = 0, never output SAFETY_CLEARED (§66-72 PRD-M-012.2)

import type { SafetyDependency, TechnicalMemoryReference } from '../types/m012.types.ts';

export class M012SafetyDependencyResolver {
  public static resolve(
    safetyRaw?: any[],
    memories?: TechnicalMemoryReference[],
    componentId?: string | null
  ): SafetyDependency[] {
    const map = new Map<string, SafetyDependency>();

    // 1. Ingest explicit safety requirements from OT
    if (safetyRaw && Array.isArray(safetyRaw)) {
      for (const s of safetyRaw) {
        const id = s.id || `SAF-${map.size + 1}`;
        map.set(id, {
          dependency_id: id,
          dependency_type: s.type || 'LOTO_REQUIRED',
          description: s.description || s.descripcion || 'Requisito de seguridad documentado',
          status: 'IDENTIFIED_PENDING_M013',
          source: s.source || 'WORK_ORDER_SCOPE'
        });
      }
    }

    // 2. Identify LOTO if electrical/motor component
    if (componentId && (componentId.toUpperCase().includes('MOTOR') || componentId.toUpperCase().includes('ELECTR'))) {
      if (!map.has('SAF-LOTO-DEFAULT')) {
        map.set('SAF-LOTO-DEFAULT', {
          dependency_id: 'SAF-LOTO-DEFAULT',
          dependency_type: 'LOTO_REQUIRED',
          description: 'Bloqueo y etiquetado de alimentación eléctrica principal (LOTO)',
          status: 'IDENTIFIED_PENDING_M013',
          source: 'COMPONENT_SAFETY_RULE'
        });
      }
    }

    // 3. Ingest precautions from technical memories
    if (memories && Array.isArray(memories)) {
      for (const mem of memories) {
        for (const prec of mem.critical_precautions) {
          const id = `SAF-MEM-${mem.memory_id}-${map.size + 1}`;
          map.set(id, {
            dependency_id: id,
            dependency_type: prec.toUpperCase().includes('LOTO') ? 'LOTO_REQUIRED' : 'PERMIT_REQUIRED',
            description: prec,
            status: 'IDENTIFIED_PENDING_M013',
            source: `AG-011 Memoria ${mem.memory_id}`
          });
        }
      }
    }

    return Array.from(map.values());
  }
}
