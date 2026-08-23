// supabase/functions/agents-orchestrator/modules/m012/readiness/m012-data-gap-engine.ts
// Data Gap Engine for M-012 (v1.0)
// Frozen under Token: M012-DATA-GAP-ENGINE-001
// Invariant: missing != unknown != not_applicable, conflicting requires review (§73-77 PRD-M-012.2)

import type { DataGap, PreparationPart, ChecklistRequirement, WorkScopeSnapshot } from '../types/m012.types.ts';

export class M012DataGapEngine {
  public static identifyGaps(params: {
    scope: WorkScopeSnapshot;
    parts: PreparationPart[];
    checklist: ChecklistRequirement | null;
    hasConflictingData?: boolean;
    conflictDescription?: string;
  }): DataGap[] {
    const gaps: DataGap[] = [];

    // 1. Check scope completeness
    if (!params.scope.requested_activities || params.scope.requested_activities.length === 0) {
      gaps.push({
        gap_id: 'GAP-SCOPE-01',
        field_or_resource: 'requested_activities',
        category: 'MISSING',
        impact_level: 'BLOCKING',
        description: 'La orden de trabajo no contiene actividades o descripción del problema solicitada.'
      });
    }

    // 2. Check checklist status
    if (params.checklist && params.checklist.status === 'MISSING_REQUIRED_CHECKLIST') {
      gaps.push({
        gap_id: 'GAP-CHK-01',
        field_or_resource: 'checklist',
        category: 'MISSING',
        impact_level: 'BLOCKING',
        description: `No se encontró la plantilla de checklist requerida (${params.checklist.checklist_id}) en el catálogo.`
      });
    }

    // 3. Check parts stock status
    for (const part of params.parts) {
      if (part.classification === 'REQUIRED' && part.stock_status === 'UNKNOWN') {
        gaps.push({
          gap_id: `GAP-PART-STOCK-${part.part_id}`,
          field_or_resource: `parts[${part.part_id}].stock_status`,
          category: 'UNKNOWN',
          impact_level: 'WARNING',
          description: `Disponibilidad en almacén de la refacción requerida ${part.part_id} es desconocida.`
        });
      } else if (part.classification === 'REQUIRED' && part.stock_status === 'OUT_OF_STOCK') {
        gaps.push({
          gap_id: `GAP-PART-OUT-${part.part_id}`,
          field_or_resource: `parts[${part.part_id}].stock_status`,
          category: 'MISSING',
          impact_level: 'BLOCKING',
          description: `Refacción requerida ${part.part_id} se encuentra agotada en almacén.`
        });
      }
    }

    // 4. Check conflicting information
    if (params.hasConflictingData) {
      gaps.push({
        gap_id: 'GAP-CONFLICT-01',
        field_or_resource: 'technical_alignment',
        category: 'CONFLICTING',
        impact_level: 'BLOCKING',
        description: params.conflictDescription || 'Existen contradicciones técnicas entre el alcance de la OT y las fuentes consultadas.'
      });
    }

    return gaps;
  }
}
