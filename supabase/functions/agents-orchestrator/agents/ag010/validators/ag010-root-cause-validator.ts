// supabase/functions/agents-orchestrator/agents/ag010/validators/ag010-root-cause-validator.ts
// Root Cause Authority & Status Validator for AG-010 MiMo Output (v1.0)
// Frozen under Token: AG010-SEMANTIC-RULES-001
// Invariant: AI cannot confirm root causes; CONFIRMED requires human authorization (§39-44, 89-90 PRD-AG-010.3)

import type { RootCauseCandidate } from '../types/ag010.types.ts';

export class AG010RootCauseValidationError extends Error {
  constructor(message: string) {
    super(`[AG010_ROOT_CAUSE_VALIDATION_ERROR] ${message}`);
    this.name = 'AG010RootCauseValidationError';
  }
}

export class AG010RootCauseValidator {
  public static validateAndSanitizeCandidates(candidates: RootCauseCandidate[]): RootCauseCandidate[] {
    const sanitized: RootCauseCandidate[] = [];

    for (const cand of candidates) {
      // If AI emitted CONFIRMED, block and downgrade to SUPPORTED_HYPOTHESIS with requires_human_validation = true
      let finalStatus = cand.status;
      if (cand.status === ('CONFIRMED' as any)) {
        console.warn(`[AG010RootCauseValidator] Downgrading AI-emitted 'CONFIRMED' to 'SUPPORTED_HYPOTHESIS' on candidate '${cand.candidate_id}'.`);
        finalStatus = 'SUPPORTED_HYPOTHESIS';
      }

      sanitized.push({
        ...cand,
        status: finalStatus,
        requires_human_validation: true // Always true for AI outputs
      });
    }

    return sanitized;
  }
}
