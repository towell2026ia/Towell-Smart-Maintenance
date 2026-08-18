// supabase/functions/agents-orchestrator/agents/ag002/schedulers/annual-scheduler.ts
// Deterministic Annual Scheduler with Loom 2x/year rule and Priority Ordering (§63-69 PRD)

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

    if (prof.is_loom && prof.max_preventives_allowed_per_year === 2) {
      // Determine how many slots already exist
      const existingCount = prof.active_preventives_in_target_year;

      if (existingCount === 0) {
        // Schedule Slot 1 (S1: Weeks 2 - 24)
        const weekS1 = allocateWeek(2, 24);
        const slotCapS1 = capacityMap.get(weekS1)!;

        slots.push({
          slot_id: `slot-${slotCounter++}`,
          machine_id: prof.machine_id,
          department: prof.department_code,
          is_loom: true,
          period: 'S1',
          scheduled_date: slotCapS1.approx_date,
          year: targetYear,
          week_number: weekS1,
          month_number: slotCapS1.month_number,
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
          calendar_reference: `${calendarRefPrefix}-${prof.department_code}-S1`
        });

        // Schedule Slot 2 (S2: Weeks 28 - 50, separated by >= 90 days)
        const weekS2 = allocateWeek(Math.max(28, weekS1 + 16), 50);
        const slotCapS2 = capacityMap.get(weekS2)!;

        slots.push({
          slot_id: `slot-${slotCounter++}`,
          machine_id: prof.machine_id,
          department: prof.department_code,
          is_loom: true,
          period: 'S2',
          scheduled_date: slotCapS2.approx_date,
          year: targetYear,
          week_number: weekS2,
          month_number: slotCapS2.month_number,
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
          calendar_reference: `${calendarRefPrefix}-${prof.department_code}-S2`
        });
      } else if (existingCount === 1) {
        // Schedule remaining Slot 2 (S2: Weeks 28 - 50)
        const weekS2 = allocateWeek(28, 50);
        const slotCapS2 = capacityMap.get(weekS2)!;

        slots.push({
          slot_id: `slot-${slotCounter++}`,
          machine_id: prof.machine_id,
          department: prof.department_code,
          is_loom: true,
          period: 'S2',
          scheduled_date: slotCapS2.approx_date,
          year: targetYear,
          week_number: weekS2,
          month_number: slotCapS2.month_number,
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
          calendar_reference: `${calendarRefPrefix}-${prof.department_code}-S2`
        });
      }
    } else {
      // Standard Machine (1 slot per year)
      // Higher priority allocated earlier in the year
      const targetStartWeek = prof.priority_components.total_score >= 80 ? 2 : (prof.priority_components.total_score >= 60 ? 10 : 20);
      const targetEndWeek = prof.priority_components.total_score >= 80 ? 20 : (prof.priority_components.total_score >= 60 ? 35 : 50);
      
      const assignedWeek = allocateWeek(targetStartWeek, targetEndWeek);
      const slotCap = capacityMap.get(assignedWeek)!;

      slots.push({
        slot_id: `slot-${slotCounter++}`,
        machine_id: prof.machine_id,
        department: prof.department_code,
        is_loom: false,
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
  }

  return slots;
}
