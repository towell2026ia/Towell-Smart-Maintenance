// supabase/functions/agents-orchestrator/agents/ag008/quality/failure-data-quality-engine.ts
// Data Quality & Completeness Engine for AG-008 (v1.0)
// Frozen under Token: AG008-DATA-QUALITY-RULES-001

import type { FailureEvent, FailureDataQuality } from '../types/ag008.types.ts';

export interface DataQualityReport {
  overall_quality: FailureDataQuality;
  total_events: number;
  unattributed_machine_count: number;
  approximated_time_count: number;
  unmapped_failure_mode_count: number;
  warnings: string[];
}

export function evaluateDataQuality(events: FailureEvent[]): DataQualityReport {
  const total = events.length;
  if (total === 0) {
    return {
      overall_quality: 'RELIABLE',
      total_events: 0,
      unattributed_machine_count: 0,
      approximated_time_count: 0,
      unmapped_failure_mode_count: 0,
      warnings: ['No hay eventos de falla registrados en el periodo.']
    };
  }

  let unattributed = 0;
  let approxTime = 0;
  let unmappedMode = 0;

  for (const ev of events) {
    if (!ev.machine_id) unattributed++;
    if (ev.data_quality === 'PARTIAL') approxTime++;
    if (ev.failure_normalized === 'UNKNOWN_FAILURE') unmappedMode++;
  }

  const unattributedRatio = unattributed / total;
  const approxRatio = approxTime / total;
  const unmappedRatio = unmappedMode / total;

  const warnings: string[] = [];
  if (unattributed > 0) {
    warnings.push(`${unattributed} de ${total} fallas (${(unattributedRatio * 100).toFixed(1)}%) no están atribuidas a una máquina oficial.`);
  }
  if (approxTime > 0) {
    warnings.push(`${approxTime} fallas utilizan fecha aproximada de solicitud en lugar de tiempo de ocurrencia exacto.`);
  }
  if (unmappedMode > 0) {
    warnings.push(`${unmappedMode} fallas contienen descripciones no reconocidas en el catálogo de sinónimos técnicos.`);
  }

  let quality: FailureDataQuality = 'RELIABLE';
  if (unattributedRatio > 0.3 || unmappedRatio > 0.4) {
    quality = 'UNRELIABLE';
  } else if (unattributedRatio > 0.1 || approxRatio > 0.25 || unmappedRatio > 0.15) {
    quality = 'PARTIAL';
  } else if (approxRatio > 0 || unmappedRatio > 0) {
    quality = 'USABLE_WITH_NORMALIZATION';
  }

  return {
    overall_quality: quality,
    total_events: total,
    unattributed_machine_count: unattributed,
    approximated_time_count: approxTime,
    unmapped_failure_mode_count: unmappedMode,
    warnings
  };
}
