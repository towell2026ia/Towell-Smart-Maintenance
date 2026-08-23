// supabase/functions/agents-orchestrator/agents/ag012/guards/ag012-source-mutation-guard.ts
// Source Mutation Guard ensuring 100% read-only operations (v1.0)
// Frozen under Token: AG012-DATA-MAP-001

export class AG012SourceMutationGuard {
  public static assertReadOnlyQuery(sqlQuery: string): void {
    const forbiddenKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE'];
    const upper = sqlQuery.toUpperCase();
    for (const kw of forbiddenKeywords) {
      if (upper.includes(kw)) {
        throw new Error(`[AG012_MUTATION_VIOLATION] Operación de mutación prohibida: ${kw}`);
      }
    }
  }
}
