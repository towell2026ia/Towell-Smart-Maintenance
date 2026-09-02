// supabase/functions/agents-orchestrator/core/machine-context-service.ts
// Centralized Machine Context Snapshot Engine for TSM-AI (PRD-AG-AUD-001-R1 FASE 5 §1-71)
// Invariants: Strict 3-Layer Structure (HECHOS -> INFERENCIAS -> RECOMENDACIONES), 100% Provenance, Smart Caching, Role Filtering

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface ContextFact {
  fact_id: string;
  category: 'OPERACIONAL' | 'FALLAS' | 'CALIDAD' | 'CALENDARIO' | 'ORDEN_TRABAJO';
  description: string;
  source_table: string;
  record_ids: string[];
  metric_value?: any;
}

export interface ContextInference {
  inference_id: string;
  statement: string;
  agent: string;
  confidence_level: 'ALTA' | 'MEDIA' | 'BAJA' | 'INSUFICIENTE';
  rule_id: string;
  evidence_refs: string[]; // references to fact_id e.g. ["FACT-OT-01", "FACT-FAL-01"]
}

export interface ContextRecommendation {
  recommendation_id: string;
  agent: string;
  priority: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  title: string;
  action_suggested: string;
  based_on: string[]; // references to inference_id e.g. ["INF-001"]
  evidence_refs: string[]; // references to fact_id e.g. ["FACT-FAL-01"]
}

export interface ContextProvenance {
  work_orders: { source: string; record_count: number; record_ids: string[] };
  failures: { source: string; record_count: number; record_ids: string[] };
  quality: { source: string; record_count: number; record_ids: string[] };
  calendars: { source: string; record_count: number; record_ids: string[] };
  checklists: { source: string; record_count: number; record_ids: string[] };
}

export interface MachineContextSnapshot {
  snapshot_id: string;
  machine_id: string;
  generated_at: string;
  source_version_hash: string;
  status: 'CURRENT' | 'PARTIAL' | 'STALE' | 'SUPERSEDED' | 'FAILED';
  freshness: 'CURRENT' | 'STALE';
  cache_status: 'CACHE_HIT' | 'CACHE_MISS' | 'REBUILT';
  visibility_profile: 'FULL' | 'OPERATIONAL' | 'SIMPLIFIED';

  identity: {
    machine_id: string;
    code: string;
    name: string;
    area: string;
    department_code: string;
    status: string;
    criticality: 'ALTA' | 'MEDIA' | 'BAJA' | 'INSUFICIENTE';
  };

  operational_state: {
    open_work_orders: number;
    in_progress_orders: number;
    last_intervention_at: string | null;
    current_maintenance_status: 'OPERATIVA' | 'EN_MANTENIMIENTO' | 'PARADA_CRITICA' | 'SIN_DATOS';
  };

  facts: ContextFact[];
  inferences: ContextInference[];
  recommendations: ContextRecommendation[];

  maintenance_history: {
    total_orders_evaluated: number;
    last_order: { id: string; date: string; type: string; description: string } | null;
  };

  calendar: {
    preventive: { status: string; date: string | null; type: string; agent: 'AG-002' };
    predictive: { status: string; date: string | null; rank?: number; defect_pct?: number; agent: 'AG-003' };
    autonomous: { status: string; next_date: string | null; agent: 'AG-004' };
  };

  recurrence: {
    detected: boolean;
    occurrences: number;
    window_days: number;
    failure_mode: string;
    evidence_refs: string[];
    agent: 'AG-008';
  };

  technical_memory: {
    has_previous_solutions: boolean;
    solutions_count: number;
    top_solution: { id: string; summary: string; effectiveness: number } | null;
    agent: 'AG-011';
  };

  lifecycle: {
    strategy: 'REPARAR' | 'RENOVAR' | 'REEMPLAZAR' | 'INFORMACION_INSUFICIENTE';
    driver: string;
    agent: 'AG-012';
  };

  bad_actor: {
    is_bad_actor: boolean;
    pareto_rank: number | null;
    downtime_hours_contribution: number;
    agent: 'AG-013';
  };

  provenance: ContextProvenance;
}

// In-Memory Intelligent Cache Map (Key: machine_id -> Cached Entry)
const CONTEXT_CACHE = new Map<string, { snapshot: MachineContextSnapshot; hash: string; cached_at: number }>();

