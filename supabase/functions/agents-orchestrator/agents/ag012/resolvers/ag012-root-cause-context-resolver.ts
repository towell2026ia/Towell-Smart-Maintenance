// supabase/functions/agents-orchestrator/agents/ag012/resolvers/ag012-root-cause-context-resolver.ts
// Root Cause Resolver consuming AG-010 confirmed causes (v1.0)
// Frozen under Token: AG012-RCA-RULES-001

export class AG012RootCauseContextResolver {
  public static resolve(ag010Context?: any): {
    has_confirmed_root_cause: boolean;
    root_cause_description?: string;
    is_hypothesis_only: boolean;
  } {
    if (!ag010Context) {
      return {
        has_confirmed_root_cause: false,
        is_hypothesis_only: false
      };
    }

    const isConfirmed = ag010Context.status === 'HUMAN_CONFIRMED' || ag010Context.human_confirmed === true;
    const isHypothesis = ag010Context.status === 'HYPOTHESIS' || ag010Context.is_hypothesis === true;

    return {
      has_confirmed_root_cause: isConfirmed,
      root_cause_description: ag010Context.root_cause || ag010Context.description,
      is_hypothesis_only: isHypothesis && !isConfirmed
    };
  }
}
