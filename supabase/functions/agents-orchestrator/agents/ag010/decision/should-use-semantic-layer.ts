// supabase/functions/agents-orchestrator/agents/ag010/decision/should-use-semantic-layer.ts
// Fast Path Decision Engine for AG-010 (v1.0)
// Frozen under Token: AG010-SEMANTIC-RULES-001
// Invariant: Bypasses LLM provider when evidence is insufficient (§78-82 PRD-AG-010.3)

import type { AG010EvidencePackage } from '../types/ag010.types.ts';
import type { AG010SemanticOutput } from '../contracts/ag010-semantic-output.contract.ts';

export interface SemanticDecisionResult {
  shouldCallProvider: boolean;
  reason: 'EVIDENCE_SUFFICIENT_FOR_MIMO' | 'FAST_PATH_INSUFFICIENT_DATA';
  fastPathOutput?: AG010SemanticOutput;
}

export class AG010SemanticDecisionEngine {
  public static evaluate(evidencePackage: AG010EvidencePackage): SemanticDecisionResult {
    const isInsufficient = evidencePackage.data_quality === 'INSUFFICIENT' && evidencePackage.certified_facts.length === 0;

    if (isInsufficient) {
      const fastPathOutput: AG010SemanticOutput = {
        problem_summary: `Evidencia insuficiente para iniciar análisis de Cinco Porqués en el activo ${evidencePackage.asset_id}.`,
        fact_summary: [],
        previous_case_interpretation: [],
        five_whys: [],
        root_cause_candidates: [
          {
            candidate_id: `RC-INSUFF-${evidencePackage.asset_id}`,
            statement: 'No es posible formular una hipótesis causal sólida debido a la ausencia de datos operativos o hallazgos físicos verificados.',
            status: 'INSUFFICIENT_EVIDENCE',
            supporting_evidence_ids: [],
            contradicting_evidence_ids: [],
            requires_human_validation: true
          }
        ],
        contradicting_evidence: [],
        data_gaps: [
          'Falta reporte técnico inicial de la falla.',
          'No existen mediciones físicas de vibración, temperatura o corriente.',
          'No se han registrado órdenes de trabajo previas en este activo.'
        ],
        recommended_verifications: [
          {
            action_type: 'INSPECT',
            target_component: 'Activo general',
            instruction: 'Realizar inspección visual directa en piso y registrar síntomas observados.',
            rationale: 'Recabar datos mínimos necesarios para diagnóstico.'
          }
        ],
        requires_human_validation: true
      };

      return {
        shouldCallProvider: false,
        reason: 'FAST_PATH_INSUFFICIENT_DATA',
        fastPathOutput
      };
    }

    return {
      shouldCallProvider: true,
      reason: 'EVIDENCE_SUFFICIENT_FOR_MIMO'
    };
  }
}
