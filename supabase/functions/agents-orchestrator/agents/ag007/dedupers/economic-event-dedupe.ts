// supabase/functions/agents-orchestrator/agents/ag007/dedupers/economic-event-dedupe.ts
// Economic Event Deduplication Engine for AG-007 (v1.0)
// Frozen under Token: AG007-DETERMINISTIC-ENGINE-001
// Invariant: Exact duplicate counted once; true recurrences preserved (§49-55 PRD)

import type { EconomicEvent } from '../types/ag007.types.ts';

export interface DedupeResult {
  uniqueEvents: EconomicEvent[];
  exactDuplicatesCount: number;
  possibleDuplicatesCount: number;
}

export function deduplicateEconomicEvents(events: EconomicEvent[]): DedupeResult {
  const seenHashes = new Set<string>();
  const uniqueEvents: EconomicEvent[] = [];
  let exactDuplicatesCount = 0;
  let possibleDuplicatesCount = 0;

  // Precedence order: OTs > Bitacora > Staging Excel
  const sortedEvents = [...events].sort((a, b) => {
    const scoreA = a.source_table.includes('ordenes_trabajo') ? 3 : a.source_table.includes('bitacora') ? 2 : 1;
    const scoreB = b.source_table.includes('ordenes_trabajo') ? 3 : b.source_table.includes('bitacora') ? 2 : 1;
    return scoreB - scoreA;
  });

  for (const ev of sortedEvents) {
    // Exact duplicate key
    const exactKey = `${ev.source_table}:${ev.source_record_id}:${ev.date}:${ev.machine_id}:${ev.part_code || ''}:${ev.quantity}:${ev.unit_cost || ''}`;
    
    // Cross-source semantic key (e.g. same OT folio and same part code)
    const crossSourceKey = ev.work_order_folio && ev.part_code
      ? `OT:${ev.work_order_folio}:${ev.part_code}:${ev.quantity}`
      : null;

    if (seenHashes.has(exactKey) || (crossSourceKey && seenHashes.has(crossSourceKey))) {
      exactDuplicatesCount++;
      continue;
    }

    seenHashes.add(exactKey);
    if (crossSourceKey) seenHashes.add(crossSourceKey);
    uniqueEvents.push(ev);
  }

  return {
    uniqueEvents,
    exactDuplicatesCount,
    possibleDuplicatesCount
  };
}
