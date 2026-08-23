// supabase/functions/agents-orchestrator/modules/m012/resolvers/m012-ot-resolver.ts
// OT Resolver for M-012 (v1.0)
// Frozen under Token: M012-OT-RESOLVER-001
// Invariant: Find existing OT, validate state, invented_OT = 0, OT_creation_by_M012 = 0 (§10-12 PRD-M-012.2)

import type { M012MaintenanceType } from '../types/m012.types.ts';

export interface ResolvedOT {
  work_order_id: string;
  asset_id: string;
  title: string;
  maintenance_type: M012MaintenanceType;
  state: string;
  component_id?: string | null;
  department?: string | null;
  requested_activities: string[];
  created_at: string;
}

export class M012OTResolver {
  public static resolve(workOrderId: string, rawOT?: any): ResolvedOT {
    if (!workOrderId) {
      throw new Error('[M012_WORK_ORDER_NOT_FOUND] work_order_id no provisto.');
    }

    if (!rawOT || rawOT.id !== workOrderId) {
      throw new Error(`[M012_WORK_ORDER_NOT_FOUND] La orden de trabajo '${workOrderId}' no existe en la base de datos.`);
    }

    // Blocked states
    if (rawOT.estado === 'CANCELLED' || rawOT.estado === 'CLOSED') {
      throw new Error(`[M012_OT_STATE_BLOCKED] La orden de trabajo '${workOrderId}' se encuentra en estado '${rawOT.estado}' y no admite preparación.`);
    }

    let maintenanceType: M012MaintenanceType = 'CORRECTIVE';
    const rawType = (rawOT.tipo_mantenimiento || rawOT.tipo || '').toUpperCase();
    if (rawType.includes('PREVENTIV')) maintenanceType = 'PREVENTIVE';
    else if (rawType.includes('PREDICTIV')) maintenanceType = 'PREDICTIVE';
    else if (rawType.includes('AUTONOM')) maintenanceType = 'AUTONOMOUS';
    else if (rawType.includes('OVERHAUL') || rawType.includes('MAYOR')) maintenanceType = 'OVERHAUL';

    const activities: string[] = Array.isArray(rawOT.actividades_solicitadas)
      ? rawOT.actividades_solicitadas
      : rawOT.descripcion
        ? [rawOT.descripcion]
        : ['Intervención técnica general'];

    return {
      work_order_id: rawOT.id || workOrderId,
      asset_id: rawOT.maquina_id || rawOT.asset_id || 'UNKNOWN',
      title: rawOT.titulo || rawOT.descripcion || `Orden de Trabajo ${workOrderId}`,
      maintenance_type: maintenanceType,
      state: rawOT.estado || 'PENDING',
      component_id: rawOT.component_id || null,
      department: rawOT.departamento || rawOT.department || null,
      requested_activities: activities,
      created_at: rawOT.fecha_creacion || rawOT.created_at || new Date().toISOString()
    };
  }
}
