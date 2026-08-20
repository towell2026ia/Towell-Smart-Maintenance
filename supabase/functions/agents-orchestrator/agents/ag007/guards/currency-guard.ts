// supabase/functions/agents-orchestrator/agents/ag007/guards/currency-guard.ts
// Currency Guard for AG-007 (v1.0)
// Frozen under Token: AG007-DETERMINISTIC-ENGINE-001
// Invariant: Canonical currency is MXN; no cross-currency sums without FX (§36-40 PRD)

export type SupportedCurrency = 'MXN';

export interface CurrencyCheckResult {
  isSupported: boolean;
  currency: string;
  error?: string;
}

export function validateCurrency(curr: any): CurrencyCheckResult {
  if (!curr) {
    return { isSupported: true, currency: 'MXN' }; // Default canonical currency
  }

  const clean = String(curr).trim().toUpperCase();

  if (clean === 'MXN' || clean === 'PESOS' || clean === 'MN') {
    return { isSupported: true, currency: 'MXN' };
  }

  if (clean === 'USD' || clean === 'EUR') {
    return {
      isSupported: false,
      currency: clean,
      error: `Moneda extranjera '${clean}' detectada sin tasa de cambio autorizada (FX_RATE_REQUIRED).`
    };
  }

  return {
    isSupported: false,
    currency: clean,
    error: `Moneda no soportada: '${clean}' (UNSUPPORTED_CURRENCY).`
  };
}
