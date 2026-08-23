// supabase/functions/agents-orchestrator/modules/m013/resolvers/m013-asset-resolver.ts
// Asset Resolver enforcing zero cross-asset violation (v1.0)
// Frozen under Token: M013-ASSET-IDENTITY-001

export class M013AssetResolver {
  public static resolve(targetAssetId: string | undefined, workOrderRaw?: any, m012Package?: any): string {
    const rawAsset = workOrderRaw ? (workOrderRaw.maquina_id || workOrderRaw.codigo_maquina) : null;
    const m012Asset = m012Package ? m012Package.asset_id : null;

    const authoritativeAsset = rawAsset || m012Asset || targetAssetId;

    if (!authoritativeAsset) {
      throw new Error('[M013_ASSET_ERROR] No se pudo resolver la identidad del activo.');
    }

    if (targetAssetId && authoritativeAsset && targetAssetId !== authoritativeAsset) {
      throw new Error(`[M013_CROSS_ASSET_VIOLATION] Discrepancia de máquina: ${targetAssetId} vs ${authoritativeAsset}.`);
    }

    return authoritativeAsset;
  }
}
