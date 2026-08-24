// supabase/functions/agents-orchestrator/agents/ag002/tests/run_ag002_full_year_preventive_eval.ts
// Master Verification Suite for PRD-AG002-R2.1.2 (Full Year Planning, Dynamic Weeks, Operational Days, Exclusive Classification)

import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { resolvePreventiveAnnualPlanningWindow } from '../resolvers/annual-window-resolver.ts';
import { AnnualCapacityPlanner } from '../schedulers/annual-capacity-planner.ts';
import { scheduleAnnualPreventiveCalendar } from '../schedulers/annual-scheduler.ts';
import { OPERATIONAL_CALENDAR_CONFIG } from '../rules/preventive-rules.config.ts';
import { MachinePreventiveProfile } from '../types/ag002.types.ts';

function createMockProfile(id: string, dept: string = 'PF', score: number = 75, canSchedule: boolean = true): MachinePreventiveProfile {
  return {
    machine_id: id,
    department_code: dept,
    is_active: true,
    is_loom: dept === 'PF',
    max_preventives_allowed_per_year: 1,
    criticality_level: 'Alta',
    recurrence_metrics: { failure_count_12m: 3, has_recurrence: true, recurrence_type: 'RECURRENTE' },
    downtime_metrics: { downtime_minutes_12m: 240, downtime_category: 'ALTO' },
    maintenance_history: { total_preventives_completed: 2, total_correctives_completed: 3, days_since_last_preventive: 200, last_preventive_date: '2025-08-01' },
    priority_components: { criticality_score: 25, recurrence_score: 15, downtime_score: 10, corrective_frequency_score: 5, preventive_age_score: 5, total_score: score, priority_band: score >= 80 ? 'VERY_HIGH' : (score >= 60 ? 'HIGH' : 'MEDIUM') },
    selected_service: canSchedule ? { codigo_servicio: 'SRV-PREV-01', nombre_servicio: 'Mantenimiento Preventivo Mayor', duracion_estimada_min: 180, frecuencia_meses: 12, partes_requeridas: [] } : null,
    service_status: canSchedule ? 'FOUND' : 'MISSING',
    estimated_parts: [{ cve_refaccion: 'ROD-6204', cantidad: 2, costo_unitario: 18.50, nombre: 'Rodamiento' }],
    budget_status: 'COMPLETE',
    estimated_parts_cost_total: 37.00,
    year_guard_status: 'ALLOWED',
    active_preventives_in_target_year: 0,
    can_schedule: canSchedule
  };
}

Deno.test('PX-006 & C-001: Past-Year Protection and Future Year Dynamic Windows', () => {
  const refDate = '2026-08-24';

  // 1. Past Year 2025: Must be blocked
  const w2025 = resolvePreventiveAnnualPlanningWindow(refDate, 2025);
  assertEquals(w2025.status, 'PAST_YEAR_PLANNING_NOT_ALLOWED');
  assertEquals(w2025.total_available_weeks, 0);

  // 2. Current Year 2026: Catch-up starting next available Monday (2026-08-31)
  const w2026 = resolvePreventiveAnnualPlanningWindow(refDate, 2026);
  assertEquals(w2026.status, 'READY');
  assertEquals(w2026.is_current_year, true);
  assertEquals(w2026.planning_start_date, '2026-08-31');
  assertEquals(w2026.planning_end_date, '2026-12-31');
  assert(w2026.total_available_weeks >= 17 && w2026.total_available_weeks <= 19, `Expected ~18 weeks, got ${w2026.total_available_weeks}`);

  // 3. Future Year 2027: Full Year from Jan 1 to Dec 31
  const w2027 = resolvePreventiveAnnualPlanningWindow(refDate, 2027);
  assertEquals(w2027.status, 'READY');
  assertEquals(w2027.is_future_year, true);
  assertEquals(w2027.planning_start_date, '2027-01-01');
  assertEquals(w2027.planning_end_date, '2027-12-31');
  assert(w2027.total_available_weeks >= 52 && w2027.total_available_weeks <= 53, `Expected 52-53 weeks, got ${w2027.total_available_weeks}`);
});

Deno.test('PX-002 & EC-003: Operational Calendar Authority (Strict Monday-Friday)', () => {
  const w2026 = resolvePreventiveAnnualPlanningWindow('2026-08-24', 2026);
  assertEquals(w2026.operational_days_source, OPERATIONAL_CALENDAR_CONFIG.source);

  // Check every operational day in every slot
  for (const slot of w2026.weekly_slots) {
    for (const day of slot.operational_days) {
      const d = new Date(day + 'T00:00:00Z');
      const dow = (d.getUTCDay() + 6) % 7 + 1; // 1=Mon .. 7=Sun
      assert(dow >= 1 && dow <= 5, `Day ${day} (DOW: ${dow}) is not a Monday-Friday business day!`);
    }
  }
});