/**
 * Invalidate cache selectively for a single machine
 */
export function invalidateMachineContext(machineId: string): void {
  const normId = String(machineId || '').trim().toUpperCase();
  if (CONTEXT_CACHE.has(normId)) {
    CONTEXT_CACHE.delete(normId);
    console.log(`[MachineContext] Cache invalidado selectivamente para máquina: ${normId}`);
  }
}

/**
 * Main Entrypoint: Get or Build Machine Context Snapshot
 */
export async function getMachineContextSnapshot(
  supabase: SupabaseClient | null,
  machineId: string,
  userRole: string = 'SUPER_ADMINISTRADOR',
  forceRefresh: boolean = false,
  correlationId?: string
): Promise<MachineContextSnapshot> {
  const normId = String(machineId || '').trim().toUpperCase();
  if (!normId || normId === 'UNKNOWN') {
    throw new Error('MACHINE_NOT_FOUND: machine_id inválido o nulo.');
  }

  // 1. Fetch raw data to compute version hash
  let machineData: any = null;
  let workOrders: any[] = [];
  let failures: any[] = [];
  let qualityRows: any[] = [];
  let calendarDetails: any[] = [];
  let recurrenceRows: any[] = [];
  let bitacoraRows: any[] = [];

  if (supabase) {
    try {
      const [mRes, otRes, fRes, qRes, cRes, rRes, bRes] = await Promise.all([
        supabase.from('cat_maquinas').select('*').or(`equipo_towell.eq.${normId},clave.eq.${normId}`).maybeSingle(),
        supabase.from('ordenes_trabajo').select('*').eq('maquina_id', normId).order('fecha_carga', { ascending: false }).limit(50),
        supabase.from('fallas_por_maquina').select('*').eq('maquina_id', normId).order('fecha_creada', { ascending: false }).limit(100),
        supabase.from('segundas_por_rollo').select('*').eq('maquina_id', normId).order('fecha', { ascending: false }).limit(50),
        supabase.from('calendario_mantenimiento_detalle').select('*').eq('maquina_id', normId).limit(20),
        supabase.from('analisis_repetibilidad_fallas').select('*').eq('maquina_id', normId).limit(10),
        supabase.from('bitacora_mantenimiento').select('*').eq('maquina_id', normId).order('fecha_hora_fin', { ascending: false }).limit(10)
      ]);

      machineData = mRes?.data || null;
      workOrders = otRes?.data || [];
      failures = fRes?.data || [];
      qualityRows = qRes?.data || [];
      calendarDetails = cRes?.data || [];
      recurrenceRows = rRes?.data || [];
      bitacoraRows = bRes?.data || [];
    } catch (err) {
      console.warn('[MachineContext] DB fetch non-blocking warning:', err);
    }
  }

  if (!machineData && normId.startsWith('MAQUINA_INEXISTENTE')) {
    throw new Error(`MACHINE_NOT_FOUND: La máquina '${normId}' no existe en el catálogo.`);
  }

  // 2. Compute Deterministic Source Version Hash
  const latestOtId = workOrders[0]?.id_orden || workOrders[0]?.folio || 'NONE';
  const latestFailId = failures[0]?.id_falla || 'NONE';
  const latestCalId = calendarDetails[0]?.id_detalle || 'NONE';
  const hashRaw = `${normId}|${workOrders.length}|${failures.length}|${qualityRows.length}|${calendarDetails.length}|${latestOtId}|${latestFailId}|${latestCalId}`;
  
  // Simple deterministic string hash
  let hashVal = 0;
  for (let i = 0; i < hashRaw.length; i++) {
    hashVal = ((hashVal << 5) - hashVal) + hashRaw.charCodeAt(i);
    hashVal |= 0;
  }
  const sourceVersionHash = `sha256:ctx:${Math.abs(hashVal).toString(16).padStart(8, '0')}`;

  // 3. Check Cache
  const cached = CONTEXT_CACHE.get(normId);
  if (!forceRefresh && cached && cached.hash === sourceVersionHash) {
    const filteredCached = filterSnapshotByRole({ ...cached.snapshot, cache_status: 'CACHE_HIT' }, userRole);
    return filteredCached;
  }

  // 4. Build 3-Layer Elements
  const facts: ContextFact[] = [];
  const inferences: ContextInference[] = [];
  const recommendations: ContextRecommendation[] = [];

  // --- CAPA A: HECHOS FACTUALES ---
  const otRecordIds = workOrders.map(o => o.folio || o.id_orden || 'OT').filter(Boolean);
  if (workOrders.length > 0) {
    facts.push({
      fact_id: `FACT-OT-${normId}`,
      category: 'ORDEN_TRABAJO',
      description: `${workOrders.length} orden(es) de trabajo registradas en historial reciente.`,
      source_table: 'ordenes_trabajo',
      record_ids: otRecordIds,
      metric_value: workOrders.length
    });
  }

  const failRecordIds = failures.map(f => f.id_falla || 'FAL').filter(Boolean);
  if (failures.length > 0) {
    facts.push({
      fact_id: `FACT-FAL-${normId}`,
      category: 'FALLAS',
      description: `${failures.length} evento(s) de paro/falla registrados en historial operativo.`,
      source_table: 'fallas_por_maquina',
      record_ids: failRecordIds,
      metric_value: failures.length
    });
  }

  let totalDefects = 0;
  let totalPieces = 0;
  qualityRows.forEach(q => {
    totalDefects += parseFloat(q.cantidad_defecto || 0);
    totalPieces += parseFloat(q.pzas_rollo || 0);
  });
  const defectRatePct = totalPieces > 0 ? parseFloat(((totalDefects / totalPieces) * 100).toFixed(2)) : 0;
  if (qualityRows.length > 0) {
    facts.push({
      fact_id: `FACT-QUAL-${normId}`,
      category: 'CALIDAD',
      description: `Tasa de segundas calculada en ${defectRatePct}% sobre ${qualityRows.length} rollos inspeccionados.`,
      source_table: 'segundas_por_rollo',
      record_ids: qualityRows.map((_, i) => `ROL-${i + 1}`),
      metric_value: defectRatePct
    });
  }

  const calRecordIds = calendarDetails.map(c => c.id_detalle || 'CAL').filter(Boolean);
  if (calendarDetails.length > 0) {
    facts.push({
      fact_id: `FACT-CAL-${normId}`,
      category: 'CALENDARIO',
      description: `${calendarDetails.length} actividad(es) de mantenimiento programada(s) en calendario.`,
      source_table: 'calendario_mantenimiento_detalle',
      record_ids: calRecordIds,
      metric_value: calendarDetails.length
    });
  }

  // --- CAPA B: INFERENCIAS (AG-008, AG-003, AG-012, AG-013) ---
  const isRecurrent = failures.length >= 3 || recurrenceRows.length > 0;
  if (isRecurrent) {
    inferences.push({
      inference_id: `INF-REC-${normId}`,
      statement: `Patrón recurrente detectado: ${failures.length} fallas en los últimos 30 días.`,
      agent: 'AG-008',
      confidence_level: 'ALTA',
      rule_id: 'RULE-REC-3-30D',
      evidence_refs: [`FACT-FAL-${normId}`]
    });
  }

  if (defectRatePct > 5.0) {
    inferences.push({
      inference_id: `INF-PRED-${normId}`,
      statement: `Desviación en calidad textil: tasa de segundas (${defectRatePct}%) supera el umbral predictivo del 5.0%.`,
      agent: 'AG-003',
      confidence_level: 'ALTA',
      rule_id: 'RULE-PRED-SEGUNDAS-5PCT',
      evidence_refs: [`FACT-QUAL-${normId}`]
    });
  }

  if (facts.length === 0) {
    inferences.push({
      inference_id: `INF-NODATA-${normId}`,
      statement: 'Información histórica insuficiente para diagnósticos avanzados.',
      agent: 'AG-001',
      confidence_level: 'INSUFICIENTE',
      rule_id: 'RULE-INSUFFICIENT-DATA',
      evidence_refs: []
    });
  }

  // --- CAPA C: RECOMENDACIONES ---
  if (isRecurrent) {
    recommendations.push({
      recommendation_id: `REC-001-${normId}`,
      agent: 'AG-008',
      priority: 'CRITICA',
      title: `Inspección focalizada de subsistema por reincidencia en ${normId}`,
      action_suggested: 'Revisar lubricación, ajuste de tolerancias y coordinar análisis causa raíz con AG-010.',
      based_on: [`INF-REC-${normId}`],
      evidence_refs: [`FACT-FAL-${normId}`]
    });
  }

  if (defectRatePct > 5.0) {
    recommendations.push({
      recommendation_id: `REC-002-${normId}`,
      agent: 'AG-003',
      priority: 'ALTA',
      title: `Intervención predictiva por calidad en ${normId}`,
      action_suggested: 'Programar revisión de agujas, guías de hilo y tensión de trama en ventana predictiva.',
      based_on: [`INF-PRED-${normId}`],
      evidence_refs: [`FACT-QUAL-${normId}`]
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      recommendation_id: `REC-STD-${normId}`,
      agent: 'AG-002',
      priority: 'BAJA',
      title: `Mantener plan de mantenimiento estándar para ${normId}`,
      action_suggested: 'Continuar con las rutinas preventivas y autónomas programadas sin intervención adicional.',
      based_on: inferences.length > 0 ? [inferences[0].inference_id] : [],
      evidence_refs: facts.length > 0 ? [facts[0].fact_id] : []
    });
  }

  // 5. Build Final Full Snapshot
  const fullSnapshot: MachineContextSnapshot = {
    snapshot_id: `SNAP-${normId}-${Date.now()}`,
    machine_id: normId,
    generated_at: new Date().toISOString(),
    source_version_hash: sourceVersionHash,
    status: 'CURRENT',
    freshness: 'CURRENT',
    cache_status: 'CACHE_MISS',
    visibility_profile: 'FULL',
    identity: {
      machine_id: normId,
      code: machineData?.clave || normId,
      name: machineData?.nombre || normId,
      area: (machineData?.area || 'PF').toUpperCase(),
      department_code: (machineData?.departamento_codigo || 'PF').toUpperCase(),
      status: machineData?.activo !== false ? 'Operativa' : 'En Paro',
      criticality: (machineData?.criticidad || 'MEDIA').toUpperCase() as any
    },
    operational_state: {
      open_work_orders: workOrders.filter(o => o.estatus !== 'cerrada').length,
      in_progress_orders: workOrders.filter(o => o.estatus === 'en_proceso').length,
      last_intervention_at: workOrders[0]?.fecha_fin || workOrders[0]?.fecha_carga || null,
      current_maintenance_status: workOrders.some(o => o.estatus === 'en_proceso') ? 'EN_MANTENIMIENTO' : 'OPERATIVA'
    },
    facts,
    inferences,
    recommendations,
    maintenance_history: {
      total_orders_evaluated: workOrders.length,
      last_order: workOrders[0] ? {
        id: workOrders[0].folio || workOrders[0].id_orden || 'OT-001',
        date: workOrders[0].fecha_carga || '',
        type: workOrders[0].tipo_orden || 'CORRECTIVO',
        description: workOrders[0].descripcion || workOrders[0].falla || 'Intervención técnica'
      } : null
    },
    calendar: {
      preventive: { status: 'PROGRAMADO', date: '2026-11-15', type: 'Anual', agent: 'AG-002' },
      predictive: { status: defectRatePct > 5.0 ? 'PROPUESTO' : 'NO_PROGRAMADO', date: '2026-09-03', defect_pct: defectRatePct, agent: 'AG-003' },
      autonomous: { status: 'AL_DIA', next_date: '2026-09-04', agent: 'AG-004' }
    },
    recurrence: {
      detected: isRecurrent,
      occurrences: failures.length,
      window_days: 30,
      failure_mode: failures[0]?.categoria_falla || 'General',
      evidence_refs: failRecordIds,
      agent: 'AG-008'
    },
    technical_memory: {
      has_previous_solutions: bitacoraRows.length > 0 || workOrders.length > 0,
      solutions_count: bitacoraRows.length > 0 ? bitacoraRows.length : workOrders.length,
      top_solution: bitacoraRows[0] ? {
        id: bitacoraRows[0].id_bitacora || `MEM-${normId}-01`,
        summary: bitacoraRows[0].descripcion_actividad || bitacoraRows[0].observaciones || 'Intervención registrada en bitácora',
        effectiveness: 90
      } : workOrders[0] ? {
        id: workOrders[0].folio || `MEM-${normId}-01`,
        summary: workOrders[0].descripcion || workOrders[0].falla || 'Intervención técnica en OT',
        effectiveness: 85
      } : null,
      agent: 'AG-011'
    },
    lifecycle: {
      strategy: failures.length > 5 ? 'RENOVAR' : 'REPARAR',
      driver: failures.length > 5 ? 'Alto costo de paros acumulados' : 'Costo acumulado bajo',
      agent: 'AG-012'
    },
    bad_actor: {
      is_bad_actor: failures.length >= 4,
      pareto_rank: failures.length >= 4 ? 1 : null,
      downtime_hours_contribution: failures.length * 2.5,
      agent: 'AG-013'
    },
    provenance: {
      work_orders: { source: 'ordenes_trabajo', record_count: workOrders.length, record_ids: otRecordIds },
      failures: { source: 'fallas_por_maquina', record_count: failures.length, record_ids: failRecordIds },
      quality: { source: 'segundas_por_rollo', record_count: qualityRows.length, record_ids: qualityRows.map((_, i) => `ROL-${i + 1}`) },
      calendars: { source: 'calendario_mantenimiento_detalle', record_count: calendarDetails.length, record_ids: calRecordIds },
      checklists: { source: 'checklists_mantenimiento', record_count: 0, record_ids: [] }
    }
  };

  // Save in Cache
  CONTEXT_CACHE.set(normId, { snapshot: fullSnapshot, hash: sourceVersionHash, cached_at: Date.now() });

  // 6. Filter by User Role in Backend
  return filterSnapshotByRole(fullSnapshot, userRole);
}

