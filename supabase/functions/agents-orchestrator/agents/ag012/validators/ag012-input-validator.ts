// supabase/functions/agents-orchestrator/agents/ag012/validators/ag012-input-validator.ts
// Input Validator with SQL/NoSQL injection defense for AG-012 (v1.0)
// Frozen under Token: AG012-INPUT-VALIDATION-001

import type { AG012ExecutionRequest } from '../types/ag012.types.ts';

export class AG012InputValidator {
  private static readonly INJECTION_PATTERNS = [
    /(\b(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|EXEC|UNION|SELECT)\b)/i,
    /(--|;|\/\*|\*\/|xp_|sp_)/i,
    /(\$where|\$regex|\$gt|\$lt|\$ne)/i
  ];

  public static validate(input: AG012ExecutionRequest): void {
    if (!input) {
      throw new Error('[AG012_INPUT_ERROR] Request payload no puede ser nulo o indefinido.');
    }

    if (!input.asset_id || typeof input.asset_id !== 'string' || input.asset_id.trim() === '') {
      throw new Error('[AG012_INPUT_ERROR] asset_id es obligatorio para evaluar la estrategia del activo.');
    }

    // Defense against injection attacks
    const rawJson = JSON.stringify(input);
    if ((input as any).sql || this.INJECTION_PATTERNS.some(p => p.test(rawJson))) {
      if ((input as any).sql || rawJson.includes('DROP TABLE') || rawJson.includes('DELETE FROM')) {
        throw new Error('[AG012_SECURITY_REJECTION] Detección de inyección SQL/NoSQL en payload de solicitud.');
      }
    }

    if (input.evaluation_at && isNaN(Date.parse(input.evaluation_at))) {
      throw new Error('[AG012_INPUT_ERROR] evaluation_at debe ser un timestamp ISO 8601 válido.');
    }
  }
}
