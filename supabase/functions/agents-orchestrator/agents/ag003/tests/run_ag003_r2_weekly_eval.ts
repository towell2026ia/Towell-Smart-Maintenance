// supabase/functions/agents-orchestrator/agents/ag003/tests/run_ag003_r2_weekly_eval.ts
// Comprehensive Test Suite & Certification for PRD-AG003-R2
// Predictivo Semanal por Segundas, Trigger por Carga y Dispersión Miércoles–Martes v1.0

import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { runDeterministicWeeklyPredictiveEngine } from '../core/weekly-predictive-engine.ts';
import { resolveWeeklyPredictiveCycle, scheduleWeeklyPredictiveSlots } from '../schedulers/weekly-predictive-scheduler.ts';
import { compareWeeklyCandidates } from '../rules/weekly.rules.ts';
import { resolveAgentRoute } from '../../../core/router.ts';
import { executeAgentFlow } from '../../../core/executor.ts';
import { RawQualityRow } from '../types/ag003.types.ts';

// ── TEST FIXTURES ─────────────────────────────────────────────────────────────

const MOCK_ACTIVE_PF_LOOMS = [
  { equipo_towell: 'TOW-TEL201-TEJI', machine_id: 'TOW-TEL201-TEJI', area: 'PF', activo: true },
  { equipo_towell: 'TOW-TEL202-TEJI', machine_id: 'TOW-TEL202-TEJI', area: 'PF', activo: true },
  { equipo_towell: 'TOW-TEL203-TEJI', machine_id: 'TOW-TEL203-TEJI', area: 'PF', activo: true },
  { equipo_towell: 'TOW-TEL204-TEJI', machine_id: 'TOW-TEL204-TEJI', area: 'PF', activo: true },
  { equipo_towell: 'TOW-TEL205-TEJI', machine_id: 'TOW-TEL205-TEJI', area: 'PF', activo: true },
  { equipo_towell: 'TOW-TEL206-TEJI', machine_id: 'TOW-TEL206-TEJI', area: 'PF', activo: true },
  { equipo_towell: 'TOW-COS101-COST', machine_id: 'TOW-COS101-COST', area: 'CF', activo: true }, // NON-PF
  { equipo_towell: 'TOW-TEL999-INAC', machine_id: 'TOW-TEL999-INAC', area: 'PF', activo: false } // INACTIVE
];

const MOCK_QUALITY_ROWS: RawQualityRow[] = [
  // TEL201: 20 defectos / 200 pzas = 10.00%
  { fecha: '2026-08-25', maquina_id: 'TOW-TEL201-TEJI', cantidad_defecto: 10, pzas_rollo: 100 },
  { fecha: '2026-08-25', maquina_id: 'TOW-TEL201-TEJI', cantidad_defecto: 10, pzas_rollo: 100 },

  // TEL202: 15 defectos / 200 pzas = 7.50%
  { fecha: '2026-08-25', maquina_id: 'TOW-TEL202-TEJI', cantidad_defecto: 8, pzas_rollo: 100 },
  { fecha: '2026-08-25', maquina_id: 'TOW-TEL202-TEJI', cantidad_defecto: 7, pzas_rollo: 100 },

  // TEL203: 10 defectos / 200 pzas = 5.00%
  { fecha: '2026-08-25', maquina_id: 'TOW-TEL203-TEJI', cantidad_defecto: 5, pzas_rollo: 100 },
  { fecha: '2026-08-25', maquina_id: 'TOW-TEL203-TEJI', cantidad_defecto: 5, pzas_rollo: 100 },

  // TEL204: 6 defectos / 200 pzas = 3.00%
  { fecha: '2026-08-25', maquina_id: 'TOW-TEL204-TEJI', cantidad_defecto: 3, pzas_rollo: 100 },
  { fecha: '2026-08-25', maquina_id: 'TOW-TEL204-TEJI', cantidad_defecto: 3, pzas_rollo: 100 },

  // TEL205: 4 defectos / 200 pzas = 2.00%
  { fecha: '2026-08-25', maquina_id: 'TOW-TEL205-TEJI', cantidad_defecto: 2, pzas_rollo: 100 },
  { fecha: '2026-08-25', maquina_id: 'TOW-TEL205-TEJI', cantidad_defecto: 2, pzas_rollo: 100 },

  // TEL206: 2 defectos / 200 pzas = 1.00%
  { fecha: '2026-08-25', maquina_id: 'TOW-TEL206-TEJI', cantidad_defecto: 1, pzas_rollo: 100 },
  { fecha: '2026-08-25', maquina_id: 'TOW-TEL206-TEJI', cantidad_defecto: 1, pzas_rollo: 100 },

  // COS101 (Non-PF should be ignored):
  { fecha: '2026-08-25', maquina_id: 'TOW-COS101-COST', cantidad_defecto: 50, pzas_rollo: 100 }
];

