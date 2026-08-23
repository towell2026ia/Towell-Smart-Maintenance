// supabase/functions/agents-orchestrator/agents/ag013/resolvers/ag013-asset360-resolver.ts
// M-010 Asset360 Read-Only Context Resolver for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import type { AssetContextRaw } from '../types/ag013.types.ts';

export class AG013Asset360Resolver {
  public static resolve(raw: AssetContextRaw): {
    asset_id: string;
    codigo_maquina: string;
    nombre: string;
    area: string;
    machine_family: string;
    criticality: 'HIGH' | 'MEDIUM' | 'LOW';
    operating_hours_window: number | null;
  } {
    return {
      asset_id: raw.id,
      codigo_maquina: raw.codigo_maquina || raw.id,
      nombre: raw.nombre || `Máquina ${raw.id}`,
      area: raw.area || 'GENERAL',
      machine_family: raw.machine_family || 'STANDARD',
      criticality: raw.criticality || 'MEDIUM',
      operating_hours_window: typeof raw.operating_hours_window === 'number' ? raw.operating_hours_window : null
    };
  }
}
