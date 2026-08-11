// supabase/functions/agents-orchestrator/core/idempotency.ts

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Genera un hash SHA-256 de forma determinista para el payload
 * garantizando que las llaves del JSON estén ordenadas.
 */
async function computeHash(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Genera la clave de idempotencia de forma determinista basada en el tipo de evento y payload
 */
export async function generateIdempotencyKey(
  eventCode: string,
  payload: Record<string, any>
): Promise<string> {
  const cleanCode = (eventCode || "").toUpperCase().trim();
  
  // Reglas personalizadas por evento
  if (cleanCode === 'PREVENTIVO_GENERAR') {
    const maquina = payload.maquina_id || 'ANY';
    const anio = payload.anio || new Date().getFullYear();
    const tipo = payload.tipo_mantenimiento || 'PREVENTIVO';
    return `IDEM|PREVENTIVO_GENERAR|${maquina}|${anio}|${tipo}`;
  }
  
  if (cleanCode === 'FALLA_REPORTADA') {
    const maquina = payload.maquina_id || 'ANY';
    const falla = (payload.falla_descripcion || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const hash = await computeHash(falla);
    return `IDEM|FALLA_REPORTADA|${maquina}|${hash.substring(0, 16)}`;
  }
  
  if (cleanCode === 'OT_CERRADA') {
    const folio = payload.folio_ot || 'ANY';
    return `IDEM|OT_CERRADA|${folio}`;
  }

  // Fallback genérico: ordenar llaves y hashear el payload completo
  const sortedKeys = Object.keys(payload).sort();
  const sortedObj: Record<string, any> = {};
  for (const k of sortedKeys) {
    sortedObj[k] = payload[k];
  }
  
  const payloadStr = JSON.stringify(sortedObj);
  const payloadHash = await computeHash(payloadStr);
  
  return `IDEM|GENERIC|${cleanCode}|${payloadHash.substring(0, 20)}`;
}

/**
 * Verifica si ya existe una ejecución para la clave de idempotencia
 */
export async function checkIdempotency(
  supabase: SupabaseClient,
  idempotencyKey: string
): Promise<{ exists: boolean; status: string | null; result: any | null }> {
  try {
    const { data, error } = await supabase
      .from('eventos_agente')
      .select('estatus, id_evento')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (error) {
      console.error('[Idempotency] Error querying DB:', error.message);
      return { exists: false, status: null, result: null };
    }

    if (data) {
      // Buscar si tiene algún resultado registrado en bitacora_ejecuciones_agente
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
    console.error('[Idempotency] Exception checking DB:', err);
    return { exists: false, status: null, result: null };
  }
}
