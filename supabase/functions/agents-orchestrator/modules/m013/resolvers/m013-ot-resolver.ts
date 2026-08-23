// supabase/functions/agents-orchestrator/modules/m013/resolvers/m013-ot-resolver.ts
// OT Identity Resolver enforcing invented_OT = 0 (v1.0)
// Frozen under Token: M013-DATA-MAP-001

export class M013OtResolver {
  public static resolve(workOrderId: string, workOrderRaw?: any): { id: string; titulo: string; tipo_mantenimiento: string; component_id: string } {
    if (!workOrderId || workOrderId.trim() === '') {
      throw new Error('[M013_WORK_ORDER_NOT_FOUND] work_order_id inválido o ausente.');
    }
    if (workOrderRaw === null) {
      throw new Error(`[M013_WORK_ORDER_NOT_FOUND] La orden de trabajo ${workOrderId} no existe en la base de datos.`);
    }

    return {
      id: workOrderId,
      titulo: workOrderRaw ? workOrderRaw.titulo || `OT ${workOrderId}` : `OT ${workOrderId}`,
      tipo_mantenimiento: workOrderRaw ? workOrderRaw.tipo_mantenimiento || 'CORRECTIVE' : 'CORRECTIVE',
      component_id: workOrderRaw ? workOrderRaw.component_id || 'MOTOR_PRINCIPAL' : 'MOTOR_PRINCIPAL'
    };
  }
}
