// supabase/functions/agents-orchestrator/agents/ag008/dedupers/failure-event-dedupe.ts
// Deterministic Failure Event Dedupe Engine for AG-008 (v1.0)
// Frozen under Token: AG008-DEDUPE-RULES-001

import crypto from 'node:crypto';
import type { FailureEvent } from '../types/ag008.types.ts';

export interface DedupeResult {
  dedupedEvents: FailureEvent[];
  exactDuplicatesCount: number;
  crossSourceDuplicatesCount: number;
  trueRecurrencesCount: number;
}

export function computeEventFingerprint(event: Partial<FailureEvent>): string {
  const payload = [
    event.machine_id || 'UNATTRIBUTED',
    event.date || 'NODATE',
    event.shift !== null && event.shift !== undefined ? String(event.shift) : 'NOSHIFT',
    event.failure_normalized || 'UNKNOWN',
    event.source_type || 'NOSOURCE',
    event.source_reference || 'NOREF'
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function computePhysicalFailureKey(event: FailureEvent): string {
  return [
    event.machine_id || 'UNATTRIBUTED',
    event.date,
    event.shift !== null && event.shift !== undefined ? String(event.shift) : 'NOSHIFT',
    event.failure_normalized
  ].join('|');
}

export function deduplicateFailureEvents(rawEvents: FailureEvent[]): DedupeResult {
  const seenExactHashes = new Set<string>();
  const physicalEventsMap = new Map<string, FailureEvent>();
  let exactDuplicatesCount = 0;
  let crossSourceDuplicatesCount = 0;

  // Precedence order: OT (1) > AUTONOMOUS/PREDICTIVE (2) > TELEGRAM (3) > BITACORA (4) > EXCEL (5)
  const sourceRank: Record<string, number> = {
    OT: 1,
    AUTONOMOUS_FINDING: 2,
    PREDICTIVE_FINDING: 2,
    TELEGRAM: 3,
    BITACORA: 4,
    EXCEL_HISTORICAL: 5
  };

  for (const event of rawEvents) {
    const exactHash = computeEventFingerprint(event);

    // 1. Check Exact Duplicate (same source, same ref, same event)
    if (seenExactHashes.has(exactHash)) {
      exactDuplicatesCount++;
      continue;
    }
    seenExactHashes.add(exactHash);

    // 2. Check Cross-Source Duplicate (same machine, same date, same shift/window, same normalized failure)
    const physKey = computePhysicalFailureKey(event);
    if (physicalEventsMap.has(physKey)) {
      const existing = physicalEventsMap.get(physKey)!;
      crossSourceDuplicatesCount++;

      // Merge source references and take highest authoritative source
      const existingRank = sourceRank[existing.source_type] || 99;
      const currentRank = sourceRank[event.source_type] || 99;

      if (currentRank < existingRank) {
        // Current event is more authoritative (e.g. OT wins over Telegram)
        physicalEventsMap.set(physKey, {
          ...event,
          source_reference: `${event.source_reference}; merged_with:${existing.source_reference}`,
          physical_finding: event.physical_finding || existing.physical_finding,
          work_order_folio: event.work_order_folio || existing.work_order_folio
        });
      } else {
        // Existing event remains authority, append reference
        physicalEventsMap.set(physKey, {
          ...existing,
          source_reference: `${existing.source_reference}; merged_with:${event.source_reference}`,
          physical_finding: existing.physical_finding || event.physical_finding,
          work_order_folio: existing.work_order_folio || event.work_order_folio
        });
      }
    } else {
      physicalEventsMap.set(physKey, event);
    }
  }

  const dedupedEvents = Array.from(physicalEventsMap.values());

  // Count true recurrences (distinct events for same machine & normalized failure across different dates/shifts)
  const modeCountMap = new Map<string, number>();
  for (const ev of dedupedEvents) {
    if (ev.machine_id && ev.failure_normalized !== 'UNKNOWN_FAILURE') {
      const k = `${ev.machine_id}::${ev.failure_normalized}`;
      modeCountMap.set(k, (modeCountMap.get(k) || 0) + 1);
    }
  }

  let trueRecurrencesCount = 0;
  for (const count of modeCountMap.values()) {
    if (count > 1) {
      trueRecurrencesCount += count - 1;
    }
  }

  return {
    dedupedEvents,
    exactDuplicatesCount,
    crossSourceDuplicatesCount,
    trueRecurrencesCount
  };
}
