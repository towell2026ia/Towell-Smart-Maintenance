// supabase/functions/agents-orchestrator/agents/ag005/validators/security-validator.ts
// Security & Prompt Injection Protection Validator for AG-005 Auditor de Bases v1.0

import { AG005Finding } from '../types/ag005.types.ts';

const FORBIDDEN_CLIENT_FLAGS = [
  'skip_validation',
  'force_insert',
  'destination_table',
  'override_schema',
  'allow_invalid_machines',
  'disable_idempotency'
];

export function validateSecurityPayload(
  payload: Record<string, any>
): { isValid: boolean; findings: AG005Finding[]; cleanedPayload: Record<string, any> } {
  const findings: AG005Finding[] = [];
  const cleaned = { ...payload };

  for (const flag of FORBIDDEN_CLIENT_FLAGS) {
    if (flag in cleaned) {
      delete cleaned[flag];
      findings.push({
        row: 0,
        field: flag,
        severity: 'CRITICAL',
        code: 'INVALID_PAYLOAD',
        original_value: payload[flag],
        message: `Se detectó e ignoró la bandera de control no autorizada '${flag}' en el payload del cliente.`
      });
    }
  }

  const hasCritical = findings.some(f => f.code === 'INVALID_PAYLOAD');

  return {
    isValid: !hasCritical,
    findings,
    cleanedPayload: cleaned
  };
}
