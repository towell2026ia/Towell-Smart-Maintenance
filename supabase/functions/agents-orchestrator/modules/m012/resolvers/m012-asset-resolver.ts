// supabase/functions/agents-orchestrator/modules/m012/resolvers/m012-asset-resolver.ts
// Asset Resolver for M-012 (v1.0)
// Frozen under Token: M012-ASSET-RESOLVER-001
// Invariant: wrong_asset_preparation = 0, cross_asset_leakage = 0 (§13-15 PRD-M-012.2)

export interface ResolvedAsset {
  asset_id: string;
  machine_model?: string | null;
  machine_family?: string | null;
  department?: string | null;
  criticality?: string | null;
}

export class M012AssetResolver {
  public static resolve(assetId: string, rawAsset?: any, otAssetId?: string): ResolvedAsset {
    if (!assetId) {
      throw new Error('[M012_ASSET_ERROR] asset_id es obligatorio.');
    }

    if (otAssetId && otAssetId !== assetId) {
      throw new Error(`[M012_CROSS_ASSET_VIOLATION] Discrepancia de activo: OT pertenece a '${otAssetId}', pero se intentó preparar para '${assetId}'.`);
    }

    const machineModel = rawAsset?.modelo || rawAsset?.machine_model || 'TSUDAKOMA ZAX9100';
    const machineFamily = rawAsset?.familia || rawAsset?.machine_family || 'TELAR DE AIRE';
    const department = rawAsset?.area || rawAsset?.departamento || rawAsset?.department || 'PF';
    const criticality = rawAsset?.criticidad || 'A';

    return {
      asset_id: assetId,
      machine_model: machineModel,
      machine_family: machineFamily,
      department,
      criticality
    };
  }
}
