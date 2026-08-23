// supabase/functions/agents-orchestrator/modules/m013/guards/m013-source-mutation-guard.ts
// Guard enforcing zero mutation on upstream database sources (v1.0)
// Frozen under Token: M013-DATA-MAP-001

export class M013SourceMutationGuard {
  public static assertZeroMutation(operation: string): void {
    const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER'];
    if (forbidden.includes(operation.toUpperCase())) {
      throw new Error(`[M013_MUTATION_VIOLATION] Operación ${operation} prohibida: M-013 es de solo lectura.`);
    }
  }
}