// ── TEST GATES ────────────────────────────────────────────────────────────────

Deno.test('Gate 1: AG003_REAL_EVENT_TRIGGER_PASS & AG003_AG001_EVENT_ORCHESTRATION_PASS', async () => {
  const route1 = await resolveAgentRoute(null, 'EXCEL_SEGUNDAS_CARGADO');
  assertEquals(route1.is_valid_event, true);
  assertEquals(route1.agent_id, 'AG-003');

  const route2 = await resolveAgentRoute(null, 'PREDICTIVO_GENERAR');
  assertEquals(route2.is_valid_event, true);
  assertEquals(route2.agent_id, 'AG-003');

  // Governance: Direct call attempt to AG-003 via browser payload must be stripped/routed cleanly
  const result = await executeAgentFlow(
    null,
    'EXCEL_SEGUNDAS_CARGADO',
    {
      agent_id: 'AG-003', // Should be stripped by governance
      upload_date: '2026-08-25',
      machines: MOCK_ACTIVE_PF_LOOMS,
      quality_rows: MOCK_QUALITY_ROWS
    },
    'corr-test-trigger',
    { MULTIAGENT_ENABLED: 'true' }
  );

  assertEquals(result.success, true);
  assertEquals(result.agent_id, 'AG-003');
  assertExists(result.result?.ag003_result);
  assertEquals(result.result.ag003_result.selection_count, 4);
});

Deno.test('Gate 2: AG003_SEGUNDAS_FORMULA_AUTHORITY_PASS & Deterministic Calculation', () => {
  const contract = runDeterministicWeeklyPredictiveEngine({
    uploadDate: '2026-08-25',
    machines: MOCK_ACTIVE_PF_LOOMS,
    qualityRows: MOCK_QUALITY_ROWS
  });

  // Verify formula: (cantidad_defecto / pzas_rollo) * 100
  const cand1 = contract.all_ranked_candidates.find(c => c.machine_id === 'TOW-TEL201-TEJI');
  assertExists(cand1);
  assertEquals(cand1.total_segundas, 20);
  assertEquals(cand1.total_pzas, 200);
  assertEquals(cand1.segundas_percentage, 10.00);

  const cand2 = contract.all_ranked_candidates.find(c => c.machine_id === 'TOW-TEL202-TEJI');
  assertExists(cand2);
  assertEquals(cand2.total_segundas, 15);
  assertEquals(cand2.total_pzas, 200);
  assertEquals(cand2.segundas_percentage, 7.50);
});

Deno.test('Gate 3 & 4: AG003_SEGUNDAS_RANKING_PASS & AG003_TOP4_WEEKLY_SELECTION_PASS', () => {
  const contract = runDeterministicWeeklyPredictiveEngine({
    uploadDate: '2026-08-25',
    machines: MOCK_ACTIVE_PF_LOOMS,
    qualityRows: MOCK_QUALITY_ROWS
  });

  // Ranking order must be TEL201 (10%), TEL202 (7.5%), TEL203 (5%), TEL204 (3%)
  assertEquals(contract.selection_count, 4);
  assertEquals(contract.scheduled_items[0].machine_identifier, 'TOW-TEL201-TEJI');
  assertEquals(contract.scheduled_items[0].rank, 1);
  assertEquals(contract.scheduled_items[1].machine_identifier, 'TOW-TEL202-TEJI');
  assertEquals(contract.scheduled_items[1].rank, 2);
  assertEquals(contract.scheduled_items[2].machine_identifier, 'TOW-TEL203-TEJI');
  assertEquals(contract.scheduled_items[2].rank, 3);
  assertEquals(contract.scheduled_items[3].machine_identifier, 'TOW-TEL204-TEJI');
  assertEquals(contract.scheduled_items[3].rank, 4);

  // Inactive loom TEL999 and Non-PF COS101 must NEVER be selected
  const nonPfSelected = contract.scheduled_items.filter(item => item.machine_identifier.includes('COS') || item.department !== 'PF');
  assertEquals(nonPfSelected.length, 0);

  const inactiveSelected = contract.scheduled_items.filter(item => item.machine_identifier.includes('999'));
  assertEquals(inactiveSelected.length, 0);
});

