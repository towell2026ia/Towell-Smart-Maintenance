// supabase/functions/agents-orchestrator/agents/ag007/ag007-executor.ts
// Unified Specialist Executor for AG-007 — Presupuestos y Costos (PRD-AG007-R1.3.4)

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
  const budgetScope = payload.budget_scope || 'CURRENT_PERIOD';
  const targetYear = payload.target_year || parseInt(String(referenceDate).substring(0, 4), 10) || 2026;

  let activeMachines: ActiveMachineItem[] = payload.active_machines || [];
  let scheduleItems: PreventiveScheduleItemInput[] = payload.preventive_schedule_items || [];
  let priceCatalog: PartPriceCatalogItem[] = payload.price_catalog || [];

  // If Supabase client is available and payload didn't supply full collections, load from DB (Read-Only)
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
      let allParts: PartPriceCatalogItem[] = [];
      let page = 0;
      while (true) {
        const { data: partData } = await supabase
          .from('cat_refacciones')
          .select('codigo_articulo, nombre_articulo, costo_unitario, moneda')
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (!partData || partData.length === 0) break;
        allParts.push(...partData);
        page++;
      }

      // Merge prices from refacciones_por_maquina
      const { data: rpmData } = await supabase
        .from('refacciones_por_maquina')
        .select('codigo_articulo, nombre_articulo, precio_costo_unitario, maquina_id');
      if (rpmData) {
        for (const r of rpmData) {
          if (r.precio_costo_unitario && parseFloat(r.precio_costo_unitario) > 0) {
            allParts.push({
              codigo_articulo: r.codigo_articulo,
              nombre_articulo: r.nombre_articulo,
              costo_unitario: parseFloat(r.precio_costo_unitario),
              precio_costo_unitario: parseFloat(r.precio_costo_unitario)
            });
          }
        }
      }

      priceCatalog = allParts;
    }

    if (scheduleItems.length === 0) {
      // 1. Load scheduled items from calendar detail
      const { data: calDetails } = await supabase
        .from('calendario_mantenimiento_detalle')
        .select('id_detalle, maquina_id, fecha_programada, tipo_mantenimiento, actividad_sugerida, observaciones, estatus_detalle, fecha_alta')
        .eq('tipo_mantenimiento', 'PREVENTIVO');
      
      const loadedSchedule: PreventiveScheduleItemInput[] = [];

      if (calDetails) {
        for (const d of calDetails) {
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
            quantity_source: p.quantity_source || 'SERVICE_DEFAULT',
            reference_unit_price: typeof p.reference_unit_price === 'number' ? p.reference_unit_price : undefined
          }));

          const srcType = (d.estatus_detalle === 'PROGRAMADO' || d.estatus_detalle === 'VALIDADO')
            ? 'VALID_SCHEDULED'
            : 'NEWLY_SCHEDULED';

          loadedSchedule.push({
            preventive_id: d.id_detalle,
            asset_id: d.maquina_id,
            area_code: obsObj.area || 'PF',
            scheduled_date: d.fecha_programada,
            service_code: obsObj.service_code || 'SRV-PREV-01',
            service_name: d.actividad_sugerida || 'Mantenimiento Preventivo',
            calendar_year: parseInt(String(d.fecha_programada).substring(0, 4), 10) || targetYear,
            planned_parts: parts,
            source_type: srcType,
            created_at: d.fecha_alta
          });
        }
      }

      // 2. In ANNUAL_MONTHLY mode, load completed real preventives from historical work orders (FC-002, AC-001)
      if (budgetScope === 'ANNUAL_MONTHLY') {
        const { data: closedOTs } = await supabase
          .from('ordenes_trabajo')
          .select('id_orden, no_ot, maquina_id, area, tipo_mantenimiento, fecha_solicitud, fecha_cierre, estatus, descripcion, costo_estimado_refacciones')
          .eq('tipo_mantenimiento', 'PREVENTIVO')
          .in('estatus', ['CERRADA', 'VALIDADA', 'REALIZADA']);

        if (closedOTs) {
          for (const ot of closedOTs) {
            const dateStr = ot.fecha_cierre || ot.fecha_solicitud || '';
            const otYear = parseInt(String(dateStr).substring(0, 4), 10);
            if (otYear === targetYear) {
              loadedSchedule.push({
                preventive_id: ot.id_orden || ot.no_ot,
                asset_id: ot.maquina_id,
                area_code: ot.area || 'PF',
                scheduled_date: dateStr.substring(0, 10),
                service_code: 'SRV-PREV-HIST',
                service_name: ot.descripcion || 'Preventivo Realizado Histórico',
                calendar_year: otYear,
                planned_parts: [],
                source_type: 'COMPLETED_REAL',
                ot_reference: ot.no_ot
              });
            }
          }
        }
      }

      scheduleItems = loadedSchedule;
    }
  }

  const engineInput: PreventiveBudgetEngineInput = {
    reference_date: referenceDate,
    budget_scope: budgetScope,
    target_year: targetYear,
    active_machines: activeMachines,
    preventive_schedule_items: scheduleItems,
    price_catalog: priceCatalog,
    correlation_id: correlationId,
    budget_run_id: payload.budget_run_id
  };

  return calculatePreventiveMaterialBudget(engineInput);
}

