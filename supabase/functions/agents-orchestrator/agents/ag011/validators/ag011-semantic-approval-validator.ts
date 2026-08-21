// supabase/functions/agents-orchestrator/agents/ag011/validators/ag011-semantic-approval-validator.ts
// Semantic Approval Validator for AG-011 (v1.0)
// Frozen under Token: AG011-SEMANTIC-RULES-001
// Invariant: AI_approved_memories = 0 (§53, 93-94 PRD-AG-011.3)

import type { AG011SemanticOutput } from '../contracts/ag011-semantic-output.contract.ts';

export class AG011SemanticApprovalValidator {
  public static validateNoApproval(semanticOutput: AG011SemanticOutput): void {
    // 1. Reusable lessons must NOT be in APPROVED status
    for (const lesson of semanticOutput.reusable_lessons || []) {
      if ((lesson.status as any) === 'APPROVED') {
        throw new Error(`[AG011_AI_APPROVAL_ATTEMPT] Lección '${lesson.lesson_id}' no puede crearse como APPROVED por la capa semántica.`);
      }
    }

    // 2. Technical summary must not declare new approved standards
    const summaryLower = (semanticOutput.technical_summary || '').toLowerCase();
    if (summaryLower.includes('queda formalmente aprobada') || summaryLower.includes('se aprueba como nueva memoria')) {
      throw new Error('[AG011_AI_APPROVAL_ATTEMPT] La síntesis semántica intentó auto-aprobar una memoria técnica.');
    }
  }
}
