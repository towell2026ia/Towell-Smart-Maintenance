// supabase/functions/agents-orchestrator/agents/ag008/resolvers/failure-time-resolver.ts
// Failure Time Resolver for AG-008 (v1.0)
// Frozen under Token: AG008-FAILURE-TIME-SEMANTICS-001

export interface TimeResolutionResult {
  occurred_at: string | null; // ISO Timestamp
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:MM:SS
  shift: number | null; // 1, 2, 3
  is_approximated: boolean;
  status: 'RELIABLE_TIMESTAMP' | 'APPROXIMATED_FROM_REQUEST' | 'FAILURE_TIME_NOT_AVAILABLE';
}

export function resolveFailureTime(
  occurredDate?: string | Date | null,
  occurredTime?: string | null,
  requestedDate?: string | Date | null,
  explicitShift?: number | null
): TimeResolutionResult {
  let finalDateStr: string | null = null;
  let finalTimeStr: string | null = occurredTime || null;
  let isApproximated = false;
  let status: 'RELIABLE_TIMESTAMP' | 'APPROXIMATED_FROM_REQUEST' | 'FAILURE_TIME_NOT_AVAILABLE' = 'FAILURE_TIME_NOT_AVAILABLE';

  if (occurredDate) {
    try {
      const d = new Date(occurredDate);
      if (!isNaN(d.getTime())) {
        finalDateStr = d.toISOString().substring(0, 10);
        status = 'RELIABLE_TIMESTAMP';
      }
    } catch {
      finalDateStr = null;
    }
  }

  if (!finalDateStr && requestedDate) {
    try {
      const d = new Date(requestedDate);
      if (!isNaN(d.getTime())) {
        finalDateStr = d.toISOString().substring(0, 10);
        isApproximated = true;
        status = 'APPROXIMATED_FROM_REQUEST';
      }
    } catch {
      finalDateStr = null;
    }
  }

  if (!finalDateStr) {
    return {
      occurred_at: null,
      date: null,
      time: null,
      shift: null,
      is_approximated: false,
      status: 'FAILURE_TIME_NOT_AVAILABLE'
    };
  }

  // Derive Shift if not explicit
  let derivedShift = explicitShift || null;
  if (!derivedShift && finalTimeStr) {
    const parts = finalTimeStr.split(':');
    const hour = parseInt(parts[0], 10);
    if (!isNaN(hour)) {
      if (hour >= 6 && hour < 14) derivedShift = 1;
      else if (hour >= 14 && hour < 22) derivedShift = 2;
      else derivedShift = 3;
    }
  }

  const isoTimestamp = finalTimeStr
    ? `${finalDateStr}T${finalTimeStr}-06:00`
    : `${finalDateStr}T12:00:00-06:00`;

  return {
    occurred_at: isoTimestamp,
    date: finalDateStr,
    time: finalTimeStr,
    shift: derivedShift,
    is_approximated: isApproximated,
    status
  };
}
