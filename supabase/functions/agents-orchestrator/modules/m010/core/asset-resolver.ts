// supabase/functions/agents-orchestrator/modules/m010/core/asset-resolver.ts
// Asset Identity Resolver for M-010 (v1.0)
// Frozen under Token: M010-ASSET-RESOLVER-RULES-001
// Invariant: Stable identity anchored strictly in cat_maquinas; zero invented assets (§5-9 PRD)

import { buildAssetIdentity, type RawMachineRecord } from '../contracts/m010-asset-identity.contract.ts';
import type { AssetIdentity } from '../types/m010.types.ts';

export class AssetNotFoundError extends Error {
  constructor(assetId: string) {
    super(`[ASSET_NOT_FOUND] Asset '${assetId}' could not be resolved against official cat_maquinas.`);
    this.name = 'AssetNotFoundError';
  }
}

export function resolveAssetIdentity(
  assetId: string,
  catalog: RawMachineRecord[]
): AssetIdentity {
  if (!assetId || typeof assetId !== 'string' || assetId.trim().length === 0) {
    throw new AssetNotFoundError(assetId);
  }

  const query = assetId.trim().toUpperCase();
  const matched = catalog.find(m =>
    (m.codigo_maquina && m.codigo_maquina.trim().toUpperCase() === query) ||
    (m.id && m.id.trim().toUpperCase() === query) ||
    (m.nombre && m.nombre.trim().toUpperCase() === query)
  );

  if (!matched) {
    throw new AssetNotFoundError(assetId);
  }

  return buildAssetIdentity(matched);
}
