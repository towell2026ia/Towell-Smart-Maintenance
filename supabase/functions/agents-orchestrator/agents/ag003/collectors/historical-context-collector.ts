// supabase/functions/agents-orchestrator/agents/ag003/collectors/historical-context-collector.ts
// Historical Context & Deduplication Collector (§38-46 PRD)

import { RawFailureRow, RawTelegramRow, RawBitacoraRow } from '../types/ag003.types.ts';
import { HISTORICAL_CONTEXT_CONFIG } from '../rules/historical-context.rules.ts';

export interface DeduplicatedFailureEvent {
  eventId: string;
  source: 'FALLAS_HISTORICAS' | 'TELEGRAM' | 'OT';
  category: string;
  description: string;
  date: string;
  isDuplicate: boolean;
  duplicateOf?: string;
}

export interface HistoricalContextResult {
  machineId: string;
  totalRawEvents: number;
  deduplicatedFailuresCount: number;
  exactDuplicatesCount: number;
  realRecurrencesCount: number;
  downtimeMinutes: number;
  downtimeHours: number;
  isDowntimeUnknown: boolean;
  categories: Record<string, number>;
}

export function collectHistoricalContext(
  machineId: string,
  targetDate: string,
  failures: RawFailureRow[] = [],
  telegrams: RawTelegramRow[] = [],
  bitacoras: RawBitacoraRow[] = [],
  windowDays = 30
): HistoricalContextResult {
  const normMachine = String(machineId || '').trim().toUpperCase();
  const endDate = new Date(targetDate);
  const startDate = new Date(endDate.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const seenKeys = new Map<string, number>();
  const events: DeduplicatedFailureEvent[] = [];
  let exactDuplicatesCount = 0;
  const categories: Record<string, number> = {};

  // 1. Process Excel / DB Failures
  for (const f of failures) {
    if (String(f.maquina_id || '').trim().toUpperCase() !== normMachine) continue;
    const dateStr = String(f.fecha_creada || '').slice(0, 10);
    const fDate = new Date(dateStr);
    if (fDate >= startDate && fDate <= endDate) {
      const cat = String(f.categoria_falla || 'MECANICA').trim();
      const desc = String(f.descripcion || '').trim().toLowerCase();
      const dedupeKey = `${normMachine}_${dateStr}_${cat}_${desc}`;

      if (seenKeys.has(dedupeKey)) {
        exactDuplicatesCount++;
      } else {
        seenKeys.set(dedupeKey, fDate.getTime());
        events.push({
          eventId: f.id_falla || `falla-${events.length + 1}`,
          source: 'FALLAS_HISTORICAS',
          category: cat,
          description: desc,
          date: dateStr,
          isDuplicate: false
        });
        categories[cat] = (categories[cat] || 0) + 1;
      }
    }
  }

  // 2. Process Telegram Events (Anti-Double Counting with Failures)
  for (const t of telegrams) {
    if (String(t.maquina_id || '').trim().toUpperCase() !== normMachine) continue;
    const dateStr = String(t.fecha || '').slice(0, 10);
    const tDate = new Date(dateStr);
    if (tDate >= startDate && tDate <= endDate) {
      const cat = String(t.tipo_falla_id || 'MECANICA').trim();
      const desc = String(t.falla || '').trim().toLowerCase();
      const dedupeKey = `${normMachine}_${dateStr}_${cat}_${desc}`;

      if (seenKeys.has(dedupeKey)) {
        exactDuplicatesCount++;
      } else {
        seenKeys.set(dedupeKey, tDate.getTime());
        events.push({
          eventId: String(t.id || t.folio || `tg-${events.length + 1}`),
          source: 'TELEGRAM',
          category: cat,
          description: desc,
          date: dateStr,
          isDuplicate: false
        });
        categories[cat] = (categories[cat] || 0) + 1;
      }
    }
  }

  // 3. Process Downtime from Bitácoras
  let totalDowntimeMin = 0;
  let hasValidDowntime = false;
  for (const b of bitacoras) {
    if (String(b.maquina_id || '').trim().toUpperCase() !== normMachine) continue;
    if (b.tiempo_atencion_min !== undefined && b.tiempo_atencion_min !== null) {
      totalDowntimeMin += Number(b.tiempo_atencion_min) || 0;
      hasValidDowntime = true;
    }
  }

  const deduplicatedCount = events.length;
  const realRecurrencesCount = Object.values(categories).reduce((acc, c) => acc + (c > 1 ? c - 1 : 0), 0);

  return {
    machineId: normMachine,
    totalRawEvents: failures.length + telegrams.length,
    deduplicatedFailuresCount: deduplicatedCount,
    exactDuplicatesCount,
    realRecurrencesCount,
    downtimeMinutes: totalDowntimeMin,
    downtimeHours: Number((totalDowntimeMin / 60).toFixed(1)),
    isDowntimeUnknown: !hasValidDowntime && totalDowntimeMin === 0,
    categories
  };
}