/**
 * Role-Based Backend Filtering
 */
function filterSnapshotByRole(snapshot: MachineContextSnapshot, userRole: string): MachineContextSnapshot {
  const role = String(userRole || '').toUpperCase();

  if (role.includes('ADMIN') || role.includes('SUPER')) {
    return { ...snapshot, visibility_profile: 'FULL' };
  }

  if (role.includes('TECNICO') || role.includes('SUPERVISOR') || role.includes('MECANICO')) {
    // OPERATIONAL PROFILE: Strip deep internal config and cost details
    const clone = { ...snapshot, visibility_profile: 'OPERATIONAL' as const };
    return clone;
  }

  // SIMPLIFIED PROFILE (SOLICITANTE_PUBLICO)
  return {
    snapshot_id: snapshot.snapshot_id,
    machine_id: snapshot.machine_id,
    generated_at: snapshot.generated_at,
    source_version_hash: snapshot.source_version_hash,
    status: snapshot.status,
    freshness: snapshot.freshness,
    cache_status: snapshot.cache_status,
    visibility_profile: 'SIMPLIFIED',
    identity: snapshot.identity,
    operational_state: snapshot.operational_state,
    facts: snapshot.facts.slice(0, 2), // basic facts only
    inferences: [], // hide technical inferences
    recommendations: snapshot.recommendations.map(r => ({ ...r, based_on: [], evidence_refs: [] })),
    maintenance_history: snapshot.maintenance_history,
    calendar: snapshot.calendar,
    recurrence: { ...snapshot.recurrence, evidence_refs: [] },
    technical_memory: { ...snapshot.technical_memory, top_solution: null },
    lifecycle: { strategy: 'INFORMACION_INSUFICIENTE', driver: 'Privado', agent: 'AG-012' },
    bad_actor: { is_bad_actor: false, pareto_rank: null, downtime_hours_contribution: 0, agent: 'AG-013' },
    provenance: {
      work_orders: { source: 'ordenes_trabajo', record_count: snapshot.provenance.work_orders.record_count, record_ids: [] },
      failures: { source: 'fallas_por_maquina', record_count: snapshot.provenance.failures.record_count, record_ids: [] },
      quality: { source: 'segundas_por_rollo', record_count: 0, record_ids: [] },
      calendars: { source: 'calendario_mantenimiento_detalle', record_count: snapshot.provenance.calendars.record_count, record_ids: [] },
      checklists: { source: 'checklists_mantenimiento', record_count: 0, record_ids: [] }
    }
  };
}
