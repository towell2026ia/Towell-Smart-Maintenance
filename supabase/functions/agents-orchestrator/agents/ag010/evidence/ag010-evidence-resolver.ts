// supabase/functions/agents-orchestrator/agents/ag010/evidence/ag010-evidence-resolver.ts
// Deterministic Evidence Resolver for AG-010 (v1.0)
// Frozen under Token: AG010-EVIDENCE-RESOLVER-RULES-001
// Invariant: Classifies certified facts, operator statements, and technician notes (§36-49 PRD-AG-010.2)

import type { AG010EvidenceItem, ScoreSourceReference } from '../types/ag010.types.ts';
import type { M010AdaptedContext } from '../adapters/m010-context-adapter.ts';
import { AG010EvaluationTimeGuard } from '../guards/ag010-evaluation-time-guard.ts';

export class AG010EvidenceResolver {
  public static resolveAllEvidence(
    context: M010AdaptedContext,
    evaluationAt: string
  ): {
    certifiedFacts: AG010EvidenceItem[];
    operatorStatements: AG010EvidenceItem[];
    technicianStatements: AG010EvidenceItem[];
    derivedSignals: AG010EvidenceItem[];
  } {
    const certifiedFacts: AG010EvidenceItem[] = [];
    const operatorStatements: AG010EvidenceItem[] = [];
    const technicianStatements: AG010EvidenceItem[] = [];
    const derivedSignals: AG010EvidenceItem[] = [];

    const assetId = context.asset_id;

    // 1. Work Orders (CERTIFIED_FACT)
    const validOTs = AG010EvaluationTimeGuard.filterHistoricalItems(context.work_orders, evaluationAt);
    for (const ot of validOTs) {
      const otDate = ot.fecha_creacion || ot.occurred_at || evaluationAt;
      const sourceRef: ScoreSourceReference = {
        source_name: 'ordenes_trabajo',
        source_table: 'public.ordenes_trabajo',
        source_id: ot.id_ot || ot.id || 'OT-UNKNOWN',
        retrieved_at: evaluationAt,
        relationship_type: 'DIRECT_FK'
      };

      if (ot.falla_descripcion || ot.descripcion) {
        certifiedFacts.push({
          evidence_id: `EV-OT-FAIL-${sourceRef.source_id}`,
          evidence_type: 'WORK_ORDER',
          evidence_class: 'CERTIFIED_FACT',
          asset_id: assetId,
          occurred_at: otDate,
          fact: `Intervención registrada en OT #${sourceRef.source_id}: ${ot.falla_descripcion || ot.descripcion}`,
          source_reference: sourceRef,
          quality: 'CERTIFIED'
        });
      }

      if (ot.solucion_aplicada || ot.solucion) {
        certifiedFacts.push({
          evidence_id: `EV-OT-SOL-${sourceRef.source_id}`,
          evidence_type: 'WORK_ORDER',
          evidence_class: 'CERTIFIED_FACT',
          asset_id: assetId,
          occurred_at: otDate,
          fact: `Acción correctiva documentada: ${ot.solucion_aplicada || ot.solucion}`,
          source_reference: sourceRef,
          quality: 'CERTIFIED'
        });
      }
    }

    // 2. Physical Findings (CERTIFIED_FACT)
    const validFindings = AG010EvaluationTimeGuard.filterHistoricalItems(context.findings, evaluationAt);
    for (const f of validFindings) {
      const fDate = f.fecha || f.occurred_at || evaluationAt;
      const sourceRef: ScoreSourceReference = {
        source_name: 'hallazgos',
        source_table: 'public.respuestas_checklist_autonomo',
        source_id: f.id_hallazgo || f.id || 'FIND-UNKNOWN',
        retrieved_at: evaluationAt,
        relationship_type: 'DIRECT_FK'
      };

      certifiedFacts.push({
        evidence_id: `EV-FIND-${sourceRef.source_id}`,
        evidence_type: 'PHYSICAL_FINDING',
        evidence_class: 'CERTIFIED_FACT',
        asset_id: assetId,
        occurred_at: fDate,
        fact: `Condición física reportada en inspección: ${f.descripcion || f.hallazgo || 'Anomalía'} (Severidad: ${f.severidad || 'MEDIA'})`,
        source_reference: sourceRef,
        quality: 'CERTIFIED'
      });
    }

    // 3. Telegram Logs / Operator Voice (OPERATOR_STATEMENT)
    const validFailures = AG010EvaluationTimeGuard.filterHistoricalItems(context.failures, evaluationAt);
    for (const fail of validFailures) {
      const failDate = fail.fecha || fail.occurred_at || evaluationAt;
      const sourceRef: ScoreSourceReference = {
        source_name: 'stg_telegram',
        source_table: 'public.stg_telegram',
        source_id: fail.id_telegram || fail.id || 'MSG-UNKNOWN',
        retrieved_at: evaluationAt,
        relationship_type: 'STAGE_LOG'
      };

      operatorStatements.push({
        evidence_id: `EV-OP-STMT-${sourceRef.source_id}`,
        evidence_type: 'BITACORA',
        evidence_class: 'OPERATOR_STATEMENT',
        asset_id: assetId,
        occurred_at: failDate,
        fact: `Declaración de operador en bitácora: "${fail.mensaje_original || fail.descripcion || 'Sin mensaje'}"`,
        source_reference: sourceRef,
        quality: 'UNVERIFIED'
      });
    }

    // 4. Parts Actually Used (CERTIFIED_FACT)
    const validParts = AG010EvaluationTimeGuard.filterHistoricalItems(context.parts, evaluationAt);
    for (const p of validParts) {
      const pDate = p.fecha || p.occurred_at || evaluationAt;
      const sourceRef: ScoreSourceReference = {
        source_name: 'refacciones_utilizadas',
        source_table: 'public.refacciones_utilizadas',
        source_id: p.id_refaccion || p.id || 'PART-UNKNOWN',
        retrieved_at: evaluationAt,
        relationship_type: 'DIRECT_FK'
      };

      certifiedFacts.push({
        evidence_id: `EV-PART-${sourceRef.source_id}`,
        evidence_type: 'PART_CONSUMPTION',
        evidence_class: 'CERTIFIED_FACT',
        asset_id: assetId,
        occurred_at: pDate,
        fact: `Refacción consumida: ${p.nombre_refaccion || p.descripcion || 'Pieza'} (Cantidad: ${p.cantidad || 1})`,
        source_reference: sourceRef,
        quality: 'CERTIFIED'
      });
    }

    return {
      certifiedFacts,
      operatorStatements,
      technicianStatements,
      derivedSignals
    };
  }
}
