// supabase/functions/agents-orchestrator/agents/ag009/ag009_1/guards/yearly-preventive-guard.ts
// Yearly Preventive Guard (§3, §16, §17, §18, §19 PRD-AG-009.1)
// Core Rule: 1 MÁQUINA + 1 AÑO = MÁXIMO 1 PREVENTIVO

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PreventiveConnectorError } from '../errors/preventive-error-catalog.ts';

export interface ExistingPreventiveRecord {
  id_orden?: string;
  folio?: string;
  maquina_id: string;
  fecha_inicio: string;
  estatus: string;
  tipo_orden?: string;
}

export const CANCELLED_PREVENTIVE_STATUSES = ['CANCELADA', 'RECHAZADA', 'CANCELADO', 'RECHAZADO'];

export async function validateYearlyPreventiveGuard(
  supabase: SupabaseClient | null,
  machineId: string,
  year: number,
  localOrders?: ExistingPreventiveRecord[]
): Promise<{ canCreate: boolean; existingFolio?: string }> {
  const normId = machineId.trim().toUpperCase();

  let existingOrders: ExistingPreventiveRecord[] = [];

  // 1. Consultar Supabase
  if (supabase) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data, error } = await supabase
      .from('ordenes_trabajo')
      .select('id_orden, folio, maquina_id, fecha_inicio, estatus, tipo_orden')
      .eq('maquina_id', normId)
      .or(`tipo_orden.eq.Preventivo,orden_trabajo.ilike.%preventiv%`)
      .gte('fecha_inicio', startDate)
      .lte('fecha_inicio', endDate);

    if (!error && data) {
      existingOrders = data;
    }
  }

  // 2. Fallback a órdenes locales
  if (existingOrders.length === 0 && localOrders) {
    existingOrders = localOrders.filter(o => {
      if (!o || o.maquina_id.toUpperCase() !== normId) return false;
      const oYear = new Date(o.fecha_inicio).getUTCFullYear();
      const isPreventive = (o.tipo_orden && o.tipo_orden.toLowerCase().includes('preventiv')) || true;
      return oYear === year && isPreventive;
    });
  }

  // 3. Evaluar duplicidad activa (§19 PRD)
  const activeDuplicate = existingOrders.find(o => {
    const st = String(o.estatus || '').trim().toUpperCase();
    return !CANCELLED_PREVENTIVE_STATUSES.includes(st);
  });

  if (activeDuplicate) {
    throw new PreventiveConnectorError(
      'PREVENTIVE_YEARLY_DUPLICATE',
      `La máquina "${normId}" ya cuenta con una Orden Preventiva activa o ejecutada (${activeDuplicate.folio || activeDuplicate.id_orden || 'Existente'}) para el año ${year}. Regla 1 máquina = máx 1 preventivo/año.`,
      {
        machine_id: normId,
        year,
        existing_folio: activeDuplicate.folio,
        existing_status: activeDuplicate.estatus
      }
    );
  }

  return {
    canCreate: true
  };
}
