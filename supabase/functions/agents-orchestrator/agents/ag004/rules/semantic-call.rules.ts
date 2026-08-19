// supabase/functions/agents-orchestrator/agents/ag004/rules/semantic-call.rules.ts
// Manifest: AG004-SEMANTIC-CALL-RULES-001 (Fast Path & Semantic Call Eligibility Rules)

import { AutonomousSemanticInputPayload } from '../contracts/semantic-input.contract.ts';

export const SEMANTIC_CALL_RULES_VERSION = 'AG004-SEMANTIC-CALL-RULES-001';

export interface SemanticCallEligibilityResult {
  shouldCallMiMo: boolean;
  reason: string;
  fastPathReason?: 'NO_HISTORICAL_FINDINGS' | 'SEMANTIC_LAYER_DISABLED' | 'NO_AUTONOMOUS_HISTORY';
}

export function evaluateSemanticCallEligibility(
  input: AutonomousSemanticInputPayload,
  isMimoEnabled: boolean = true
): SemanticCallEligibilityResult {
  if (!isMimoEnabled) {
    return {
      shouldCallMiMo: false,
      reason: 'Capa semántica deshabilitada por configuración (MIMO_ENABLED=false).',
      fastPathReason: 'SEMANTIC_LAYER_DISABLED'
    };
  }

  const hist = input.historical_context;

  // Case: No historical records at all -> Fast Path
  if (hist.data_quality_status === 'NO_HISTORY' && hist.completed_autonomous_count === 0 && hist.recent_findings.length === 0) {
    return {
      shouldCallMiMo: false,
      reason: 'Activo sin historial previo. Se genera contexto determinístico estándar vía Fast Path.',
      fastPathReason: 'NO_AUTONOMOUS_HISTORY'
    };
  }

  // Case: Has previous findings or recent correctives or pending compliance issues -> Call MiMo
  if (hist.recent_findings.length > 0 || hist.recent_correctives.length > 0 || hist.pending_autonomous_count > 0 || hist.data_quality_status === 'PARTIAL') {
    return {
      shouldCallMiMo: true,
      reason: `Activo con contexto histórico relevante (${hist.recent_findings.length} hallazgos previos, ${hist.recent_correctives.length} correctivos, estatus de calidad: ${hist.data_quality_status}).`
    };
  }

  // Clean normal history with 0 findings -> Fast path
  return {
    shouldCallMiMo: false,
    reason: 'Historial limpio y conforme sin hallazgos previos. Se emite contexto determinístico estándar vía Fast Path.',
    fastPathReason: 'NO_HISTORICAL_FINDINGS'
  };
}
