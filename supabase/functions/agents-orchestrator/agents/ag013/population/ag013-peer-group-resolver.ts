// supabase/functions/agents-orchestrator/agents/ag013/population/ag013-peer-group-resolver.ts
// Peer Group Resolver for AG-013 Analista de Malos Actores v1.0
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import type { AssetContextRaw } from '../types/ag013.types.ts';

export interface PeerGroupDefinition {
  peer_group_id: string;
  area: string;
  machine_family: string;
  criticality: string;
  description: string;
}

export class AG013PeerGroupResolver {
  public static resolve(asset: AssetContextRaw): PeerGroupDefinition {
    const area = asset.area || 'GENERAL';
    const family = asset.machine_family || 'STANDARD';
    const crit = asset.criticality || 'MEDIUM';
    const peer_group_id = `GRP_${area}_${family}_${crit}`.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

    return {
      peer_group_id,
      area,
      machine_family: family,
      criticality: crit,
      description: `Grupo de Pares: Área ${area} - Familia ${family} - Criticidad ${crit}`
    };
  }
}
