// supabase/functions/agents-orchestrator/agents/ag003/ag003-executor.ts
// Specialist Edge Function Executor for AG-003 — Predictivo Semanal por Segundas (PRD-AG003-R2)

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { RawQualityRow, WeeklyPredictiveContract } from './types/ag003.types.ts';
import { runDeterministicWeeklyPredictiveEngine } from './core/weekly-predictive-engine.ts';

export async function executeAG003WeeklyPredictive(
  supabase: SupabaseClient | null,
  payload: Record<string, any>,
  correlationId: string
): Promise<WeeklyPredictiveContract> {
  const uploadDate = payload.upload_date || payload.referenceDate || new Date().toISOString().split('T')[0];
  const sourceIngestionId = payload.id_carga || payload.source_ingestion_id;

  let qualityRows: RawQualityRow[] = payload.quality_rows || payload.qualityRows || [];
  let machines: Array<{ equipo_towell?: string; machine_id?: string; area?: string; departamento_codigo?: string; activo?: boolean }> = payload.machines || [];

  // 1. Fetch data from Supabase if not directly injected in payload
  if (supabase) {
    if (qualityRows.length === 0) {
      try {
        let query = supabase.from('segundas_por_rollo').select('*');
        if (sourceIngestionId) {
          query = query.eq('id_carga', sourceIngestionId);
        } else {
          query = query.order('fecha', { ascending: false }).limit(2500);
        }
        const { data: dbRows, error: dbErr } = await query;
        if (!dbErr && dbRows) {
          qualityRows = dbRows;
        }
      } catch (err) {
        console.warn('[AG-003 Executor] Warning fetching segundas_por_rollo from DB:', err);
      }
    }

    if (machines.length === 0) {
      try {
        const { data: dbMachines, error: mErr } = await supabase
          .from('cat_maquinas')
          .select('equipo_towell, clave, departamento_codigo, area');
        if (!mErr && dbMachines) {
          machines = dbMachines.map(m => ({ ...m, activo: true }));
        }
      } catch (mErr) {
        console.warn('[AG-003 Executor] Warning fetching cat_maquinas from DB:', mErr);
      }
    }
  }

  // 2. Execute deterministic engine
  const contractResult: WeeklyPredictiveContract = runDeterministicWeeklyPredictiveEngine({
    uploadDate,
    sourceIngestionId,
    machines,
    qualityRows,
    correlationId,
    featureFlagEnabled: true
  });

  // 3. Persist into calendario_mantenimiento_detalle (Idempotent)
  if (supabase && contractResult.scheduled_items.length > 0) {
    try {
      const cycleId = contractResult.cycle_id;
      
      // Ensure header exists in calendarios_mantenimiento
      let calId: string | null = null;
      const { data: existingCal } = await supabase
        .from('calendarios_mantenimiento')
        .select('id_calendario')
        .eq('tipo_calendario', 'PREDICTIVO')
        .eq('fecha_inicio_periodo', contractResult.cycle_start)
        .maybeSingle();

      if (existingCal) {
        calId = existingCal.id_calendario;
      } else {
        const { data: newCal, error: calErr } = await supabase
          .from('calendarios_mantenimiento')
          .insert([{
            tipo_calendario: 'PREDICTIVO',
            anio: parseInt(contractResult.cycle_start.split('-')[0], 10),
            mes: parseInt(contractResult.cycle_start.split('-')[1], 10),
            fecha_inicio_periodo: contractResult.cycle_start,
            fecha_fin_periodo: contractResult.cycle_end,
            estatus_calendario: 'PROPUESTO',
            generado_por: 'AG-003 Predictivo Semanal',
            origen_generacion: 'IA Engine'
          }])
          .select('id_calendario')
          .single();
        if (!calErr && newCal) {
          calId = newCal.id_calendario;
        }
      }

      // Idempotency cleanup for this exact weekly cycle & selected machines
      await supabase
        .from('calendario_mantenimiento_detalle')
        .delete()
        .eq('tipo_mantenimiento', 'PREDICTIVO')
        .in('maquina_id', contractResult.scheduled_items.map(i => i.machine_identifier));

      const toInsert = contractResult.scheduled_items.map(item => ({
        id_calendario: calId,
        tipo_mantenimiento: 'PREDICTIVO',
        maquina_id: item.machine_identifier,
        fecha_programada: item.scheduled_date,
        actividad_sugerida: `${item.activity_name}: ${item.machine_identifier} (PF)`,
        prioridad: item.rank === 1 ? 'Crítica' : item.rank === 2 ? 'Alta' : 'Media',
        score_riesgo: item.segundas_percentage,
        estatus_detalle: 'PROPUESTO',
        observaciones: JSON.stringify({
          origen: 'AG-003_PREDICTIVO_SEMANAL',
          area: 'PF',
          fuente_datos: 'segundas_por_rollo',
          ciclo_id: cycleId,
          ciclo_inicio: item.cycle_start,
          ciclo_fin: item.cycle_end,
          dia_semana: item.day_of_week_name,
          ranking_prioridad: item.rank,
          porcentaje_segundas: item.segundas_percentage,
          total_segundas: item.total_segundas,
          total_piezas: item.total_pzas,
          id_carga: item.source_ingestion_id || null,
          correlation_id: correlationId
        })
      }));

      const { error: insertErr } = await supabase
        .from('calendario_mantenimiento_detalle')
        .insert(toInsert);

      if (insertErr) {
        console.warn('[AG-003 Executor] Non-fatal error persisting to calendario_mantenimiento_detalle:', insertErr);
      }
    } catch (persistErr) {
      console.warn('[AG-003 Executor] Persistence error:', persistErr);
    }
  }

  return contractResult;
}
