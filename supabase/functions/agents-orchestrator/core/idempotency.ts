// supabase/functions/agents-orchestrator/core/idempotency.ts
// Idempotency engine for AG-001 Capataz Orquestador v1.0

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { canonicalizeJson, sha256Hex } from './approvals.ts';

/**
 * Computes deterministic idempotency key for events
 */
export async function generateIdempotencyKey(
  eventCode: string,
  payload: Record<string, any>
): Promise<string> {
  const cleanCode = (eventCode || "").toUpperCase().trim();

  if (cleanCode === 'PREVENTIVO_GENERAR') {
    const maquina = payload.maquina_id || 'ANY';
    const anio = payload.anio || new Date().getFullYear();
    const tipo = payload.tipo_mantenimiento || 'PREVENTIVO';
    return `IDEM|PREVENTIVO_GENERAR|${maquina}|${anio}|${tipo}`;
  }

  if (cleanCode === 'AUTONOMO_GENERAR') {
    const maquina = payload.maquina_id || 'ANY';
    const semana = payload.semana || 'SEM-01';
    return `IDEM|AUTONOMO_GENERAR|${maquina}|${semana}`;
  }

  if (cleanCode === 'PREDICTIVO_GENERAR') {
    const maquina = payload.maquina_id || 'ANY';
    const mes = payload.mes || 'MES-01';
    return `IDEM|PREDICTIVO_GENERAR|${maquina}|${mes}`;
  }

  if (cleanCode === 'EXCEL_BASE_CARGADA') {
    const filePath = payload.file_path || payload.hash || JSON.stringify(payload);
    const hash = await sha256Hex(filePath);
    return `IDEM|EXCEL_BASE_CARGADA|${hash.substring(0, 16)}`;
  }

  if (cleanCode === 'FALLA_REPORTADA' || cleanCode === 'SOLICITUD_CORRECTIVA') {
    const maquina = payload.maquina_id || payload.solicitud_id || 'ANY';
    const falla = (payload.falla_descripcion || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const hash = await sha256Hex(falla || JSON.stringify(payload));
    return `IDEM|${cleanCode}|${maquina}|${hash.substring(0, 16)}`;
  }

  const canonical = canonicalizeJson(payload);
  const hash = await sha256Hex(canonical);
  return `IDEM|GENERIC|${cleanCode}|${hash.substring(0, 20)}`;
}

/**
 * Checks if an event with the given idempotency key has already been dispatched/processed.
 */
export async function checkIdempotency(
  supabase: SupabaseClient | null,
  idempotencyKey: string
): Promise<{ exists: boolean; status: string | null; result: any | null }> {
  if (!supabase) {
    return { exists: false, status: null, result: null };
  }

  try {
    const { data, error } = await supabase
      .from('eventos_agente')
      .select('estatus, id_evento')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (error) {
      console.warn('[Idempotency] Error querying DB:', error.message);
      return { exists: false, status: null, result: null };
    }

    if (data) {
      const { data: exec } = await supabase
        .from('bitacora_ejecuciones_agente')
        .select('result, status')
        .eq('event_id', data.id_evento)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        exists: true,
        status: data.estatus,
        result: exec ? exec.result : null
      };
    }

    return { exists: false, status: null, result: null };
  } catch (err) {
    console.warn('[Idempotency] Exception checking DB:', err);
    return { exists: false, status: null, result: null };
  }
}
