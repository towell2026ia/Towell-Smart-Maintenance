// supabase/functions/agents-orchestrator/agents/ag010/adapters/m010-context-adapter.ts
// Adapter for M-010 Asset 360 Context Consumption (v1.0)
// Frozen under Token: AG010-DATA-MAP-001
// Invariant: Pure read-only consumption of certified M-010 context (§28-30 PRD-AG-010.2)

import type { M010AssetContextResponse } from '../../../modules/m010/contracts/m010-context-payload.contract.ts';

export interface M010AdaptedContext {
  asset_id: string;
  nombre?: string;
  depto?: string;
  tipo?: string;
  criticidad?: string;
  work_orders: any[];
  subtasks: any[];
  findings: any[];
  failures: any[];
  parts: any[];
  downtime: any[];
  timeline: any[];
  source_references: any[];
}

export class M010ContextAdapter {
  public static adapt(contextResponse: M010AssetContextResponse | any): M010AdaptedContext {
    const rawContext = contextResponse?.context || contextResponse;
    const identity = rawContext?.identity || {};

    return {
      asset_id: rawContext?.asset_id || identity?.id_maquina || 'UNKNOWN_ASSET',
      nombre: identity?.nombre || rawContext?.asset_name,
      depto: identity?.depto || identity?.departamento,
      tipo: identity?.tipo || identity?.tipo_maquina,
      criticidad: identity?.criticidad,
      work_orders: rawContext?.work_orders || rawContext?.ordenes_trabajo || [],
      subtasks: rawContext?.subtasks || rawContext?.orden_subtareas || [],
      findings: rawContext?.findings || rawContext?.hallazgos || [],
      failures: rawContext?.failures || rawContext?.fallas || [],
      parts: rawContext?.parts || rawContext?.refacciones || [],
      downtime: rawContext?.downtime || rawContext?.paros || [],
      timeline: rawContext?.timeline || [],
      source_references: rawContext?.source_references || []
    };
  }
}
