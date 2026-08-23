// supabase/functions/agents-orchestrator/modules/m012/resolvers/m012-checklist-resolver.ts
// Checklist Resolver for M-012 (v1.0)
// Frozen under Token: M012-CHECKLIST-ENGINE-001
// Invariant: checklist_creation = 0, wrong_checklist_resolution = 0 (§51-60 PRD-M-012.2)

import type { ChecklistRequirement, M012MaintenanceType } from '../types/m012.types.ts';

export class M012ChecklistResolver {
  public static resolve(
    maintenanceType: M012MaintenanceType,
    machineFamily?: string | null,
    checklistsCatalog?: any[]
  ): ChecklistRequirement {
    // 1. Determine expected checklist ID pattern by maintenance flow
    let expectedPattern = 'CHK-CORR-01';
    let defaultName = 'Checklist de Verificación y Cierre Correctivo';

    switch (maintenanceType) {
      case 'PREVENTIVE':
        expectedPattern = 'CHK-PREV-01';
        defaultName = 'Checklist de Mantenimiento Preventivo Estándar';
        break;
      case 'PREDICTIVE':
        expectedPattern = 'CHK-PRED-01';
        defaultName = 'Formato de Levantamiento e Inspección Predictiva';
        break;
      case 'AUTONOMOUS':
        expectedPattern = 'CHK-AUTO-01';
        defaultName = 'Checklist de Inspección Autónoma Semanal';
        break;
      case 'OVERHAUL':
        expectedPattern = 'CHK-OVER-01';
        defaultName = 'Checklist de Inspección de Overhaul / Mayor';
        break;
      case 'CORRECTIVE':
      default:
        expectedPattern = 'CHK-CORR-01';
        defaultName = 'Checklist de Verificación y Cierre Correctivo';
        break;
    }

    // 2. Check catalog if provided
    if (checklistsCatalog && Array.isArray(checklistsCatalog)) {
      const match = checklistsCatalog.find(c =>
        c.id === expectedPattern ||
        c.codigo === expectedPattern ||
        c.maintenance_type === maintenanceType
      );

      if (!match) {
        return {
          checklist_id: expectedPattern,
          checklist_name: defaultName,
          maintenance_type: maintenanceType,
          is_required: true,
          status: 'MISSING_REQUIRED_CHECKLIST',
          resolution_source: 'AG-006 / Catálogo de Formatos'
        };
      }

      return {
        checklist_id: match.id || expectedPattern,
        checklist_name: match.nombre || match.checklist_name || defaultName,
        maintenance_type: maintenanceType,
        is_required: true,
        status: 'RESOLVED',
        resolution_source: 'AG-006 / Catálogo de Formatos'
      };
    }

    // Default canonical resolution
    return {
      checklist_id: expectedPattern,
      checklist_name: defaultName,
      maintenance_type: maintenanceType,
      is_required: true,
      status: 'RESOLVED',
      resolution_source: 'AG-006 / Catálogo de Formatos'
    };
  }
}
