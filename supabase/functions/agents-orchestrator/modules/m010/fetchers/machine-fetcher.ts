// supabase/functions/agents-orchestrator/modules/m010/fetchers/machine-fetcher.ts
// Machine Master Data Fetcher for M-010 (v1.0)
// Frozen under Token: M010-SOURCE-FETCH-RULES-001

import { assertReadOnlyOperation } from '../guards/m010-readonly-guard.ts';
import { resolveAssetIdentity } from '../core/asset-resolver.ts';
import type { RawMachineRecord } from '../contracts/m010-asset-identity.contract.ts';
import type { AssetIdentity } from '../types/m010.types.ts';

export class MachineFetcher {
  private catalog: RawMachineRecord[];

  constructor(catalog: RawMachineRecord[]) {
    this.catalog = catalog;
  }

  public async fetchIdentity(assetId: string): Promise<AssetIdentity> {
    assertReadOnlyOperation('SELECT FROM cat_maquinas');
    return resolveAssetIdentity(assetId, this.catalog);
  }
}
