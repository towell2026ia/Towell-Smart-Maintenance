// supabase/functions/agents-orchestrator/agents/ag002/dedupers/historical-deduper.ts
// Deterministic Historical Deduplication and Recurrence Preservation (§16-19, §22 PRD)

import { DeduplicatedHistoricalEvent, DedupeStatus } from '../types/ag002.types.ts';

export interface RawEventCandidate {
  raw_id?: string | number;
  source: 'EXCEL_FAULT' | 'TELEGRAM' | 'WORK_ORDER' | 'BITACORA';
  maquina_id: string;
  date: string; // YYYY-MM-DD
  timestamp?: string;
  description: string;
  category?: string;
  folio?: string;
  id_original?: string | number;
  downtime_minutes?: number;
}

export function deduplicateHistoricalEvents(rawEvents: RawEventCandidate[]): DeduplicatedHistoricalEvent[] {
  const seenStrongIds = new Set<string>();
  const seenOTFolios = new Set<string>();
  const validEvents: DeduplicatedHistoricalEvent[] = [];

  // 1. Pass 1: Index Strong IDs and Work Orders
  for (const ev of rawEvents) {
    if (ev.source === 'WORK_ORDER' && ev.folio) {
      seenOTFolios.add(String(ev.folio).trim().toUpperCase());
    }
    if (ev.id_original !== undefined && ev.id_original !== null) {
      seenStrongIds.add(`ORIG_${String(ev.id_original).trim().toUpperCase()}`);
    }
  }

  // 2. Pass 2: Deduplicate and classify
  const machineDateDescMap = new Map<string, RawEventCandidate[]>();

  for (const ev of rawEvents) {
    const machineId = String(ev.maquina_id || '').trim().toUpperCase();
    const date = ev.date;
    const desc = String(ev.description || '').trim().toLowerCase();

    // Check Strong ID Duplicate
    if (ev.raw_id && seenStrongIds.has(`RAW_${ev.raw_id}`)) {
      continue; // EXACT_DUPLICATE dropped from computation
    }
    if (ev.raw_id) seenStrongIds.add(`RAW_${ev.raw_id}`);

    // Check Telegram <-> OT double counting (§22)
    if (ev.source === 'TELEGRAM' && ev.folio && seenOTFolios.has(String(ev.folio).trim().toUpperCase())) {
      continue; // Duplicate of already registered OT
    }

    // Key for same machine + same date + same description
    const exactSlotKey = `${machineId}__${date}__${desc}`;
    if (!machineDateDescMap.has(machineId)) {
      machineDateDescMap.set(machineId, []);
    }
    const previousEventsForMachine = machineDateDescMap.get(machineId)!;

    let isPossibleDuplicate = false;
    let isExactDuplicate = false;

    for (const prev of previousEventsForMachine) {
      const prevDesc = String(prev.description || '').trim().toLowerCase();
      const prevDate = new Date(prev.date).getTime();
      const currDate = new Date(date).getTime();
      const diffHours = Math.abs(currDate - prevDate) / (1000 * 60 * 60);

      if (diffHours === 0 && prevDesc === desc) {
        isExactDuplicate = true;
        break;
      } else if (diffHours <= 24 && prevDesc === desc) {
        isPossibleDuplicate = true;
      }
    }

    if (isExactDuplicate) {
      continue; // EXACT_DUPLICATE excluded from double counting
    }

    let status: DedupeStatus = 'UNIQUE_EVENT';
    if (isPossibleDuplicate) {
      status = 'POSSIBLE_DUPLICATE';
    } else {
      // Check if there are real recurrences on different dates (> 24h)
      const hasRecurrence = previousEventsForMachine.some(prev => {
        const prevDesc = String(prev.description || '').trim().toLowerCase();
        const prevDate = new Date(prev.date).getTime();
        const currDate = new Date(date).getTime();
        const diffHours = Math.abs(currDate - prevDate) / (1000 * 60 * 60);
        return diffHours > 24 && prevDesc === desc;
      });

      if (hasRecurrence) {
        status = 'NOT_DUPLICATE'; // Real recurrence strictly preserved
      }
    }

    previousEventsForMachine.push(ev);

    validEvents.push({
      event_id: `ev-${validEvents.length + 1}`,
      source: ev.source,
      maquina_id: machineId,
      date,
      description: ev.description,
      category: ev.category || 'UNCLASSIFIED_FAILURE',
      downtime_minutes: ev.downtime_minutes,
      dedupe_status: status,
      original_ref: ev.folio || (ev.id_original ? String(ev.id_original) : undefined)
    });
  }

  return validEvents;
}
