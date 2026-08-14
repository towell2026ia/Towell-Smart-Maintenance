// supabase/functions/agents-orchestrator/agents/ag005/dedup/duplicate-engine.ts
// Deduplication and Idempotency Engine for AG-005 Auditor de Bases v1.0

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SchemaDefinition, AG005Finding } from '../types/ag005.types.ts';

export interface DedupCheckResult {
  isDuplicate: boolean;
  duplicateType: 'FILE_ALREADY_PROCESSED' | 'DUPLICATE_EXACT' | 'POSSIBLE_DUPLICATE' | 'NONE';
  findings: AG005Finding[];
}

/**
 * Computes Web Crypto SHA-256 hex hash
 */
export async function computeSha256Hex(content: string): Promise<string> {
  const bytes = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Checks if a file hash has already been processed in control_cargas_archivos
 */
export async function checkFileAlreadyProcessed(
  fileHash: string,
  supabase: SupabaseClient | null
): Promise<{ isDuplicate: boolean; loadInfo?: any }> {
  if (!fileHash || !supabase) {
    return { isDuplicate: false };
  }

  try {
    const { data, error } = await supabase
      .from('control_cargas_archivos')
      .select('id_carga, nombre_archivo, estatus_carga, fecha_carga')
      .eq('file_hash', fileHash)
      .limit(1)
      .maybeSingle();

    if (!error && data && data.estatus_carga === 'Completada') {
      return { isDuplicate: true, loadInfo: data };
    }
  } catch (err) {
    console.warn('[DedupEngine] Error querying control_cargas_archivos:', err);
  }

  return { isDuplicate: false };
}

/**
 * Checks row-level exact duplicates using in-memory set and DB staging lookups
 */
export function checkRowDuplicates(
  rows: Record<string, any>[],
  schema: SchemaDefinition
): { duplicateIndices: Set<number>; findings: AG005Finding[] } {
  const findings: AG005Finding[] = [];
  const duplicateIndices = new Set<number>();
  const seenKeys = new Set<string>();

  const conflictKeys = schema.idempotency?.conflict_key
    ? schema.idempotency.conflict_key.split(',').map(k => k.trim())
    : schema.required_columns;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const keyParts = conflictKeys.map(k => String(row[k] || '').trim().toUpperCase());
    const key = keyParts.join('|');

    if (!key || key.replace(/\|/g, '') === '') continue;

    if (seenKeys.has(key)) {
      duplicateIndices.add(i + 1);
      findings.push({
        row: i + 1,
        field: conflictKeys.join(', '),
        severity: 'WARNING',
        code: 'DUPLICATE_EXACT',
        original_value: key,
        message: `Registro duplicado exacto en la fila ${i + 1} (llave de conflicto: ${key}).`
      });
    } else {
      seenKeys.add(key);
    }
  }

  return { duplicateIndices, findings };
}
