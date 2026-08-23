// supabase/functions/agents-orchestrator/modules/m013/resolvers/m013-permit-resolver.ts
// Permit Resolver verifying work permits & temporal validity (v1.0)
// Frozen under Token: M013-PERMIT-RULES-001

import type { PermitControl, SafetyRequirement } from '../types/m013.types.ts';
import { M013TemporalGuard } from '../guards/m013-temporal-guard.ts';

export class M013PermitResolver {
  public static resolve(
    requirements: SafetyRequirement[],
    permitsRaw: any[] = [],
    evaluationAt: string = new Date().toISOString()
  ): PermitControl {
    const isPermitRequired = requirements.some(r => r.requirement_type === 'PERMIT_REQUIRED');

    if (!isPermitRequired) {
      return {
        status: 'NOT_REQUIRED',
        is_required: false
      };
    }

    if (!permitsRaw || permitsRaw.length === 0) {
      return {
        status: 'PENDING',
        is_required: true
      };
    }

    const permit = permitsRaw[0];
    const isExpired = M013TemporalGuard.isPermitExpired(permit.valid_to, evaluationAt);

    if (isExpired) {
      return {
        permit_id: permit.id,
        permit_type: permit.type || 'HOT_WORK',
        status: 'EXPIRED',
        is_required: true,
        valid_from: permit.valid_from,
        valid_to: permit.valid_to
      };
    }

    if (permit.status === 'REJECTED') {
      return {
        permit_id: permit.id,
        status: 'REJECTED',
        is_required: true
      };
    }

    if (permit.status === 'APPROVED' || permit.status === 'APPROVED_BY_HUMAN') {
      return {
        permit_id: permit.id,
        permit_type: permit.type || 'HOT_WORK',
        status: 'APPROVED_BY_HUMAN',
        is_required: true,
        approved_by: permit.approved_by || 'SUPERVISOR_SEGURIDAD',
        approved_at: permit.approved_at || evaluationAt,
        valid_from: permit.valid_from,
        valid_to: permit.valid_to
      };
    }

    return {
      permit_id: permit.id,
      status: 'PENDING',
      is_required: true
    };
  }
}