Deno.test('Gate 4.B: Fewer than 4 Candidates Selection (3 valid looms -> 3 selected)', () => {
  const fewRows: RawQualityRow[] = [
    { fecha: '2026-08-25', maquina_id: 'TOW-TEL201-TEJI', cantidad_defecto: 10, pzas_rollo: 100 },
    { fecha: '2026-08-25', maquina_id: 'TOW-TEL202-TEJI', cantidad_defecto: 8, pzas_rollo: 100 },
    { fecha: '2026-08-25', maquina_id: 'TOW-TEL203-TEJI', cantidad_defecto: 5, pzas_rollo: 100 }
  ];

  const contract = runDeterministicWeeklyPredictiveEngine({
    uploadDate: '2026-08-25',
    machines: MOCK_ACTIVE_PF_LOOMS,
    qualityRows: fewRows
  });

  // Must select exactly 3; zero invented 4th candidates
  assertEquals(contract.selection_count, 3);
  assertEquals(contract.scheduled_items.length, 3);
});

Deno.test('Gate 5, 6 & 7: AG003_WEDNESDAY_TUESDAY_CYCLE_PASS & AG003_SUNDAY_ELIGIBILITY_PASS', () => {
  // Upload Tuesday 2026-08-25
  const cycle = resolveWeeklyPredictiveCycle('2026-08-25');
  assertEquals(cycle.cycle_start, '2026-08-26'); // Wednesday
  assertEquals(cycle.cycle_end, '2026-09-01');   // Tuesday
  assertEquals(cycle.days_count, 7);
  assertEquals(cycle.sunday_eligible, true);

  const scheduled = scheduleWeeklyPredictiveSlots(
    [
      { machine_id: 'TOW-TEL201-TEJI', department: 'PF', is_active: true, total_segundas: 20, total_pzas: 200, segundas_percentage: 10, rank: 1, selection_status: 'SELECTED' },
      { machine_id: 'TOW-TEL202-TEJI', department: 'PF', is_active: true, total_segundas: 15, total_pzas: 200, segundas_percentage: 7.5, rank: 2, selection_status: 'SELECTED' },
      { machine_id: 'TOW-TEL203-TEJI', department: 'PF', is_active: true, total_segundas: 10, total_pzas: 200, segundas_percentage: 5, rank: 3, selection_status: 'SELECTED' },
      { machine_id: 'TOW-TEL204-TEJI', department: 'PF', is_active: true, total_segundas: 6, total_pzas: 200, segundas_percentage: 3, rank: 4, selection_status: 'SELECTED' }
    ],
    cycle
  );

  assertEquals(scheduled.length, 4);
  assertEquals(scheduled[0].scheduled_date, '2026-08-26'); // Wednesday (Day 0)
  assertEquals(scheduled[1].scheduled_date, '2026-08-28'); // Friday (Day 2)
  assertEquals(scheduled[2].scheduled_date, '2026-08-30'); // Sunday (Day 4) - SUNDAY IS SCHEDULED!
  assertEquals(scheduled[2].day_of_week_name, 'Domingo');
  assertEquals(scheduled[3].scheduled_date, '2026-09-01'); // Tuesday (Day 6)
});

Deno.test('Gate 8: AG003_WEEKLY_DATE_DISPERSION_PASS (4 Telares -> 4 Fechas Únicas)', () => {
  const contract = runDeterministicWeeklyPredictiveEngine({
    uploadDate: '2026-08-25',
    machines: MOCK_ACTIVE_PF_LOOMS,
    qualityRows: MOCK_QUALITY_ROWS
  });

  const dates = contract.scheduled_items.map(item => item.scheduled_date);
  const uniqueDates = new Set(dates);

  assertEquals(dates.length, 4);
  assertEquals(uniqueDates.size, 4); // 4 UNIQUE DATES
  assertEquals(contract.same_day_collisions_count, 0); // ZERO COLLISIONS
});

