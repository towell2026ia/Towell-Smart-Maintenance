// supabase/functions/agents-orchestrator/agents/ag009/ag009_3/guards/corrective-security-guard.ts
// Security & Client Control Guard for AG-009.3 (§63-66, §87-89 PRD)

import { CorrectiveConnectorError } from '../errors/corrective-error-catalog.ts';

const FORBIDDEN_CLIENT_CONTROL_FIELDS = [
  'force_create_ot',
  'skip_approval',
  'skip_validation',
  'is_admin',
  'approved',
  'close_ot',
  'assign_to'
];

const SQL_INJECTION_PATTERN = /(\b(SELECT|DROP|INSERT|DELETE|UPDATE|ALTER|CREATE|EXEC|UNION)\b|--|;|\/\*|\*\/)/i;

export interface SanitizedSecurityResult {
  hasAuthorityBypassAttempt: boolean;
  hasSqlInjectionAttempt: boolean;
  cleanedFields: Record<string, any>;
}

export function validateCorrectiveSecurityGuard(rawPayload: Record<string, any>): SanitizedSecurityResult {
  let hasAuthorityBypassAttempt = false;
  let hasSqlInjectionAttempt = false;
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(rawPayload)) {
    // 1. Detección y rechazo de campos de control de cliente (§63 PRD)
    if (FORBIDDEN_CLIENT_CONTROL_FIELDS.includes(key)) {
      hasAuthorityBypassAttempt = true;
      console.warn(`[SecurityGuard] Intento de escalamiento rechazado en campo: "${key}" = ${value}`);
      continue; // Ignorar el campo por completo
    }

    // 2. Detección de inyecciones de código o SQL (§64, §65 PRD)
    if (typeof value === 'string') {
      if (SQL_INJECTION_PATTERN.test(value)) {
        hasSqlInjectionAttempt = true;
        console.warn(`[SecurityGuard] Patrón sospechoso de inyección SQL sanitizado en "${key}": ${value}`);
      }
    }

    cleaned[key] = value;
  }

  return {
    hasAuthorityBypassAttempt,
    hasSqlInjectionAttempt,
    cleanedFields: cleaned
  };
}
