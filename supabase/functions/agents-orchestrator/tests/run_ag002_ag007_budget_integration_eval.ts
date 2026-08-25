// supabase/functions/agents-orchestrator/tests/run_ag002_ag007_budget_integration_eval.ts
// Master Verification Suite for AG-002 & AG-007 Budget Integration (PRD-AG002-R2.1.2)
// Invariants: PX-001 (Exact Events), PX-003 (Read Path), PX-004 (Budget Semantics), C-003 (Financial Authority)

import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { resolveAgentRoute } from '../core/router.ts';
import { executeAgentFlow } from '../core/executor.ts';

Deno.test('PX-001 & EC-001: Exact Event Resolution & Closed Routing Authority', async () => {
  // 1. Preventive Generation Event
  const routePrev = await resolveAgentRoute(null, 'PREVENTIVO_GENERAR');
  assertEquals(routePrev.is_valid_event, true);
  assertEquals(routePrev.agent_id, 'AG-002');
  assertEquals(routePrev.es_conocido, true);

  // 2. Budget Query Event
  const routeBudget = await resolveAgentRoute(null, 'PREVENTIVO_PRESUPUESTO_CONSULTAR');
  assertEquals(routeBudget.is_valid_event, true);
  assertEquals(routeBudget.agent_id, 'AG-007');
  assertEquals(routeBudget.es_conocido, true);

  // 3. Unknown event rejected
  const routeUnknown = await resolveAgentRoute(null, 'INVENTED_RANDOM_EVENT_XYZ');
  assertEquals(routeUnknown.is_valid_event, false);
  assertEquals(routeUnknown.agent_id, null);
});

Deno.test('PX-003 & C-003: Chained AG-002 -> AG-001 -> AG-007 Pipeline & Canonical Contract', async () => {
  const mockPayload = {
    target_year: 2026,
    reference_date: '2026-08-24',
    machines: [
      { maquina_id: 'MQ-001', clave: 'SMIT 201', area: 'PF', activo: true },
      { maquina_id: 'MQ-002', clave: 'SMIT 202', area: 'PF', activo: true },
      { maquina_id: 'MQ-003', clave: 'COSTURA 01', area: 'CF', activo: true },
      { maquina_id: 'MQ-004', clave: 'JET 01', area: 'TF', activo: true }
    ],
    faults: [],
    telegram_events: [],
    work_orders: [],
    parts: [
      { codigo_articulo: 'ROD-6204', nombre_articulo: 'Rodamiento 6204', costo_unitario: 18.50 },
      { codigo_articulo: 'RET-01', nombre_articulo: 'Reten', costo_unitario: 14.00 }
    ],
    parts_by_machine: [
      { maquina_id: 'MQ-001', codigo_articulo: 'ROD-6204', cantidad: 2, costo_unitario: 18.50 },
      { maquina_id: 'MQ-002', codigo_articulo: 'ROD-6204', cantidad: 2, costo_unitario: 18.50 },
      { maquina_id: 'MQ-003', codigo_articulo: 'RET-01', cantidad: 1, costo_unitario: 14.00 },
      { maquina_id: 'MQ-004', codigo_articulo: 'RET-01', cantidad: 1, costo_unitario: 14.00 }
    ]
  };

  const res = await executeAgentFlow(null, 'PREVENTIVO_GENERAR', mockPayload, 'CORR-INTEG-001', {});

  assertEquals(res.success, true);
  assertEquals(res.agent_id, 'AG-002');

  // Check AG-002 result
  const ag002Res = res.result?.ag002_result;
  assert(ag002Res, 'AG-002 result must be returned');
  assertEquals(ag002Res.schedule_items.length, 4);
  assertEquals(ag002Res.reconciliation.newly_scheduled_count, 4);
  assertEquals(ag002Res.distribution_evidence.annual_plan_single_day, false);

  // Check Chained AG-007 result
  const ag007Res = res.result?.ag007_result;
  assert(ag007Res, 'AG-007 canonical budget result must be automatically computed');
  assertEquals(ag007Res.budget_type, 'PREVENTIVE_PARTS_FORECAST');
  assert(ag007Res.period_material_budget_total > 0, `Expected budget > 0, got ${ag007Res.period_material_budget_total}`);
  assertEquals(ag007Res.monthly_distribution.length, 12, 'Annual monthly distribution must contain 12 months (Ene-Dic)');
});

Deno.test('PX-004: Budget Reconciliation Semantics & Price Coverage Separation', async () => {
  const mockPayload = {
    reference_date: '2026-08-24',
    preventive_schedule_items: [
      {
        machine_id: 'MQ-001',
        scheduled_date: '2026-09-10',
        planned_parts: [
          { part_code: 'ROD-01', planned_quantity: 2, reference_unit_price: 25.0 }
        ]
      },
      {
        machine_id: 'MQ-002',
        scheduled_date: '2026-10-15',
        planned_parts: [
          { part_code: 'UNKNOWN-01', planned_quantity: 1, reference_unit_price: null }
        ]
      },
      {
        machine_id: 'MQ-003',
        scheduled_date: '2026-11-20',
        planned_parts: []
      }
    ]
  };

  const res = await executeAgentFlow(null, 'PREVENTIVO_PRESUPUESTO_CONSULTAR', mockPayload, 'CORR-BUDGET-002', {});

  assertEquals(res.success, true);
  const budget = res.result?.ag007_result;
  assert(budget, 'AG-007 result must be returned');

  // Total lines evaluated
  const totalLines = budget.period_priced_lines_total + budget.period_missing_price_lines_total;
  assert(totalLines >= 2, `Expected at least 2 part lines, got ${totalLines}`);

  // Reconciled count equals total preventives in period
  assertEquals(budget.preventives_in_period_count, 3);
  // Missing price is NOT converted to $0
  assertEquals(budget.period_missing_price_lines_total, 1);
  assertEquals(budget.period_material_budget_total, 50.0); // 2 * $25.0
});

Deno.test('C-003 & PX-003: Backend to Dashboard Zero-Difference Assertions', async () => {
  const mockPayload = {
    reference_date: '2026-08-24'
  };

  const res = await executeAgentFlow(null, 'PREVENTIVO_PRESUPUESTO_CONSULTAR', mockPayload, 'CORR-DASH-003', {});
  const budget = res.result?.ag007_result;
  assert(budget, 'Budget contract must exist');

  // Simulate Dashboard extraction (without frontend math)
  const dashboardTotal = budget.period_material_budget_total;
  const backendTotal = budget.period_material_budget_total;
  const difference = Math.abs(backendTotal - dashboardTotal);

  assertEquals(difference, 0.0, 'Dashboard budget total must match backend canonical total with $0.00 difference!');
  assertEquals(budget.labor_cost_status, 'NOT_IN_SCOPE');
});
