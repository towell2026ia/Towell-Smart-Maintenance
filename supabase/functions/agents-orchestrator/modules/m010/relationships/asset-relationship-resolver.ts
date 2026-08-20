// supabase/functions/agents-orchestrator/modules/m010/relationships/asset-relationship-resolver.ts
// Relationship Resolver for M-010 (v1.0)
// Frozen under Token: M010-RELATIONSHIP-RULES-001
// Invariant: Direct FK vs Derived; zero fuzzy linkage based on text similarity (§56-64 PRD)

import type { AssetSourceReference } from '../types/m010.types.ts';

export function resolveRelationshipType(sourceName: string, targetTable: string): AssetSourceReference['relationship_type'] {
  if (targetTable.includes('cat_maquinas') || targetTable.includes('ordenes_trabajo') || targetTable.includes('refacciones_utilizadas')) {
    return 'DIRECT_FK';
  }
  if (sourceName.includes('AG-008') || sourceName.includes('AG-007') || sourceName.includes('alertas')) {
    return 'MACHINE_ID_LINK';
  }
  if (sourceName.includes('stg_telegram')) {
    return 'SOURCE_ID_LINK';
  }
  return 'DERIVED';
}
