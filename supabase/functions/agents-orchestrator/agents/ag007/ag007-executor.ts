// supabase/functions/agents-orchestrator/agents/ag007/ag007-executor.ts
// Unified Specialist Executor for AG-007 — Presupuestos y Costos (PRD-AG007-R1)

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calculatePreventiveMaterialBudget } from './calculators/preventive-material-budget-engine.ts';
import type { 
  PreventiveBudgetEngineInput, 
  PreventiveBudgetEngineOutput,
  PreventiveScheduleItemInput,
  PartPriceCatalogItem,
  ActiveMachineItem
} from './contracts/ag007-preventive-budget.contract.ts';

export async function executeAG007PreventiveBudget(
  supabase: SupabaseClient | null,
  payload: Record<string, any>,
  correlationId: string
): Promise<PreventiveBudgetEngineOutput> {
  const referenceDate = payload.reference_date || new Date().toISOString().split('T')[0];

  let activeMachines: ActiveMachineItem[] = payload.active_machines || [];
  let scheduleItems: PreventiveScheduleItemInput[] = payload.preventive_schedule_items || [];
  let priceCatalog: PartPriceCatalogItem[] = payload.price_catalog || [];

  // If Supabase client is available and payload didn't supply full collections, load from DB
  if (supabase) {
    if (activeMachines.length === 0) {
      const { data: macData } = await supabase
        .from('cat_maquinas')
        .select('id_maquina, equipo_towell, area, departamento_codigo, activo');
      if (macData) {
        activeMachines = macData;
      }
    }

    if (priceCatalog.length === 0) {
      const { data: partData } = await supabase
        .from('cat_refacciones')
        .select('codigo_articulo, nombre_articulo, costo_unitario, moneda');
      if (partData) {
        priceCatalog = partData;
      }
    }

    if (scheduleItems.length === 0) {
      const { data: calDetails } = await supabase
        .from('calendario_mantenimiento_detalle')
        .select('id_detalle, maquina_id, fecha_programada, tipo_mantenimiento, actividad_sugerida, observaciones')
        .eq('tipo_mantenimiento', 'PREVENTIVO');
      
      if (calDetails) {
        scheduleItems = calDetails.map(d => {
          let obsObj: any = {};
          if (d.observaciones) {
            try {
              obsObj = typeof d.observaciones === 'object' ? d.observaciones : JSON.parse(d.observaciones);
            } catch (_) {}
          }

          const parts = (obsObj.planned_parts || []).map((p: any) => ({
            part_id: p.part_id,
            part_code: p.part_code || p.cve_refaccion || p.codigo_articulo,
            part_name: p.part_name || p.nombre || p.codigo_articulo,
            planned_quantity: typeof p.planned_quantity === 'number' ? p.planned_quantity : (typeof p.cantidad === 'number' ? p.cantidad : 1),
            unit_of_measure: p.unit_of_measure || p.unidad_medida || 'PZA',
            quantity_source: p.quantity_source || 'SERVICE_DEFAULT'
          }));

          return {
            preventive_id: d.id_detalle,
            asset_id: d.maquina_id,
            area_code: obsObj.area || 'PF',
            scheduled_date: d.fecha_programada,
            service_code: obsObj.service_code || 'SRV-PREV-01',
            service_name: d.actividad_sugerida || 'Mantenimiento Preventivo',
            calendar_year: parseInt(String(d.fecha_programada).substring(0, 4), 10) || 2026,
            planned_parts: parts
          };
        });
      }
    }
  }

  const engineInput: PreventiveBudgetEngineInput = {
    reference_date: referenceDate,
    active_machines: activeMachines,
    preventive_schedule_items: scheduleItems,
    price_catalog: priceCatalog,
    correlation_id: correlationId,
    budget_run_id: payload.budget_run_id
  };

  return calculatePreventiveMaterialBudget(engineInput);
}
