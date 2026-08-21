// supabase/functions/agents-orchestrator/agents/ag010/cases/ag010-previous-case-builder.ts
// Deterministic Previous Case Constructor for AG-010 (v1.0)
// Frozen under Token: AG010-PREVIOUS-CASE-BUILDER-001
// Invariant: Constructed solely from verified historical records; no fabricated cases (§53-64 PRD-AG-010.2)

import type { PreviousCase, AG010EvidenceItem, ScoreSourceReference } from '../types/ag010.types.ts';
import type { M010AdaptedContext } from '../adapters/m010-context-adapter.ts';
import { AG010EvaluationTimeGuard } from '../guards/ag010-evaluation-time-guard.ts';

export class AG010PreviousCaseBuilder {
  public static buildPreviousCasesFromContext(
    context: M010AdaptedContext,
    evaluationAt: string
  ): PreviousCase[] {
    const previousCases: PreviousCase[] = [];
    const validOTs = AG010EvaluationTimeGuard.filterHistoricalItems(context.work_orders, evaluationAt);

    for (const ot of validOTs) {
      const otId = ot.id_ot || ot.id || 'OT-PREV';
      const occurredAt = ot.fecha_creacion || ot.occurred_at || evaluationAt;
      const closedAt = ot.fecha_cierre || ot.closed_at || null;

      const failureTitle = ot.falla_descripcion || ot.descripcion || ot.titulo || 'Mantenimiento Correctivo Previo';
      const solution = ot.solucion_aplicada || ot.solucion || 'Intervención técnica general';

      let outcome: any = 'RESOLVED';
      if (ot.estatus === 'ABIERTA' || ot.estatus === 'PENDIENTE') {
        outcome = 'REOPENED';
      } else if (ot.reincidente === true) {
        outcome = 'RECURRED';
      }

      const sourceRef: ScoreSourceReference = {
        source_name: 'ordenes_trabajo',
        source_table: 'public.ordenes_trabajo',
        source_id: otId,
        retrieved_at: evaluationAt,
        relationship_type: 'DIRECT_FK'
      };

      const evItem: AG010EvidenceItem = {
        evidence_id: `EV-CASE-OT-${otId}`,
        evidence_type: 'WORK_ORDER',
        evidence_class: 'CERTIFIED_FACT',
        asset_id: context.asset_id,
        occurred_at: occurredAt,
        fact: `Caso registrado en OT #${otId}: ${failureTitle} -> ${solution}`,
        source_reference: sourceRef,
        quality: 'CERTIFIED'
      };

      previousCases.push({
        previous_case_id: `CASE-HIST-${otId}`,
        asset_id: context.asset_id,
        asset_name: context.nombre || null,
        depto: context.depto || null,
        failure_title: failureTitle,
        occurred_at: occurredAt,
        closed_at: closedAt,
        outcome: outcome,
        interventions_summary: solution,
        reported_root_cause: ot.causa_raiz || null,
        root_cause_status: ot.causa_raiz ? 'SUPPORTED_HYPOTHESIS' : 'NOT_ANALYZED',
        parts_used: ot.refacciones || [],
        evidence_items: [evItem],
        source_references: [sourceRef]
      });
    }

    return previousCases;
  }
}