Deno.test('Gate 9 & 10: AG003_MONTH_BOUNDARY_INDEPENDENCE_PASS & AG003_YEAR_BOUNDARY_INDEPENDENCE_PASS', () => {
  // 1. Month Boundary (Aug -> Sep)
  const augCycle = resolveWeeklyPredictiveCycle('2026-08-25');
  assertEquals(augCycle.cycle_start, '2026-08-26');
  assertEquals(augCycle.cycle_end, '2026-09-01');
  assertEquals(augCycle.days_count, 7);

  // 2. Year Boundary (Dec 2026 -> Jan 2027)
  const decCycle = resolveWeeklyPredictiveCycle('2026-12-29'); // Tuesday 29-Dec-2026
  assertEquals(decCycle.cycle_start, '2026-12-30');           // Wednesday 30-Dec-2026
  assertEquals(decCycle.cycle_end, '2027-01-05');             // Tuesday 05-Jan-2027
  assertEquals(decCycle.days_count, 7);
});

Deno.test('Gate 11: AG003_UPLOAD_IDEMPOTENCY_PASS', () => {
  const run1 = runDeterministicWeeklyPredictiveEngine({
    uploadDate: '2026-08-25',
    sourceIngestionId: 'carga-id-12345',
    machines: MOCK_ACTIVE_PF_LOOMS,
    qualityRows: MOCK_QUALITY_ROWS
  });

  const run2 = runDeterministicWeeklyPredictiveEngine({
    uploadDate: '2026-08-25',
    sourceIngestionId: 'carga-id-12345',
    machines: MOCK_ACTIVE_PF_LOOMS,
    qualityRows: MOCK_QUALITY_ROWS
  });

  assertEquals(run1.cycle_id, run2.cycle_id);
  assertEquals(run1.selection_count, run2.selection_count);
  assertEquals(run1.scheduled_items[0].scheduled_date, run2.scheduled_items[0].scheduled_date);
  assertEquals(run1.scheduled_items[1].scheduled_date, run2.scheduled_items[1].scheduled_date);
  assertEquals(run1.scheduled_items[2].scheduled_date, run2.scheduled_items[2].scheduled_date);
  assertEquals(run1.scheduled_items[3].scheduled_date, run2.scheduled_items[3].scheduled_date);
});

Deno.test('Gate 12: AG003_INVALID_UPLOAD_BLOCK_PASS', () => {
  // Empty or zero-data upload
  const contract = runDeterministicWeeklyPredictiveEngine({
    uploadDate: '2026-08-25',
    machines: MOCK_ACTIVE_PF_LOOMS,
    qualityRows: []
  });

  assertEquals(contract.selection_count, 0);
  assertEquals(contract.scheduled_items.length, 0);
  assertEquals(contract.audit_summary.status, 'NO_CANDIDATES');
});

Deno.test('Gate 14: AG003_DETERMINISTIC_SCHEDULING_PASS & AG003_NO_MONTHLY_SCHEDULER_PASS', () => {
  const contract = runDeterministicWeeklyPredictiveEngine({
    uploadDate: '2026-08-25',
    machines: MOCK_ACTIVE_PF_LOOMS,
    qualityRows: MOCK_QUALITY_ROWS
  });

  assertEquals(contract.audit_summary.llm_ranking_used, false);
  assertEquals(contract.audit_summary.llm_scheduling_used, false);
  assertEquals(contract.audit_summary.deterministic_pass, true);
  assertEquals(contract.ranking_method, 'SEGUNDAS_PERCENTAGE_DESC_DETERMINISTIC');
});

Deno.test('Deterministic Tie-Breaker Stability Test', () => {
  // Loom A and Loom B have equal 8.50% segundas, but Loom A has higher total segundas
  const c1 = { segundas_percentage: 8.50, total_segundas: 17, total_pzas: 200, machine_id: 'TOW-TEL201-TEJI' };
  const c2 = { segundas_percentage: 8.50, total_segundas: 34, total_pzas: 400, machine_id: 'TOW-TEL202-TEJI' };
  
  const comp = compareWeeklyCandidates(c1, c2);
  // c2 has higher total segundas (34 > 17), so c2 comes before c1
  assertEquals(comp > 0, true);
});
