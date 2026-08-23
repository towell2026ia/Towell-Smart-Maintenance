// supabase/functions/agents-orchestrator/agents/ag013/interventions/ag013-intervention-effectiveness-engine.ts
// Intervention Ineffectiveness Engine for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

export interface InterventionEffectivenessEvaluation {
  ineffectiveness_score: number;
  repeated_unsuccessful_count: number;
  drivers: string[];
}

export class AG013InterventionEffectivenessEngine {
  public static evaluate(
    reincidence30dCount: number,
    repeatedUnsuccessfulCount: number = 0
  ): InterventionEffectivenessEvaluation {
    const drivers: string[] = [];

    const totalRepeat = reincidence30dCount + repeatedUnsuccessfulCount;
    const score = Math.min(100, totalRepeat * 30);

    if (totalRepeat >= 2) {
      drivers.push(`Ineficacia reiterada de reparaciones previas (${totalRepeat} eventos repetitivos post-cierre)`);
    }

    return {
      ineffectiveness_score: Number(score.toFixed(2)),
      repeated_unsuccessful_count: totalRepeat,
      drivers
    };
  }
}
