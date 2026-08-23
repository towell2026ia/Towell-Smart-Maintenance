// supabase/functions/agents-orchestrator/agents/ag012/quality/ag012-data-sufficiency-engine.ts
// Data Sufficiency Engine enforcing non-forced recommendations (v1.0)
// Frozen under Token: AG012-DATA-SUFFICIENCY-ENGINE-001

import type { DataQualitySummary } from '../types/ag012.types.ts';

export class AG012DataSufficiencyEngine {
  public static canProceedToDecision(quality: DataQualitySummary): {
    can_proceed: boolean;
    reason?: string;
  } {
    if (quality.sufficiency_level === 'INSUFFICIENT' || quality.data_sufficiency_index < 50) {
      return {
        can_proceed: false,
        reason: `Índice de suficiencia (${quality.data_sufficiency_index}%) por debajo del mínimo (50%) o faltan datos indispensables (${quality.missing_critical_fields.join(', ')}).`
      };
    }

    return { can_proceed: true };
  }
}
