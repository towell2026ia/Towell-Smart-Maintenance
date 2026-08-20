// supabase/functions/agents-orchestrator/agents/ag007/classifiers/cost-domain-classifier.ts
// Cost Domain Classifier for AG-007 (v1.0)
// Frozen under Token: AG007-DETERMINISTIC-ENGINE-001
// Invariant: Deterministic classification without LLM (§13-23 PRD)

import type { CostOrigin, MaintenanceType } from '../types/ag007.types.ts';

export function classifyCostDomain(
  sourceTable: string,
  rawPayload: Record<string, any>
): { cost_domain: CostOrigin; maintenance_type: MaintenanceType } {
  const table = (sourceTable || '').toLowerCase().trim();

  // 1. Domain: PART (Refacciones)
  if (table.includes('refacciones') || table.includes('parts') || rawPayload.codigo_articulo || rawPayload.refacciones_usadas) {
    let mType: MaintenanceType = 'CORRECTIVO';
    const tipo = String(rawPayload.tipo_orden || rawPayload.tipo_mantenimiento || '').toUpperCase();
    if (tipo.includes('PREV')) mType = 'PREVENTIVO';
    else if (tipo.includes('AUTO')) mType = 'AUTONOMO';
    else if (tipo.includes('PRED')) mType = 'PREDICTIVO';

    return {
      cost_domain: 'PART',
      maintenance_type: mType
    };
  }

  // 2. Domain: LABOR (Mano de Obra)
  if (table.includes('bitacora') || rawPayload.cve_tecnico || rawPayload.tiempo_atencion_min) {
    let mType: MaintenanceType = 'CORRECTIVO';
    const tipo = String(rawPayload.tipo_orden || rawPayload.tipo_mantenimiento || '').toUpperCase();
    if (tipo.includes('PREV')) mType = 'PREVENTIVO';
    else if (tipo.includes('AUTO')) mType = 'AUTONOMO';
    else if (tipo.includes('PRED')) mType = 'PREDICTIVO';

    return {
      cost_domain: 'LABOR',
      maintenance_type: mType
    };
  }

  // 3. Domain: DOWNTIME (Paros de Máquina)
  if (table.includes('paros') || table.includes('telegram') || rawPayload.falla || (rawPayload.hora && rawPayload.hora_fin)) {
    return {
      cost_domain: 'DOWNTIME',
      maintenance_type: 'CORRECTIVO'
    };
  }

  // 4. Domain: SERVICE (Servicios Externos)
  if (table.includes('servicio') || table.includes('tercero') || rawPayload.proveedor_servicio) {
    return {
      cost_domain: 'SERVICE',
      maintenance_type: 'GENERAL'
    };
  }

  return {
    cost_domain: 'OTHER',
    maintenance_type: 'GENERAL'
  };
}
