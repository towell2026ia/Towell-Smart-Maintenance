// supabase/functions/agents-orchestrator/agents/ag009/ag009_1/linkage/calendar-ot-link.ts
// Calendar ↔ OT Bidirectional Linkage Engine (§41, §42 PRD-AG-009.1)

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PreventiveOTDraft } from '../builders/preventive-ot-builder.ts';

export interface CalendarOTLinkResult {
  linked: boolean;
  ot_id: string;
  folio: string;
  calendar_reference: string;
  id_plan?: string;
  audit_logged: boolean;
}

export async function linkCalendarToWorkOrder(
  supabase: SupabaseClient | null,
  draft: PreventiveOTDraft,
  createdOt: { id_orden: string; folio: string }
): Promise<CalendarOTLinkResult> {
  let auditLogged = false;

  // 1. Si Supabase está conectado, actualizar planes_mantenimiento_preventivo si calendar_reference es un UUID
  if (supabase && draft.calendar_reference) {
    try {
      // Intentar actualizar la última ejecución en el plan preventivo si calendar_reference coincide con un id_plan
      await supabase
        .from('planes_mantenimiento_preventivo')
        .update({
          ultima_ejecucion: draft.fecha_inicio,
          fecha_actualizacion: new Date().toISOString()
        })
        .or(`id_plan.eq.${draft.calendar_reference},maquina_id.eq.${draft.maquina_id}`);

      // Registrar evento en bitacora_orden_trabajo
      await supabase
        .from('bitacora_orden_trabajo')
        .insert([{
          id_orden: createdOt.id_orden,
          estatus_anterior: null,
          estatus_nuevo: 'Abierta',
          usuario_evento: 'AG-009.1 (Conector Preventivo)',
          rol_usuario: 'AGENTE_INTEGRACION',
          tipo_evento: 'Creación Preventivo',
          comentario: `OT preventiva creada desde calendario ${draft.calendar_reference}. Checklist ${draft.checklist_reference}.`,
          origen: 'AG-009.1'
        }]);

      auditLogged = true;
    } catch (err) {
      console.warn('[CalendarOTLink] Warning updating calendar linkage:', err);
    }
  }

  return {
    linked: true,
    ot_id: createdOt.id_orden,
    folio: createdOt.folio,
    calendar_reference: draft.calendar_reference,
    audit_logged: auditLogged
  };
}
