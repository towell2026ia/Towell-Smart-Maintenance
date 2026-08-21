// supabase/functions/agents-orchestrator/agents/ag010/quality/ag010-data-quality-engine.ts
// Deterministic Data Quality & Contradiction Resolver for AG-010 (v1.0)
// Frozen under Token: AG010-DATA-QUALITY-001
// Invariant: Preserves contradicting evidence; DATA QUALITY != ROOT CAUSE CONFIDENCE (§85-93 PRD-AG-010.2)

import type { AG010EvidenceItem, DataQualityState } from '../types/ag010.types.ts';

export interface DataQualityEvaluationResult {
  state: DataQualityState;
  data_gaps: string[];
  contradicting_evidence: AG010EvidenceItem[];
}

export class AG010DataQualityEngine {
  public static evaluateQuality(
    assetId: string,
    problemStatement: string,
    certifiedFacts: AG010EvidenceItem[],
    operatorStatements: AG010EvidenceItem[]
  ): DataQualityEvaluationResult {
    const gaps: string[] = [];
    const contradicting: AG010EvidenceItem[] = [];

    if (!problemStatement || problemStatement.length < 5) {
      gaps.push('Falta descripción detallada del problema o síntoma actual.');
    }

    if (certifiedFacts.length === 0) {
      gaps.push('No existen órdenes de trabajo ni hallazgos físicos verificados para este activo.');
    }

    // Check for conflicting evidence (e.g. operator reports electrical vs mechanical, or simultaneous contradicting solutions)
    const allFactsText = certifiedFacts.map(f => f.fact.toLowerCase()).join(' ');
    const allStmtsText = operatorStatements.map(s => s.fact.toLowerCase()).join(' ');

    if (allFactsText.includes('mecánico') && allStmtsText.includes('eléctrico')) {
      for (const stmt of operatorStatements) {
        if (stmt.fact.toLowerCase().includes('eléctrico')) {
          contradicting.push(stmt);
        }
      }
    }

    let state: DataQualityState = 'SUFFICIENT';

    if (contradicting.length > 0) {
      state = 'CONFLICTING';
    } else if (gaps.length >= 2 || !problemStatement) {
      state = 'INSUFFICIENT';
    } else if (gaps.length > 0) {
      state = 'PARTIAL';
    }

    return {
      state,
      data_gaps: gaps,
      contradicting_evidence: contradicting
    };
  }
}
