// supabase/functions/agents-orchestrator/modules/m010/pagination/asset-pagination.ts
// Pagination & Boundary Engine for M-010 (v1.0)
// Frozen under Token: M010-PAGINATION-RULES-001
// Invariant: Server-side limit clamping; date_from <= date_to validation (§117-125 PRD)

export class InvalidDateRangeError extends Error {
  constructor(from: string, to: string) {
    super(`[INVALID_DATE_RANGE] date_from '${from}' must be earlier than or equal to date_to '${to}'.`);
    this.name = 'InvalidDateRangeError';
  }
}

export interface PaginationOptions {
  limit?: number;
  cursor?: string | null;
  date_from?: string | null;
  date_to?: string | null;
}

export const MAX_SERVER_LIMIT = 200;
export const DEFAULT_SERVER_LIMIT = 50;

export function sanitizePaginationOptions(opts?: PaginationOptions): {
  limit: number;
  cursor: string | null;
  date_from: string | null;
  date_to: string | null;
} {
  let limit = opts?.limit && opts.limit > 0 ? opts.limit : DEFAULT_SERVER_LIMIT;
  if (limit > MAX_SERVER_LIMIT) {
    limit = MAX_SERVER_LIMIT;
  }

  const dateFrom = opts?.date_from || null;
  const dateTo = opts?.date_to || null;

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new InvalidDateRangeError(dateFrom, dateTo);
  }

  return {
    limit,
    cursor: opts?.cursor || null,
    date_from: dateFrom,
    date_to: dateTo
  };
}
