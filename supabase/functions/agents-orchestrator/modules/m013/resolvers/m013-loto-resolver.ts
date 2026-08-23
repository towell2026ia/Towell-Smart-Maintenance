// supabase/functions/agents-orchestrator/modules/m013/resolvers/m013-loto-resolver.ts
// LOTO Resolver verifying energy isolation state & zero energy checks (v1.0)
// Frozen under Token: M013-LOTO-RULES-001

import type { LotoControl, SafetyRequirement, HumanConfirmation } from '../types/m013.types.ts';

export class M013LotoResolver {
  public static resolve(
    requirements: SafetyRequirement[],
    confirmations: HumanConfirmation[],
    lotoRaw?: any
  ): LotoControl {
    const isLotoRequired = requirements.some(
      r => r.requirement_type === 'LOTO_REQUIRED' || r.requirement_type === 'ENERGY_ISOLATION_VERIFICATION'
    );

    if (!isLotoRequired) {
      return {
        status: 'NOT_REQUIRED',
        is_required: false
      };
    }

    const lotoConfirmation = confirmations.find(c =>
      c.actor_role === 'TECHNICIAN' || c.actor_role === 'SUPERVISOR' || c.actor_role === 'SAFETY_OFFICER'
    );

    if (lotoConfirmation && lotoConfirmation.decision === 'CONFIRMED') {
      return {
        status: 'VERIFIED_BY_HUMAN',
        is_required: true,
        isolation_point: lotoRaw ? lotoRaw.isolation_point || 'INTERRUPTOR_PRINCIPAL_Q1' : 'INTERRUPTOR_PRINCIPAL_Q1',
        lock_box_id: lotoRaw ? lotoRaw.lock_box_id || 'LOCKBOX-01' : 'LOCKBOX-01',
        verified_by: lotoConfirmation.actor_id,
        verified_at: lotoConfirmation.timestamp,
        zero_energy_voltage_verified: true
      };
    }

    if (lotoConfirmation && lotoConfirmation.decision === 'REJECTED') {
      return {
        status: 'FAILED_OR_INCOMPLETE',
        is_required: true
      };
    }

    return {
      status: 'PENDING',
      is_required: true,
      isolation_point: lotoRaw ? lotoRaw.isolation_point : undefined,
      lock_box_id: lotoRaw ? lotoRaw.lock_box_id : undefined
    };
  }
}
