// supabase/functions/agents-orchestrator/agents/ag011/approval/ag011-memory-approval-guard.ts
// Human Approval Governance Guard for AG-011 (v1.0)
// Frozen under Token: AG011-APPROVAL-GUARD-001
// Invariant: AI_approved_memories = 0 (§89-95 PRD-AG-011.2)

import type { AG011MemoryApproval } from '../types/ag011.types.ts';

const AUTHORIZED_ROLES = new Set(['SUPER_ADMIN', 'JEFE_MANTENIMIENTO', 'INGENIERO_CONFIABILIDAD']);

export class AG011MemoryApprovalGuard {
  public static validateApprovalEvent(params: {
    reviewer_email: string;
    reviewer_role: string;
    decision: 'APPROVED' | 'REJECTED' | 'REVISE';
    notes: string;
    evidence_snapshot_sha256: string;
    is_ai_agent?: boolean;
  }): AG011MemoryApproval {
    if (params.is_ai_agent) {
      throw new Error('[AG011_AI_APPROVAL_FORBIDDEN] Los agentes de IA tienen estrictamente prohibido aprobar memorias técnicas.');
    }

    if (!params.reviewer_email || !params.reviewer_email.includes('@')) {
      throw new Error('[AG011ApprovalGuard] Email del revisor inválido.');
    }

    if (!params.reviewer_role || !AUTHORIZED_ROLES.has(params.reviewer_role.toUpperCase())) {
      throw new Error(`[AG011_UNAUTHORIZED_REVIEWER_ROLE] El rol '${params.reviewer_role}' no cuenta con permisos para aprobar memorias.`);
    }

    if (!params.evidence_snapshot_sha256 || params.evidence_snapshot_sha256.length !== 64) {
      throw new Error('[AG011ApprovalGuard] Se requiere el hash SHA-256 de la evidencia evaluada.');
    }

    return {
      reviewer_email: params.reviewer_email,
      reviewer_role: params.reviewer_role.toUpperCase(),
      decision: params.decision,
      reviewed_at: new Date().toISOString(),
      approval_notes: params.notes || 'Aprobación formal registrada.',
      evidence_snapshot_sha256: params.evidence_snapshot_sha256
    };
  }
}
