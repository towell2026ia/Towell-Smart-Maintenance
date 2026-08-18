// supabase/functions/agents-orchestrator/agents/ag002/schedulers/annual-scheduler.ts
// Deterministic Annual Scheduler with Universal 1/Year Rule and Priority Ordering (§63-69 PRD)

import { MachinePreventiveProfile, PlannedPreventiveSlot } from '../types/ag002.types.ts';
import { initializeAnnualCapacityMap } from './annual-capacity-planner.ts';

export function scheduleAnnualPreventiveCalendar(
  profiles: MachinePreventiveProfile[],
  targetYear: number,
  calendarRefPrefix: string = `CAL-${targetYear}`
): PlannedPreventiveSlot[] {
  const capacityMap = initializeAnnualCapacityMap(targetYear);
  const slots: PlannedPreventiveSlot[] = [];

  // 1. Filter eligible machines
  const eligibleProfiles = profiles.filter(p => p.can_schedule && p.selected_service);

  // 2. Sort by Deterministic Priority
  // Priority: 1. Total Score DESC, 2. Criticality Score DESC, 3. Failure Count DESC, 4. Downtime DESC, 5. Machine ID ASC
  eligibleProfiles.sort((a, b) => {
    if (b.priority_components.total_score !== a.priority_components.total_score) {
      return b.priority_components.total_score - a.priority_components.total_score;
    }
    if (b.priority_components.criticality_score !== a.priority_components.criticality_score) {
      return b.priority_components.criticality_score - a.priority_components.criticality_score;
    }
    if (b.recurrence_metrics.failure_count_12m !== a.recurrence_metrics.failure_count_12m) {
      return b.recurrence_metrics.failure_count_12m - a.recurrence_metrics.failure_count_12m;
    }
    if (b.downtime_metrics.downtime_minutes_12m !== a.downtime_metrics.downtime_minutes_12m) {
      return b.downtime_metrics.downtime_minutes_12m - a.downtime_metrics.downtime_minutes_12m;
    }
    return a.machine_id.localeCompare(b.machine_id);
  });

  // 3. Helper to find best available week in range
  function allocateWeek(startWeek: number, endWeek: number): number {
    for (let w = startWeek; w <= endWeek; w++) {
      const slot = capacityMap.get(w);
      if (slot && slot.assigned_count < slot.max_capacity) {
        slot.assigned_count++;
        return w;
      }
    }
    // Fallback: lowest occupied week in range
    let bestW = startWeek;
    let minOcc = Infinity;
    for (let w = startWeek; w <= endWeek; w++) {
      const slot = capacityMap.get(w);
      if (slot && slot.assigned_count < minOcc) {
        minOcc = slot.assigned_count;
        bestW = w;
      }
    }
    const slot = capacityMap.get(bestW);
    if (slot) slot.assigned_count++;
    return bestW;
  }

  let slotCounter = 1;

  for (const prof of eligibleProfiles) {
    const srv = prof.selected_service!;

    // Universal Rule: Exactly 1 preventive slot per machine per calendar year
    // High priority machines (e.g. critical looms with high score) get earlier target weeks
    const targetStartWeek = prof.priority_components.total_score >= 80 ? 2 : (prof.priority_components.total_score >= 60 ? 10 : 20);
    const targetEndWeek = prof.priority_components.total_score >= 80 ? 20 : (prof.priority_components.total_score >= 60 ? 35 : 50);

    const assignedWeek = allocateWeek(targetStartWeek, targetEndWeek);
    const slotCap = capacityMap.get(assignedWeek)!;

    slots.push({
      slot_id: `slot-${slotCounter++}`,
      machine_id: prof.machine_id,
      department: prof.department_code,
      is_loom: prof.is_loom,
      period: 'ANUAL',
      scheduled_date: slotCap.approx_date,
      year: targetYear,
      week_number: assignedWeek,
      month_number: slotCap.month_number,
      priority_score: prof.priority_components.total_score,
      priority_band: prof.priority_components.priority_band,
      service_code: srv.codigo_servicio,
      service_name: srv.nombre_servicio,
      estimated_duration_min: srv.duracion_estimada_min || 180,
      planned_parts: prof.estimated_parts.map(p => ({
        cve_refaccion: p.cve_refaccion,
        cantidad: p.cantidad,
        costo_unitario: p.costo_unitario
      })),
      parts_cost_known: prof.estimated_parts_cost_total || 0,
      budget_status: prof.budget_status,
      calendar_reference: `${calendarRefPrefix}-${prof.department_code}`
    });
  }

  return slots;
}
