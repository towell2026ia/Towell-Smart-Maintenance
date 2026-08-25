// supabase/functions/agents-orchestrator/agents/ag007/tests/run_ag007_annual_monthly_dashboard_eval.ts
// Comprehensive Certification Suite for PRD-AG007-R1.3.4 (FH-001..005, AF-001..005, AC-001..004, FC-001..004)

import { assertEquals, assert, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { resolvePreventiveBudgetPeriod, resolveCanonicalReferenceDate, CANONICAL_PLANT_TIMEZONE } from '../resolvers/budget-period-resolver.ts';
import { calculatePreventiveMaterialBudget } from '../calculators/preventive-material-budget-engine.ts';
import { resolveAgentRoute } from '../../../core/router.ts';
import type { PreventiveScheduleItemInput, PartPriceCatalogItem, ActiveMachineItem } from '../contracts/ag007-preventive-budget.contract.ts';

// Test Fixtures
const mockActiveMachines: ActiveMachineItem[] = [
  { id_maquina: 'MQ-001', equipo_towell: 'CIRCULAR-01', area: 'PF', departamento_codigo: 'PF', activo: true },
  { id_maquina: 'MQ-002', equipo_towell: 'RECTA-01', area: 'CF', departamento_codigo: 'CF', activo: true },
  { id_maquina: 'MQ-003', equipo_towell: 'JET-01', area: 'TF', departamento_codigo: 'TF', activo: true },
  { id_maquina: 'MQ-004', equipo_towell: 'COMPRESOR-01', area: 'AF', departamento_codigo: 'AF', activo: true }
];

const mockPriceCatalog: PartPriceCatalogItem[] = [
  { codigo_articulo: 'REF-AGUJA-01', nombre_articulo: 'Aguja Groz-Beckert', costo_unitario: 25.50 },
  { codigo_articulo: 'REF-CORREA-01', nombre_articulo: 'Correa Dentada', costo_unitario: 150.00 },
  { codigo_articulo: 'REF-VALVULA-01', nombre_articulo: 'Válvula Neumática', costo_unitario: 320.00 }
];

// =========================================================================
// 1. FH-001, FH-005, AF-002, AC-004: CANONICAL DATE & SERVER-ONLY TEST MODE
// =========================================================================
Deno.test('FH-001 & FH-005: Server-Only Test Mode & Canonical Timezone Authority', () => {
  // Set test environment
  Deno.env.set('TSM_ENV', 'test');
  Deno.env.set('AGENT_TEST_MODE', 'true');

  const ref = resolveCanonicalReferenceDate('2026-08-24');
  assertEquals(ref.canonicalDateStr, '2026-08-24');
  assertEquals(ref.timezone, CANONICAL_PLANT_TIMEZONE);
  assertEquals(ref.isTestOverride, true);

  // In production, client overrides must be ignored
  Deno.env.set('TSM_ENV', 'production');
  const prodRef = resolveCanonicalReferenceDate('2020-01-01');
  assertEquals(prodRef.isTestOverride, false);
  assertNotEquals(prodRef.canonicalDateStr, '2020-01-01'); // Server clock used

  // Restore test mode
  Deno.env.set('TSM_ENV', 'test');
  Deno.env.set('AGENT_TEST_MODE', 'true');
});

// =========================================================================
// 2. FC-001 & FC-004: SCOPE BACKWARD COMPATIBILITY & 12-MONTH PERIOD
// =========================================================================
Deno.test('FC-001 & FC-004: Backward Compatible Scope Default & 12-Month Array', () => {
  Deno.env.set('TSM_ENV', 'test');
  Deno.env.set('AGENT_TEST_MODE', 'true');

  // Test FC-001-A: Missing scope defaults strictly to CURRENT_PERIOD
  const legacyPeriod = resolvePreventiveBudgetPeriod('2026-08-24', undefined, 2026);
  assertEquals(legacyPeriod.budget_scope, 'CURRENT_PERIOD');
  assertEquals(legacyPeriod.period_key, 'PILOT_2026');
  assertEquals(legacyPeriod.total_months_in_period, 5);
  assertEquals(legacyPeriod.months, ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12']);

  // Test FC-001-B: Explicit ANNUAL_MONTHLY produces exactly 12 months (Ene-Dic)
  const annualPeriod = resolvePreventiveBudgetPeriod('2026-08-24', 'ANNUAL_MONTHLY', 2026);
  assertEquals(annualPeriod.budget_scope, 'ANNUAL_MONTHLY');
  assertEquals(annualPeriod.period_key, 'ANNUAL_2026');
  assertEquals(annualPeriod.total_months_in_period, 12);
  assertEquals(annualPeriod.months.length, 12);
  assertEquals(annualPeriod.months[0], '2026-01');
  assertEquals(annualPeriod.months[11], '2026-12');
  assertEquals(annualPeriod.month_labels, ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']);
  assertEquals(annualPeriod.current_month, '2026-08');
  assertEquals(annualPeriod.current_month_index, 7); // August is index 7 (0-indexed)

  // Future year in 2027: none of the 2027 months should be marked current during 2026
  const futurePeriod = resolvePreventiveBudgetPeriod('2026-08-24', 'ANNUAL_MONTHLY', 2027);
  assertEquals(futurePeriod.total_months_in_period, 12);
  assertEquals(futurePeriod.current_month_index, -1); // Not current
});

// =========================================================================
// 3. FH-002, AF-001, AC-001: DETERMINISTIC DEDUPLICATION PRECEDENCE
// =========================================================================
Deno.test('FH-002, AF-001 & AC-001: Deterministic Deduplication Precedence (Order Independence)', () => {
  Deno.env.set('TSM_ENV', 'test');
  Deno.env.set('AGENT_TEST_MODE', 'true');

  const itemCompleted: PreventiveScheduleItemInput = {
    preventive_id: 'PREV-REAL-01',
    asset_id: 'MQ-001',
    area_code: 'PF',
    scheduled_date: '2026-03-15',
    service_code: 'SRV-01',
    service_name: 'Servicio Preventivo Realizado',
    calendar_year: 2026,
    source_type: 'COMPLETED_REAL',
    planned_parts: [{ part_code: 'REF-AGUJA-01', part_name: 'Aguja', planned_quantity: 4, quantity_source: 'SERVICE_DEFAULT' }]
  };

  const itemScheduled: PreventiveScheduleItemInput = {
    preventive_id: 'PREV-SCHED-01',
    asset_id: 'MQ-001',
    area_code: 'PF',
    scheduled_date: '2026-10-20',
    service_code: 'SRV-01',
    service_name: 'Servicio Preventivo Futuro',
    calendar_year: 2026,
    source_type: 'VALID_SCHEDULED',
    planned_parts: [{ part_code: 'REF-AGUJA-01', part_name: 'Aguja', planned_quantity: 4, quantity_source: 'SERVICE_DEFAULT' }]
  };

  const itemNewly: PreventiveScheduleItemInput = {
    preventive_id: 'PREV-NEW-01',
    asset_id: 'MQ-001',
    area_code: 'PF',
    scheduled_date: '2026-11-10',
    service_code: 'SRV-01',
    service_name: 'Servicio Preventivo Nuevo',
    calendar_year: 2026,
    source_type: 'NEWLY_SCHEDULED',
    planned_parts: [{ part_code: 'REF-AGUJA-01', part_name: 'Aguja', planned_quantity: 4, quantity_source: 'SERVICE_DEFAULT' }]
  };

  // Run Order A: [NEWLY_SCHEDULED, VALID_SCHEDULED, COMPLETED_REAL]
  const outA = calculatePreventiveMaterialBudget({
    reference_date: '2026-08-24',
    budget_scope: 'ANNUAL_MONTHLY',
    target_year: 2026,
    active_machines: mockActiveMachines,
    preventive_schedule_items: [itemNewly, itemScheduled, itemCompleted],
    price_catalog: mockPriceCatalog
  });

  // Run Order B: [COMPLETED_REAL, VALID_SCHEDULED, NEWLY_SCHEDULED]
  const outB = calculatePreventiveMaterialBudget({
    reference_date: '2026-08-24',
    budget_scope: 'ANNUAL_MONTHLY',
    target_year: 2026,
    active_machines: mockActiveMachines,
    preventive_schedule_items: [itemCompleted, itemScheduled, itemNewly],
    price_catalog: mockPriceCatalog
  });

  // Both orders must produce identical canonical universe
  assertEquals(outA.raw_annual_universe_count, 3);
  assertEquals(outA.final_unique_annual_universe_count, 1);
  assertEquals(outA.duplicates_detected, 2);
  assertEquals(outA.duplicates_excluded, 2);
  assertEquals(outA.duplicate_conflicts, 2);
  assertEquals(outA.annual_material_budget, outB.annual_material_budget);
  assertEquals(outA.annual_material_budget, 102.00); // 4 * 25.50

  // The single entry must belong to March 2026 (COMPLETED_REAL month)
  const marchA = outA.monthly_distribution.find(m => m.month === '2026-03');
  const octA = outA.monthly_distribution.find(m => m.month === '2026-10');
  const novA = outA.monthly_distribution.find(m => m.month === '2026-11');

  assertEquals(marchA?.preventive_count, 1);
  assertEquals(marchA?.material_budget, 102.00);
  assertEquals(octA?.preventive_count, 0);
  assertEquals(novA?.preventive_count, 0);
});

// =========================================================================
// 4. FH-004, AF-004, FC-003: 12-MONTH SUMMATION & PARTIAL BUDGET STATUS
// =========================================================================
Deno.test('FH-004 & AF-004: 12-Month Summation, Zero Month & Partial Budget Status', () => {
  Deno.env.set('TSM_ENV', 'test');
  Deno.env.set('AGENT_TEST_MODE', 'true');

  const items: PreventiveScheduleItemInput[] = [
    {
      preventive_id: 'PREV-01',
      asset_id: 'MQ-001',
      area_code: 'PF',
      scheduled_date: '2026-01-10',
      service_code: 'SRV-01',
      service_name: 'Servicio Ene',
      calendar_year: 2026,
      planned_parts: [{ part_code: 'REF-AGUJA-01', part_name: 'Aguja', planned_quantity: 2, quantity_source: 'SERVICE_DEFAULT' }]
    },
    {
      preventive_id: 'PREV-02',
      asset_id: 'MQ-002',
      area_code: 'CF',
      scheduled_date: '2026-08-15',
      service_code: 'SRV-02',
      service_name: 'Servicio Ago',
      calendar_year: 2026,
      planned_parts: [{ part_code: 'REF-CORREA-01', part_name: 'Correa', planned_quantity: 1, quantity_source: 'SERVICE_DEFAULT' }]
    },
    {
      preventive_id: 'PREV-03',
      asset_id: 'MQ-003',
      area_code: 'TF',
      scheduled_date: '2026-10-05',
      service_code: 'SRV-03',
      service_name: 'Servicio Oct (Sin precio)',
      calendar_year: 2026,
      planned_parts: [{ part_code: 'REF-UNKNOWN-99', part_name: 'Pieza Rara', planned_quantity: 1, quantity_source: 'SERVICE_DEFAULT' }]
    }
  ];

  const out = calculatePreventiveMaterialBudget({
    reference_date: '2026-08-24',
    budget_scope: 'ANNUAL_MONTHLY',
    target_year: 2026,
    active_machines: mockActiveMachines,
    preventive_schedule_items: items,
    price_catalog: mockPriceCatalog
  });

  // 1. 12 months present
  assertEquals(out.monthly_distribution.length, 12);

  // 2. Month with 0 preventives (Feb 2026) -> COMPLETE and $0
  const feb = out.monthly_distribution.find(m => m.month === '2026-02');
  assertEquals(feb?.preventive_count, 0);
  assertEquals(feb?.material_budget, 0);
  assertEquals(feb?.budget_status, 'COMPLETE');

  // 3. Month with known price (Jan 2026) -> 2 * 25.50 = $51.00 COMPLETE
  const ene = out.monthly_distribution.find(m => m.month === '2026-01');
  assertEquals(ene?.preventive_count, 1);
  assertEquals(ene?.material_budget, 51.00);
  assertEquals(ene?.budget_status, 'COMPLETE');

  // 4. Month with known price (Aug 2026) -> 1 * 150.00 = $150.00 COMPLETE, is_current_month = true
  const ago = out.monthly_distribution.find(m => m.month === '2026-08');
  assertEquals(ago?.preventive_count, 1);
  assertEquals(ago?.material_budget, 150.00);
  assertEquals(ago?.is_current_month, true);
  assertEquals(ago?.budget_status, 'COMPLETE');

  // 5. Month with missing price (Oct 2026) -> $0 PARTIAL (missing price not $0 complete)
  const oct = out.monthly_distribution.find(m => m.month === '2026-10');
  assertEquals(oct?.preventive_count, 1);
  assertEquals(oct?.material_budget, 0);
  assertEquals(oct?.missing_price_lines_count, 1);
  assertEquals(oct?.budget_status, 'NO_DATA');

  // 6. Annual Sum = Ene ($51) + Ago ($150) = $201.00
  assertEquals(out.annual_material_budget, 201.00);
  assertEquals(out.annual_budget_status, 'PARTIAL'); // Because Oct is missing price
  assert(out.annual_price_coverage_pct < 100);

  // 7. Sum of all 12 monthly budgets equals annual total exactly
  const sum12Months = out.monthly_distribution.reduce((acc, m) => acc + m.material_budget, 0);
  assertEquals(Math.round(sum12Months * 100) / 100, out.annual_material_budget);
});

// =========================================================================
// 5. FH-003 & AF-003: ROUTING & EVENT CATALOG GOVERNANCE
// =========================================================================
Deno.test('FH-003 & AF-003: Budget Query Event Governance & AG-001 Routing', async () => {
  const route = await resolveAgentRoute(null, 'PREVENTIVO_PRESUPUESTO_CONSULTAR');
  assertEquals(route.is_valid_event, true);
  assertEquals(route.agent_id, 'AG-007');
  assertEquals(route.es_conocido, true);
});
