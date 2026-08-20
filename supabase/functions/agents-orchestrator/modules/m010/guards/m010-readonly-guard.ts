// supabase/functions/agents-orchestrator/modules/m010/guards/m010-readonly-guard.ts
// Strict Read-Only Guard & Repository Capability Interface for M-010 (v1.0)
// Frozen under Token: M010-READONLY-GUARD-001
// Invariant: Zero business mutation paths; exclusively read/select operations permitted (§61-83 PRD-M-010.2-R1)

export class M010ReadOnlyViolationError extends Error {
  constructor(operation: string, details?: string) {
    super(`[M010-READONLY-VIOLATION] Operation '${operation}' is strictly prohibited in M-010. ${details || ''}`);
    this.name = 'M010ReadOnlyViolationError';
  }
}

export const ALLOWED_READ_OPERATIONS = ['SELECT', 'READ', 'FILTER', 'ORDER', 'LIMIT', 'RANGE', 'AGGREGATE'] as const;
export type AllowedReadOperation = typeof ALLOWED_READ_OPERATIONS[number];

export const PROHIBITED_MUTATION_OPERATIONS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'UPSERT',
  'CREATE_OT',
  'UPDATE_OT',
  'CREATE_ALERT',
  'UPDATE_MACHINE',
  'RESERVE_PART',
  'CONSUME_PART',
  'MUTATING_RPC'
] as const;

export function assertReadOnlyOperation(operation: string): void {
  const opUpper = operation.trim().toUpperCase();
  if (PROHIBITED_MUTATION_OPERATIONS.some(p => opUpper.includes(p))) {
    throw new M010ReadOnlyViolationError(operation, 'M-010 operates exclusively as a read-only consolidation layer.');
  }
}

// Read-only database query abstraction interface
export interface ReadOnlyDataSource<T> {
  fetchByMachineId(machineId: string, options?: { limit?: number; dateFrom?: string; dateTo?: string }): Promise<T[]>;
}
