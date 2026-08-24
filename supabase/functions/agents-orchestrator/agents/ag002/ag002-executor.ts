// supabase/functions/agents-orchestrator/agents/ag002/ag002-executor.ts
// Unified Specialist Executor for AG-002 — Preventivo Anual (PRD-AG002-R2.1.2)
// Invariants: Single entry point (AG002_entrypoint_count = 1), 0 LLM Tokens, Dynamic Machine Universe

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DeterministicPreventiveEngine } from './core/preventive-engine.ts';
import { HistoricalCollectorInput, AnnualCalendarProposal } from './types/ag002.types.ts';

export async function executeAG002AnnualPreventive(
  supabase: SupabaseClient | null,
  payload: Record<string, any>,
  correlationId: string
): Promise<AnnualCalendarProposal> {
  const targetYear = payload.target_year || payload.anio || new Date().getUTCFullYear();
  const generationDate = payload.generation_date || payload.reference_date || new Date().toISOString().split('T')[0];

  let rawMachines: any[] = payload.machines || [];
  let rawFaults: any[] = payload.faults || [];
  let rawTelegram: any[] = payload.telegram_events || [];
  let rawWorkOrders: any[] = payload.work_orders || [];
  let rawParts: any[] = payload.parts || [];
  let rawPartsByMachine: any[] = payload.parts_by_machine || [];
  let rawServices: any[] = payload.services || [];
  let rawCriticalities: any[] = payload.criticalities || [];

  // If Supabase client is available and collections are not supplied, load from DB
  if (supabase) {
    if (rawMachines.length === 0) {
      const { data: macData } = await supabase
        .from('cat_maquinas')
        .select('*');
      if (macData) {
        rawMachines = macData;
      }
    }

    if (rawWorkOrders.length === 0) {
      const { data: otData } = await supabase
        .from('ordenes_trabajo')
        .select('*')
        .limit(2000);
      if (otData) {
        rawWorkOrders = otData;
      }
    }

    if (rawParts.length === 0) {
      const { data: pData } = await supabase
        .from('cat_refacciones')
        .select('*')
        .limit(5000);
      if (pData) {
        rawParts = pData;
      }
    }

    if (rawPartsByMachine.length === 0) {
      const { data: pbmData } = await supabase
        .from('refacciones_por_maquina')
        .select('*')
        .limit(5000);
      if (pbmData) {
        rawPartsByMachine = pbmData;
      }
    }
  }

  // Normalize machine list into engine input
  const normalizedMachines = rawMachines.map((m: any) => {
    const machId = m.maquina_id || m.equipo_towell || m.clave || m.id_maquina;
    let dept = (m.departamento_codigo || m.area || 'PF').toUpperCase();
    if (machId.startsWith('CF') || machId.includes('COST')) dept = 'CF';
    else if (machId.startsWith('TF') || machId.includes('TINT')) dept = 'TF';
    else if (machId.startsWith('AF') || machId.includes('PLANTA')) dept = 'AF';

    return {
      maquina_id: machId,
      clave: m.clave || machId,
      departamento_codigo: dept,
      activo: m.activo !== false,
      criticidad: m.criticidad || (dept === 'PF' ? 'Alta' : 'Media')
    };
  });

  const collectorInput: HistoricalCollectorInput = {
    correlation_id: correlationId,
    target_year: targetYear,
    generation_date: generationDate,
    machines: normalizedMachines,
    faults: rawFaults,
    telegram_events: rawTelegram,
    work_orders: rawWorkOrders,
    parts: rawParts,
    parts_by_machine: rawPartsByMachine,
    services: rawServices,
    criticalities: rawCriticalities
  };

  return DeterministicPreventiveEngine.execute(collectorInput);
}
