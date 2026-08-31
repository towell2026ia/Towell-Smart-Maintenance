// supabase/functions/agents-orchestrator/agents/ag004/ag004-executor.ts
// Specialist Edge Function Executor for AG-004 — Autónomo Semanal (PRD-AG004-R1)
// Invariants: Single entry point, Mon-Fri operational balance, max 15 assets/week, 0 LLM tokens (deterministic)

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AutonomousEngine, AutonomousEngineInput, AutonomousEngineOutput } from './core/autonomous-engine.ts';
import { MachineRecord, HistoricalFaultRecord, ExistingScheduleRecord } from './types/ag004.types.ts';

export async function executeAG004WeeklyAutonomous(
  supabase: SupabaseClient | null,
  payload: Record<string, any>,
  correlationId: string
): Promise<AutonomousEngineOutput> {
  const targetWeekKey = payload.target_week_key || payload.week_key || payload.targetWeekKey;
  const referenceDate = payload.reference_date || payload.referenceDate || payload.target_date || new Date();

  let machines: MachineRecord[] = payload.machines || [];
  let faults: HistoricalFaultRecord[] = payload.faults || [];
  let existingSchedules: ExistingScheduleRecord[] = payload.existing_schedules || [];

  // 1. Fetch data from Supabase if not directly injected in payload
  if (supabase) {
    if (machines.length === 0) {
      try {
        const { data: dbMachines, error: mErr } = await supabase
          .from('cat_maquinas')
          .select('*')
          .eq('activo', true);
        if (!mErr && dbMachines) {
          machines = dbMachines.map(m => ({
            id_maquina: m.id_maquina || m.equipo_towell,
            equipo_towell: m.equipo_towell || m.clave || m.id_maquina,
            nombre: m.nombre || m.nombre_maquina,
            area: m.area || m.departamento_codigo || 'PF',
            departamento_codigo: m.departamento_codigo || m.area || 'PF',
            tipo_maquina: m.tipo_maquina,
            activo: m.activo !== false,
            nivel_criticidad: m.criticidad || m.nivel_criticidad || 'MEDIA'
          }));
        }
      } catch (err) {
        console.warn('[AG-004 Executor] Warning fetching cat_maquinas:', err);
      }
    }

    if (faults.length === 0) {
      try {
        const { data: dbFaults, error: fErr } = await supabase
          .from('fallas_por_maquina')
          .select('*')
          .order('fecha_creada', { ascending: false })
          .limit(1000);
        if (!fErr && dbFaults) {
          faults = dbFaults.map(f => ({
            id_falla: f.id_falla,
            maquina_id: f.maquina_id,
            descripcion_falla: f.descripcion_falla || f.falla,
            falla: f.falla || f.descripcion_falla,
            fecha_creada: f.fecha_creada || f.fecha_hora_creada,
            fecha: f.fecha_creada,
            origen: f.origen,
            categoria_falla: f.categoria_falla,
            es_recurrente: f.es_recurrente
          }));
        }
      } catch (err) {
        console.warn('[AG-004 Executor] Warning fetching fallas_por_maquina:', err);
      }
    }

    if (existingSchedules.length === 0) {
      try {
        const { data: dbSched, error: sErr } = await supabase
          .from('calendario_mantenimiento_detalle')
          .select('id_detalle, maquina_id, fecha_programada, tipo_mantenimiento')
          .eq('tipo_mantenimiento', 'AUTONOMO');
        if (!sErr && dbSched) {
          existingSchedules = dbSched.map(s => ({
            id_detalle: s.id_detalle,
            maquina_id: s.maquina_id,
            fecha_programada: s.fecha_programada,
            tipo_mantenimiento: 'AUTONOMO'
          }));
        }
      } catch (err) {
        console.warn('[AG-004 Executor] Warning fetching existing schedules:', err);
      }
    }
  }

  // 2. Execute deterministic engine
  const engineInput: AutonomousEngineInput = {
    targetWeekKey,
    referenceDate,
    machines,
    faults,
    existingSchedules,
    correlationId,
    eventId: payload.event_id || correlationId
  };

  const output = AutonomousEngine.runWeeklyGeneration(engineInput);

  // 3. Persist into calendarios_mantenimiento and calendario_mantenimiento_detalle
  if (supabase && output.scheduledItems && output.scheduledItems.length > 0) {
    try {
      let calId = null;
      const { data: existingCal } = await supabase
        .from('calendarios_mantenimiento')
        .select('id_calendario')
        .eq('tipo_calendario', 'AUTONOMO')
        .eq('fecha_inicio_periodo', output.startDate)
        .maybeSingle();

      if (existingCal) {
        calId = existingCal.id_calendario;
      } else {
        const { data: newCal, error: calErr } = await supabase
          .from('calendarios_mantenimiento')
          .insert([{
            tipo_calendario: 'AUTONOMO',
            anio: output.isoYear,
            semana: output.isoWeek,
            fecha_inicio_periodo: output.startDate,
            fecha_fin_periodo: output.endDate,
            estatus_calendario: 'PROPUESTO',
            generado_por: 'AG-004 Autónomo Semanal',
            origen_generacion: 'IA Engine'
          }])
          .select('id_calendario')
          .single();

        if (!calErr && newCal) {
          calId = newCal.id_calendario;
        }
      }

      // Cleanup old proposal items for this cycle and insert new ones
      if (calId) {
        await supabase
          .from('calendario_mantenimiento_detalle')
          .delete()
          .eq('id_calendario', calId);

        const detailsToInsert = output.scheduledItems.map(item => ({
          id_calendario: calId,
          maquina_id: item.machine_id,
          fecha_programada: item.scheduled_date,
          tipo_mantenimiento: 'AUTONOMO',
          prioridad: item.priority || 'MEDIA',
          actividad_sugerida: `Rutina Autónoma Semanal (${output.targetWeek}): ${item.machine_id} - ${item.department}`,
          responsable_sugerido: item.assigned_operator || 'Operador de Línea',
          observaciones: JSON.stringify({
            origen: 'AG-004_AUTONOMO_SEMANAL',
            department: item.department,
            day_of_week: item.day_of_week,
            survey_blocks: item.survey_blocks || ['Limpieza', 'Inspección', 'Lubricación'],
            target_week: output.targetWeek
          }),
          estatus_detalle: 'PROPUESTO'
        }));

        await supabase
          .from('calendario_mantenimiento_detalle')
          .insert(detailsToInsert);
      }
    } catch (persistErr) {
      console.warn('[AG-004 Executor] Warning persisting autonomous schedule:', persistErr);
    }
  }

  return output;
}
