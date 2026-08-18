// supabase/functions/agents-orchestrator/agents/ag003/collectors/quality-window-collector.ts
// 30-Day Quality Window Collector (§6, §14-16 PRD)

import { RawQualityRow } from '../types/ag003.types.ts';
import { normalizeQualityRow, NormalizedQualityRow } from '../normalizers/predictive-quality-normalizer.ts';

export interface QualityWindowCollectionResult {
  machineId: string;
  windowFrom: string;
  windowTo: string;
  totalRows: number;
  validRows: NormalizedQualityRow[];
  invalidRows: NormalizedQualityRow[];
  totalSegundas: number;
  totalRolls: number;
  defectSummary: Record<string, { code: string; name: string; count: number }>;
}

export function collectQualityWindow(
  machineId: string,
  rawRows: RawQualityRow[],
  targetDate: string,
  windowDays = 30
): QualityWindowCollectionResult {
  const normMachine = String(machineId || '').trim().toUpperCase();
  const endDate = new Date(targetDate);
  const startDate = new Date(endDate.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const windowTo = endDate.toISOString().slice(0, 10);
  const windowFrom = startDate.toISOString().slice(0, 10);

  const validRows: NormalizedQualityRow[] = [];
  const invalidRows: NormalizedQualityRow[] = [];
  const defectSummary: Record<string, { code: string; name: string; count: number }> = {};
  const seenRolls = new Set<string>();

  for (const raw of rawRows) {
    const norm = normalizeQualityRow(raw);
    if (!norm.is_valid) {
      invalidRows.push(norm);
      continue;
    }

    if (norm.machine_id !== normMachine) {
      continue;
    }

    const rowDate = new Date(norm.fecha);
    if (rowDate >= startDate && rowDate <= endDate) {
      validRows.push(norm);
      if (norm.numero_serie) {
        seenRolls.add(norm.numero_serie);
      }

      const dKey = norm.codigo_defecto || norm.defecto;
      if (!defectSummary[dKey]) {
        defectSummary[dKey] = {
          code: norm.codigo_defecto,
          name: norm.defecto,
          count: 0
        };
      }
      defectSummary[dKey].count += norm.cantidad_defecto;
    }
  }

  const totalSegundas = validRows.reduce((acc, r) => acc + r.cantidad_defecto, 0);
  const totalRolls = seenRolls.size > 0 ? seenRolls.size : validRows.length;

  return {
    machineId: normMachine,
    windowFrom,
    windowTo,
    totalRows: validRows.length + invalidRows.length,
    validRows,
    invalidRows,
    totalSegundas,
    totalRolls,
    defectSummary
  };
}
