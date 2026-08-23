// supabase/functions/agents-orchestrator/modules/m013/resolvers/m013-safety-evidence-resolver.ts
// Safety Evidence Resolver validating proofs, sources & timestamps (v1.0)
// Frozen under Token: M013-EVIDENCE-RULES-001

import type { SafetyEvidence, SafetyRequirement } from '../types/m013.types.ts';
import { M013TemporalGuard } from '../guards/m013-temporal-guard.ts';

export class M013SafetyEvidenceResolver {
  public static resolve(
    requirements: SafetyRequirement[],
    rawEvidenceList: any[] = [],
    humanConfirmations: any[] = [],
    evaluationAt: string = new Date().toISOString()
  ): SafetyEvidence[] {
    const evidenceList: SafetyEvidence[] = [];

    for (const req of requirements) {
      // 1. Buscar confirmación humana
      const conf = humanConfirmations.find(h => h.requirement_id === req.requirement_id || h.requirement_type === req.requirement_type);
      if (conf) {
        const isFuture = M013TemporalGuard.isEvidenceFuture(conf.timestamp, evaluationAt);
        if (!isFuture) {
          evidenceList.push({
            evidence_id: `EV-HUMAN-${conf.confirmation_id || req.requirement_id}`,
            requirement_id: req.requirement_id,
            evidence_type: 'HUMAN_CONFIRMATION',
            description: conf.evidence_notes || `Confirmación registrada por ${conf.actor_id} (${conf.actor_role})`,
            actor_id: conf.actor_id,
            actor_role: conf.actor_role,
            timestamp: conf.timestamp,
            is_valid: conf.decision === 'CONFIRMED',
            is_expired: false,
            source_reference: `Human Confirmation Record (${conf.confirmation_id || 'DIRECT'})`
          });
        }
      }

      // 2. Buscar evidencia documental directa
      const raw = rawEvidenceList.find(e => e.requirement_id === req.requirement_id);
      if (raw) {
        const isFuture = M013TemporalGuard.isEvidenceFuture(raw.timestamp || evaluationAt, evaluationAt);
        const isExpired = M013TemporalGuard.isPermitExpired(raw.valid_to, evaluationAt);
        if (!isFuture) {
          evidenceList.push({
            evidence_id: `EV-DOC-${raw.id || req.requirement_id}`,
            requirement_id: req.requirement_id,
            evidence_type: (raw.evidence_type || 'PERMIT_RECORD') as any,
            description: raw.description || 'Evidencia documental de seguridad',
            actor_id: raw.actor_id || null,
            actor_role: raw.actor_role || null,
            timestamp: raw.timestamp || evaluationAt,
            is_valid: !isExpired && (raw.is_valid !== false),
            is_expired: isExpired,
            source_reference: raw.source_reference || 'Safety Records Repository'
          });
        }
      }

      // 3. Si no hay evidencia encontrada para el requisito
      const hasAnyEvidence = evidenceList.some(e => e.requirement_id === req.requirement_id);
      if (!hasAnyEvidence) {
        evidenceList.push({
          evidence_id: `EV-MISSING-${req.requirement_id}`,
          requirement_id: req.requirement_id,
          evidence_type: 'MISSING_EVIDENCE',
          description: `Sin evidencia registrada para el requisito ${req.requirement_id}`,
          actor_id: null,
          actor_role: null,
          timestamp: evaluationAt,
          is_valid: false,
          is_expired: false,
          source_reference: 'System Evaluation Gap Detector'
        });
      }
    }

    return evidenceList;
  }
}
