// supabase/functions/agents-orchestrator/agents/ag007/guards/monetary-null-guard.ts
// Monetary Null Guard for AG-007 (v1.0)
// Frozen under Token: AG007-DETERMINISTIC-ENGINE-001
// Invariant: UNKNOWN is NEVER ZERO (§11, §12 PRD-AG-007.2)

export interface MonetaryValidationResult {
  isValid: boolean;
  amount: number | null;
  status: 'KNOWN' | 'COST_NOT_AVAILABLE' | 'INVALID_NUMERIC';
  roundedAmount: number | null;
}

export function validateMonetaryValue(rawVal: any): MonetaryValidationResult {
  if (rawVal === null || rawVal === undefined || rawVal === '' || rawVal === 'COST_NOT_AVAILABLE') {
    return {
      isValid: true,
      amount: null,
      status: 'COST_NOT_AVAILABLE',
      roundedAmount: null
    };
  }

  const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).trim());

  if (isNaN(num)) {
    return {
      isValid: false,
      amount: null,
      status: 'INVALID_NUMERIC',
      roundedAmount: null
    };
  }

  // Safe 2-decimal monetary rounding
  const rounded = Math.round(num * 100) / 100;

  return {
    isValid: true,
    amount: num,
    status: 'KNOWN',
    roundedAmount: rounded
  };
}

export function calculateMonetaryProduct(quantity: any, unitCost: any): { total: number | null; status: 'KNOWN' | 'COST_NOT_AVAILABLE' | 'INVALID' } {
  const qtyCheck = validateMonetaryValue(quantity);
  const costCheck = validateMonetaryValue(unitCost);

  if (!qtyCheck.isValid || !costCheck.isValid) {
    return { total: null, status: 'INVALID' };
  }

  if (qtyCheck.status === 'COST_NOT_AVAILABLE' || costCheck.status === 'COST_NOT_AVAILABLE') {
    return { total: null, status: 'COST_NOT_AVAILABLE' };
  }

  const rawProduct = (qtyCheck.amount || 0) * (costCheck.amount || 0);
  const roundedProduct = Math.round(rawProduct * 100) / 100;

  return {
    total: roundedProduct,
    status: 'KNOWN'
  };
}
