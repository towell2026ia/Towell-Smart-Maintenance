// supabase/functions/agents-orchestrator/agents/ag008/ag008-executor.ts
// Specialist Edge Function Executor for AG-008 — Detector de Reincidencias y Análisis de Fallas (PRD-AG008-R1)
// Invariants: Single entry point, multi-source ingestion (fallas_por_maquina, bitacora, OTs), deterministic risk categorization

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { FailureEngine, RawFailureInput, FailureAnalysisOptions, ConsolidatedFailureAnalysis } from './core/failure-engine.ts';

export async function executeAG008FailureAnalysis(
  supabase: SupabaseClient | null,
  payload: Record<string, any>,
  correlationId: string
): Promise<ConsolidatedFailureAnalysis> {
  const scope = payload.scope || 'PLANT_WIDE';
  const targetId = payload.target_id || payload.maquina_id || null;
  const periodGranularity = payload.period_granularity || 'DAY';
  const daysWindow = payload.days_window || 90;

  let rawFailures: RawFailureInput[] = payload.raw_failures || payload.failures || [];

  // 1. Fetch failure records from Supabase if not directly passed
  if (supabase && rawFailures.length === 0) {
    try {
      // Query fallas_por_maquina
      let query = supabase
        .from('fallas_por_maquina')
        .select('*')
        .order('fecha_creada', { ascending: false })
        .limit(2000);

      if (targetId) {
        query = query.eq('maquina_id', targetId);
      }

      const { data: dbFailures, error: fErr } = await query;
      if (!fErr && dbFailures) {
        rawFailures = dbFailures.map(f => ({
          id: f.id_falla,
          source_type: (f.origen || 'EXCEL_HISTORICO') as any,
          source_table: 'fallas_por_maquina',
          maquina_id: f.maquina_id,
          depto: f.area,
          descripcion: f.descripcion_falla || f.falla,
          fecha: f.fecha_creada || f.fecha_hora_creada,
          categoria_falla: f.categoria_falla,
          es_recurrente: f.es_recurrente
        }));
      }

      // Query ordenes_trabajo to ingest live OTs alongside historical failures
      let otQuery = supabase
        .from('ordenes_trabajo')
        .select('*')
        .order('fecha_carga', { ascending: false })
        .limit(500);

      if (targetId) {
        otQuery = otQuery.eq('maquina_id', targetId);
      }

      const { data: dbOts, error: otErr } = await otQuery;
      if (!otErr && dbOts) {
        const otFailures = dbOts.map(o => ({
          id: o.folio || o.id_orden,
          source_type: 'OT_HISTORICA' as any,
          source_table: 'ordenes_trabajo',
          maquina_id: o.maquina_id,
          depto: o.area || o.departamento,
          descripcion: o.descripcion || o.falla || 'Intervención en OT',
          fecha: o.fecha_inicio || o.fecha_carga,
          categoria_falla: o.falla || 'Mecánica',
          es_recurrente: o.es_reincidente || false
        })).filter(f => f.maquina_id);
        rawFailures = [...rawFailures, ...otFailures];
      }
    } catch (err) {
      console.warn('[AG-008 Executor] Warning fetching fallas and OTs:', err);
    }
  }

  // 2. Execute deterministic failure engine
  const analysisOptions: FailureAnalysisOptions = {
    scope: scope as any,
    targetId,
    periodGranularity: periodGranularity as any
  };

  const analysis = FailureEngine.analyzeFailures(rawFailures, analysisOptions);

  // 3. Persist top recurrence & reincidence insights into analisis_repetibilidad_fallas & recomendaciones_ia
  if (supabase && analysis.recurrence_groups && analysis.recurrence_groups.length > 0) {
    try {
      const topRecurrences = analysis.recurrence_groups.slice(0, 50);

      // Insert/update into analisis_repetibilidad_fallas
      const recordsToUpsert = topRecurrences.map(rg => {
        const severity = rg.severity || (rg.count > 5 ? 'CRITICA' : rg.count > 2 ? 'ALTA' : 'MEDIA');
        return {
          maquina_id: rg.machine_id,
          tipo_falla_id: rg.fault_code || null,
          categoria_falla: rg.category || 'General',
          descripcion_falla: rg.sample_description || `Falla recurrente en ${rg.machine_id}`,
          cantidad_repeticiones: rg.count,
          periodo_dias: daysWindow,
          fecha_primera_falla: rg.first_occurrence || null,
          fecha_ultima_falla: rg.last_occurrence || null,
          nivel_riesgo: severity,
          recomendacion: `AG-008 detectó ${rg.count} repeticiones. Se recomienda inspección focalizada de subsistema.`,
          origen: 'AG-008 Engine',
          fecha_analisis: new Date().toISOString()
        };
      });

      await supabase
        .from('analisis_repetibilidad_fallas')
        .insert(recordsToUpsert);

      // Generate AI Recommendations for high/critical recurrence machines
      const criticalRecurrences = topRecurrences.filter(rg => rg.count >= 3);
      if (criticalRecurrences.length > 0) {
        const recommendationsToInsert = criticalRecurrences.slice(0, 10).map(cr => ({
          maquina_id: cr.machine_id,
          tipo_recomendacion: 'PREVENCION_REINCIDENCIA',
          titulo_recomendacion: `⚡ Alerta de Reincidencia Crítica: ${cr.machine_id}`,
          mensaje_recomendacion: `La máquina ${cr.machine_id} presenta ${cr.count} eventos recurrentes de '${cr.category || 'Falla'}'. Se recomienda revisión inmediata de causa raíz con AG-010.`,
          nivel_confianza: Math.min(98, 70 + cr.count * 5),
          prioridad: cr.count > 5 ? 'Crítica' : 'Alta',
          estatus_recomendacion: 'pendiente',
          generado_por: 'AG-008',
          fecha_generacion: new Date().toISOString()
        }));

        await supabase
          .from('recomendaciones_ia')
          .insert(recommendationsToInsert);
      }
    } catch (persistErr) {
      console.warn('[AG-008 Executor] Warning persisting failure analysis:', persistErr);
    }
  }

  return analysis;
}
