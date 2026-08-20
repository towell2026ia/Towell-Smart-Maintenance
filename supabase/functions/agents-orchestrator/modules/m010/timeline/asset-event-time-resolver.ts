// supabase/functions/agents-orchestrator/modules/m010/timeline/asset-event-time-resolver.ts
// Semantic Event Time Resolver for M-010 (v1.0)
// Frozen under Token: M010-ASSET-EVENT-TIME-RULES-001
// Invariant: Never use created_at universally; use physical occurrence date (§84-90 PRD)

import type { TimelineEventType, TimeQuality } from '../types/m010.types.ts';

export interface ResolvedTimeResult {
  occurred_at: string;
  time_quality: TimeQuality;
}

export function resolveEventOccurrenceTime(
  eventType: TimelineEventType,
  record: { fecha?: string | null; fecha_creacion?: string | null; created_at?: string | null; fecha_programada?: string | null }
): ResolvedTimeResult {
  if (record.fecha) {
    return { occurred_at: record.fecha, time_quality: 'EXACT' };
  }
  if (record.fecha_creacion) {
    return { occurred_at: record.fecha_creacion, time_quality: 'EXACT' };
  }
  if (record.fecha_programada) {
    return { occurred_at: record.fecha_programada, time_quality: 'DATE_ONLY' };
  }
  if (record.created_at) {
    return { occurred_at: record.created_at, time_quality: 'APPROXIMATED' };
  }
  return { occurred_at: '1970-01-01T00:00:00Z', time_quality: 'UNKNOWN' };
}
