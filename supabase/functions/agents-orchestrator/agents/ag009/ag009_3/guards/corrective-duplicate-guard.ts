// supabase/functions/agents-orchestrator/agents/ag009/ag009_3/guards/corrective-duplicate-guard.ts
// Deterministic Deduplication & Idempotency Engine for AG-009.3 (§27-32 PRD)

import { CorrectiveRequest } from '../../types/ag009.types.ts';
import { CorrectiveConnectorError } from '../errors/corrective-error-catalog.ts';

export interface ExistingRequestRecord {
  request_id?: string;
  event_id?: string;
  source: string;
  source_reference?: string;
  id_original?: string;
  folio_original?: string;
  machine_id: string;
  description: string;
  requested_at: string;
  status?: string;
}

export type DuplicateCheckResult =
  | 'NOT_DUPLICATE'
  | 'POSSIBLE_DUPLICATE'
  | 'EXACT_DUPLICATE'
  | 'IDEMPOTENT_REPLAY';

export interface DuplicateValidationOutput {
  status: DuplicateCheckResult;
  matchedRecord?: ExistingRequestRecord;
  reason?: string;
}

// Simple Jaccard word-similarity index for description comparison
function calculateTextSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(textA.toLowerCase().replace(/[^a-záéíóú0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(textB.toLowerCase().replace(/[^a-záéíóú0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

// Check if two ISO dates fall within the same calendar day (24h window)
function isSameDay(dateStrA: string, dateStrB: string): boolean {
  try {
    const da = new Date(dateStrA);
    const db = new Date(dateStrB);
    if (isNaN(da.getTime()) || isNaN(db.getTime())) return false;
    const diffHours = Math.abs(da.getTime() - db.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  } catch (e) {
    return false;
  }
}

export function validateCorrectiveDuplicateGuard(
  request: CorrectiveRequest,
  existingRecords: ExistingRequestRecord[] = [],
  eventId?: string
): DuplicateValidationOutput {
  if (!existingRecords || existingRecords.length === 0) {
    return { status: 'NOT_DUPLICATE' };
  }

  const reqMachine = request.machine_id.toUpperCase().trim();
  const reqSource = request.source.toUpperCase().trim();
  const reqSourceRef = request.source_reference ? String(request.source_reference).trim() : null;
  const reqTgId = request.telegram_metadata?.id_original ? String(request.telegram_metadata.id_original).trim() : null;

  for (const record of existingRecords) {
    const recMachine = String(record.machine_id || '').toUpperCase().trim();
    const recSource = String(record.source || '').toUpperCase().trim();
    const recSourceRef = record.source_reference ? String(record.source_reference).trim() : null;
    const recTgId = record.id_original ? String(record.id_original).trim() : null;

    // 1. DUPLICADO EXACTO / IDEMPOTENCIA (§27, §29 PRD)
    // a) Mismo event_id
    if (eventId && record.event_id && record.event_id === eventId) {
      return {
        status: 'IDEMPOTENT_REPLAY',
        matchedRecord: record,
        reason: `Replay idempotente detectado: event_id "${eventId}" ya fue procesado.`
      };
    }

    // b) Misma referencia de fuente original (id_original Telegram o finding_id)
    if (reqTgId && recTgId && reqTgId === recTgId) {
      return {
        status: 'EXACT_DUPLICATE',
        matchedRecord: record,
        reason: `Duplicado exacto Telegram: id_original "${reqTgId}" ya existe en el sistema.`
      };
    }

    if (reqSourceRef && recSourceRef && reqSourceRef === recSourceRef && reqSource === recSource) {
      return {
        status: 'EXACT_DUPLICATE',
        matchedRecord: record,
        reason: `Duplicado exacto: source_reference "${reqSourceRef}" para fuente "${reqSource}" ya registrado.`
      };
    }

    // 2. POSIBLE DUPLICADO (§30, §31 PRD)
    // Misma máquina + misma fuente + misma ventana de 24h + alta similitud de texto
    if (reqMachine === recMachine && reqSource === recSource) {
      const sameDayWindow = isSameDay(request.requested_at, record.requested_at);
      if (sameDayWindow) {
        const similarity = calculateTextSimilarity(request.description, record.description);
        if (similarity >= 0.70) {
          return {
            status: 'POSSIBLE_DUPLICATE',
            matchedRecord: record,
            reason: `Posible duplicado en máquina "${reqMachine}" detectado en ventana de 24h con ${(similarity * 100).toFixed(0)}% de similitud textual. Requiere revisión humana.`
          };
        }
      }
    }
  }

  // 3. REINCIDENCIA REAL (§31, §32 PRD): Misma máquina, pero fechas diferentes -> NOT_DUPLICATE
  return { status: 'NOT_DUPLICATE' };
}
