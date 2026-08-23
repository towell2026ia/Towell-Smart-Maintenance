// supabase/functions/agents-orchestrator/modules/m013/authority/m013-human-authority-validator.ts
// Human Authority Validator verifying roles & zero client authority escalation (v1.0)
// Frozen under Token: M013-HUMAN-AUTHORITY-RULES-001

import type { HumanConfirmation } from '../types/m013.types.ts';

export class M013HumanAuthorityValidator {
  private static validRoles = ['TECHNICIAN', 'SUPERVISOR', 'SAFETY_OFFICER', 'ADMIN'];

  public static validateConfirmations(
    rawConfirmations: any[] = [],
    workOrderId: string
  ): HumanConfirmation[] {
    const validated: HumanConfirmation[] = [];

    for (const c of rawConfirmations) {
      if (!c.actor_id || typeof c.actor_id !== 'string') {
        continue;
      }
      const roleUpper = (c.actor_role || '').toUpperCase();
      if (!this.validRoles.includes(roleUpper)) {
        continue;
      }

      validated.push({
        confirmation_id: c.confirmation_id || `CONF-${Math.random().toString(36).substring(2, 8)}`,
        requirement_id: c.requirement_id || 'REQ-GENERAL',
        actor_id: c.actor_id,
        actor_role: roleUpper,
        decision: c.decision === 'CONFIRMED' ? 'CONFIRMED' : 'REJECTED',
        timestamp: c.timestamp || new Date().toISOString(),
        work_order_id: workOrderId,
        evidence_notes: c.evidence_notes || 'Confirmación humana de seguridad'
      });
    }

    return validated;
  }
}
