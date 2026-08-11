// supabase/functions/agents-orchestrator/core/router.ts

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RouteResult {
  es_conocido: boolean;
  agent_id: string | null;
  required_fields: string[];
  activo: boolean;
}

/**
 * Resuelve la ruta del agente destino de forma determinista consultando cat_eventos_agente y cat_agentes
 */
export async function resolveAgentRoute(
  supabase: SupabaseClient,
  eventCode: string
): Promise<RouteResult> {
  try {
    const cleanCode = (eventCode || "").toUpperCase().trim();

    // 1. Buscar en cat_eventos_agente
    const { data: eventEntry, error: evErr } = await supabase
      .from('cat_eventos_agente')
      .select('agent_id_destino, es_conocido, datos_requeridos')
      .eq('event_code', cleanCode)
      .maybeSingle();

    if (evErr) {
      console.error('[Router] Error fetching cat_eventos_agente:', evErr.message);
      return { es_conocido: false, agent_id: null, required_fields: [], activo: false };
    }

    if (!eventEntry) {
      // Evento no catalogado en base de datos -> requiere clasificación por IA (AG-001 Capataz)
      return {
        es_conocido: false,
        agent_id: 'AG-001', // Clasificador / Capataz
        required_fields: [],
        activo: true
      };
    }

    // 2. Verificar el estatus del agente de destino en cat_agentes
    const { data: agentEntry, error: agErr } = await supabase
      .from('cat_agentes')
      .select('activo')
      .eq('agent_id', eventEntry.agent_id_destino)
      .maybeSingle();

    if (agErr) {
      console.error('[Router] Error fetching cat_agentes:', agErr.message);
      return { es_conocido: eventEntry.es_conocido, agent_id: eventEntry.agent_id_destino, required_fields: [], activo: false };
    }

    const requiredFields = Array.isArray(eventEntry.datos_requeridos) 
      ? eventEntry.datos_requeridos 
      : JSON.parse(eventEntry.datos_requeridos || '[]');

    return {
      es_conocido: eventEntry.es_conocido,
      agent_id: eventEntry.agent_id_destino,
      required_fields: requiredFields,
      activo: agentEntry ? agentEntry.activo : false
    };

  } catch (err) {
    console.error('[Router] Exception resolving route:', err);
    return { es_conocido: false, agent_id: null, required_fields: [], activo: false };
  }
}