Deno.test('PX-005: Capacity Feasibility Report without Fake Constants', () => {
  const w2026 = resolvePreventiveAnnualPlanningWindow('2026-08-24', 2026);
  const rep = AnnualCapacityPlanner.evaluateCapacityFeasibility(135, w2026);
  assertEquals(rep.assets_to_schedule, 135);
  assertEquals(rep.capacity_status, 'CAPACITY_CONSTRAINT_NOT_CONFIGURED');
  assert(rep.required_avg_weekly_load > 0);
  assert(rep.required_avg_daily_load > 0);
});

Deno.test('C-007, C-008 & EC-002: Dynamic Multi-Level Distribution & Exclusive Asset Reconciliation (135 Machines)', () => {
  const mockProfiles: MachinePreventiveProfile[] = [];
  for (let i = 1; i <= 135; i++) {
    const id = `MQ-${String(i).padStart(3, '0')}`;
    const dept = i <= 60 ? 'PF' : (i <= 90 ? 'CF' : (i <= 115 ? 'TF' : 'AF'));
    const score = 100 - (i % 50);
    // Machine 135 has a configuration gap
    const canSchedule = i !== 135;
    mockProfiles.push(createMockProfile(id, dept, score, canSchedule));
  }

  // Set MQ-001 as already completed, MQ-002 as valid future
  const completed = new Set(['MQ-001']);
  const validFuture = new Map([['MQ-002', { scheduled_date: '2026-09-15', iso_week: 38 }]]);

  const res = scheduleAnnualPreventiveCalendar(
    mockProfiles,
    2026,
    '2026-08-24',
    completed,
    validFuture,
    'CAL-2026'
  );

  // Reconciliation Check (EC-002 & C-008)
  assertEquals(res.reconciliation.active_applicable_count, 135);
  assertEquals(res.reconciliation.completed_real_count, 1);
  assertEquals(res.reconciliation.valid_future_scheduled_count, 1);
  assertEquals(res.reconciliation.newly_scheduled_count, 132); // 135 - 1 - 1 - 1 gap
  assertEquals(res.reconciliation.configuration_gaps_count, 1);
  assertEquals(res.reconciliation.total_reconciled, 135);
  assertEquals(res.reconciliation.unreconciled_count, 0);
  assertEquals(res.reconciliation.classification_overlap_count, 0);
  assertEquals(res.reconciliation.duplicate_annual_conflicts_count, 0);

  // Distribution Evidence Check (C-007)
  assert(res.distribution_evidence.weeks_used_count > 1, `Expected multiple weeks, got ${res.distribution_evidence.weeks_used_count}`);
  assert(res.distribution_evidence.distinct_scheduled_dates_count > 1, `Expected multiple dates, got ${res.distribution_evidence.distinct_scheduled_dates_count}`);
  assertEquals(res.distribution_evidence.annual_plan_single_day, false);
  assert(res.distribution_evidence.max_assets_on_single_date < res.reconciliation.newly_scheduled_count);

  // Date Range and Invariant Check
  for (const slot of res.slots) {
    assert(slot.scheduled_date >= '2026-08-31' && slot.scheduled_date <= '2026-12-31', `Date ${slot.scheduled_date} out of bounds!`);
    const d = new Date(slot.scheduled_date + 'T00:00:00Z');
    const dow = (d.getUTCDay() + 6) % 7 + 1;
    assert(dow >= 1 && dow <= 5, `Scheduled date ${slot.scheduled_date} is not a valid business day!`);
  }

  // 1/Year Invariant Check
  const machineSlotCounts = new Map<string, number>();
  for (const slot of res.slots) {
    machineSlotCounts.set(slot.machine_id, (machineSlotCounts.get(slot.machine_id) || 0) + 1);
  }
  for (const [mId, count] of machineSlotCounts.entries()) {
    assertEquals(count, 1, `Machine ${mId} scheduled more than once (${count})!`);
  }
});

Deno.test('EC-002 Conflict Test: Duplicate Completed + Valid Future Triggers Conflict Warning', () => {
  const profiles = [
    createMockProfile('MQ-001', 'PF', 80),
    createMockProfile('MQ-002', 'PF', 70)
  ];

  // MQ-001 has BOTH completed and valid future
  const completed = new Set(['MQ-001']);
  const validFuture = new Map([['MQ-001', { scheduled_date: '2026-10-10', iso_week: 41 }]]);

  const res = scheduleAnnualPreventiveCalendar(profiles, 2026, '2026-08-24', completed, validFuture);

  assertEquals(res.reconciliation.duplicate_annual_conflicts_count, 1);
  assertEquals(res.reconciliation.completed_real_count, 1);
  assertEquals(res.reconciliation.newly_scheduled_count, 1); // MQ-002
});
