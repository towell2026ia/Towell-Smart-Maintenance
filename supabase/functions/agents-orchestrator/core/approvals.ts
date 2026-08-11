// supabase/functions/agents-orchestrator/core/approvals.ts

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AgentApproval } from '../types/agents.types.ts';

/**
 * Inserta una propuesta de acción de Nivel 2 en la cola de aprobación de Supabase
 */
export async function createApprovalRequest(
  supabase: SupabaseClient,
  approval: Omit<AgentApproval, 'id_aprobacion' | 'estatus' | 'fecha_creacion'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const dbRow = {
      correlation_id: approval.correlation_id,
      event_id: approval.event_id,
      agent_id: approval.agent_id,
      tipo_accion: approval.tipo_accion,
      propuesta_payload: approval.propuesta_payload,
      estatus: 'PENDIENTE_APROBACION'
    };

    const { data, error } = await supabase
      .from('aprobaciones_agente')
      .insert([dbRow])
      .select('id_aprobacion')
      .single();

    if (error) {
      console.error('[Approvals] Error inserting approval request:', error.message);
      return { success: false, error: error.message };
    }

    // Actualizar el estado del evento origen a 'REQUIERE_APROBACION'
    await supabase
      .from('eventos_agente')
      .update({ estatus: 'REQUIERE_APROBACION', fecha_actualizacion: new Date().toISOString() })
      .eq('id_evento', approval.event_id);

    return { success: true, id: data.id_aprobacion };
  } catch (err: any) {
    console.error('[Approvals] Exception in createApprovalRequest:', err);
    return { success: false, error: err.message };
  }
}
