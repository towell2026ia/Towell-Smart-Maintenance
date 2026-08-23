// supabase/functions/agents-orchestrator/agents/ag013/population/ag013-asset-population-resolver.ts
// Asset Population Resolver for AG-013 Analista de Malos Actores v1.0
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

import type { BadActorSingleAssetInput, PopulationScope } from '../types/ag013.types.ts';

export interface PopulationFilterResult {
  eligible_assets: BadActorSingleAssetInput[];
  excluded_assets: Array<{ asset_id: string; reason: string }>;
}

export class AG013AssetPopulationResolver {
  public static resolve(
    assets: BadActorSingleAssetInput[],
    scope: PopulationScope,
    targetArea?: string | null,
    targetFamily?: string | null
  ): PopulationFilterResult {
    const eligible_assets: BadActorSingleAssetInput[] = [];
    const excluded_assets: Array<{ asset_id: string; reason: string }> = [];

    for (const item of assets) {
      const asset = item.asset_raw;
      if (!asset || !asset.id) {
        excluded_assets.push({ asset_id: 'UNKNOWN', reason: 'Falta información de identidad básica del activo' });
        continue;
      }

      if (asset.activo === false) {
        excluded_assets.push({ asset_id: asset.id, reason: 'Activo marcado como inactivo en catálogo maestro' });
        continue;
      }

      if (scope === 'AREA_SPECIFIC') {
        if (targetArea && asset.area !== targetArea) {
          excluded_assets.push({ asset_id: asset.id, reason: `Activo no pertenece al área objetivo (${asset.area} != ${targetArea})` });
          continue;
        }
      }

      if (scope === 'FAMILY_SPECIFIC') {
        if (targetFamily && asset.machine_family !== targetFamily) {
          excluded_assets.push({ asset_id: asset.id, reason: `Activo no pertenece a la familia objetivo (${asset.machine_family} != ${targetFamily})` });
          continue;
        }
      }

      eligible_assets.push(item);
    }

    return { eligible_assets, excluded_assets };
  }
}
