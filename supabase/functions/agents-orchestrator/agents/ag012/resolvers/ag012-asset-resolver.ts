// supabase/functions/agents-orchestrator/agents/ag012/resolvers/ag012-asset-resolver.ts
// Asset Resolver verifying machine identity (v1.0)
// Frozen under Token: AG012-ASSET-IDENTITY-001

export class AG012AssetResolver {
  public static resolve(assetId: string, assetRaw?: any): { id: string; name: string; model?: string; year?: number } {
    if (!assetId || typeof assetId !== 'string') {
      throw new Error('[AG012_ASSET_NOT_FOUND] asset_id es obligatorio para evaluar la estrategia de activo.');
    }

    if (assetRaw === null) {
      throw new Error(`[AG012_ASSET_NOT_FOUND] Activo ${assetId} no existe en base de datos.`);
    }

    const resolvedId = assetId.trim();

    return {
      id: resolvedId,
      name: assetRaw ? assetRaw.nombre || assetRaw.codigo_maquina || resolvedId : resolvedId,
      model: assetRaw ? assetRaw.modelo : undefined,
      year: assetRaw ? assetRaw.anio_fabricacion : undefined
    };
  }
}
