// supabase/functions/agents-orchestrator/agents/ag013/exposure/ag013-operational-exposure-resolver.ts
// Operational Exposure Resolver for AG-013 (v1.0)
// Frozen under Token: AG013-BAD-ACTOR-ENGINE-001

export class AG013OperationalExposureResolver {
  public static resolve(operatingHours?: number | null): {
    operating_hours: number | null;
    has_exposure_denominator: boolean;
    exposure_factor: number;
  } {
    if (typeof operatingHours !== 'number' || operatingHours <= 0) {
      return {
        operating_hours: null,
        has_exposure_denominator: false,
        exposure_factor: 1.0
      };
    }

    // Baseline: 2000 hours per standard 180d period
    const baselineHours = 2000;
    const factor = Math.max(0.5, Math.min(2.0, operatingHours / baselineHours));

    return {
      operating_hours: operatingHours,
      has_exposure_denominator: true,
      exposure_factor: Number(factor.toFixed(2))
    };
  }
}
