// supabase/functions/agents-orchestrator/modules/m012/guards/m012-source-mutation-guard.ts
// Source Mutation Guard for M-012 (v1.0)
// Frozen under Token: M012-DATA-MAP-001
// Invariant: business_source_mutation = 0, new_M012_tables = 0 (§98-103 PRD-M-012.2)

export class M012SourceMutationGuard {
  public static assertNoMutations(initialFingerprint: string, finalFingerprint: string): void {
    if (initialFingerprint !== finalFingerprint) {
      throw new Error('[M012_SOURCE_MUTATION_VIOLATION] Se detectó una mutación no autorizada en los registros de negocio.');
    }
  }

  public static generateSnapshotFingerprint(data: any): string {
    return JSON.stringify(data);
  }
}
