// supabase/functions/agents-orchestrator/modules/m013/guards/m013-work-scope-guard.ts
// Guard enforcing zero technical work scope expansion by M-013 (v1.0)
// Frozen under Token: M013-SCOPE-GUARD-001

export class M013WorkScopeGuard {
  public static assertNoTechnicalScopeExpansion(originalScope: string[], evaluatedScope: string[]): void {
    if (evaluatedScope && originalScope) {
      if (evaluatedScope.length > originalScope.length) {
        throw new Error('[M013_SCOPE_VIOLATION] M-013 no puede ampliar el alcance técnico de la OT.');
      }
    }
  }
}
