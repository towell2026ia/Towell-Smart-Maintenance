// supabase/functions/agents-orchestrator/agents/ag002/core/preventive-engine.ts
// Master Deterministic Preventive Engine Pipeline for AG-002 (§1-128 PRD)

import { 
  AnnualCalendarProposal, 
  HistoricalCollectorInput, 
  MachinePreventiveProfile 
} from '../types/ag002.types.ts';
import { 
  AG002_ENGINE_VERSION, 
  AG002_RULE_VERSIONS, 
  FREQUENCY_RULES 
} from '../rules/preventive-rules.config.ts';
import { isLoomMachine, normalizeDepartmentCode, normalizeDate } from '../normalizers/historical-normalizer.ts';
import { deduplicateHistoricalEvents, RawEventCandidate } from '../dedupers/historical-deduper.ts';
import { calculateRecurrenceMetrics } from '../calculators/recurrence-calculator.ts';
import { calculateDowntimeMetrics } from '../calculators/downtime-calculator.ts';
import { calculateMaintenanceHistory } from '../calculators/maintenance-history-calculator.ts';
import { calculatePreventivePriority } from '../engine/preventive-priority-engine.ts';
import { evaluatePreventiveYearGuard } from '../guards/preventive-year-guard.ts';
import { resolvePreventiveService } from '../resolvers/service-resolver.ts';
import { estimatePreventiveParts } from '../estimators/parts-estimator.ts';
import { scheduleAnnualPreventiveCalendar } from '../schedulers/annual-scheduler.ts';
import { aggregatePreventiveBudget } from '../aggregators/preventive-budget-aggregator.ts';
import { buildPreventiveScheduleContract } from '../builders/preventive-contract-builder.ts';
import { validatePreventiveOutput } from '../validators/preventive-output-validator.ts';

export class DeterministicPreventiveEngine {
  public static execute(input: HistoricalCollectorInput): AnnualCalendarProposal {
    const startHr = (typeof process !== 'undefined' && process.hrtime) ? process.hrtime.bigint() : null;
    const startTimeMs = Date.now();

    const targetYear = input.target_year;
    const generationDateStr = input.generation_date || new Date().toISOString().split('T')[0];
    const calendarReference = `CAL-ANUAL-${targetYear}`;

    const machineProfiles: Record<string, MachinePreventiveProfile> = {};
    let loomsCount = 0;
    let standardCount = 0;
    let eligibleCount = 0;
    let blockedCount = 0;

    // 1. Prepare raw historical events across all sources
    const rawEvents: RawEventCandidate[] = [];

    // Faults from Excel
    for (const f of input.faults) {
      const d = normalizeDate(f.fecha_creada);
      if (d && f.maquina_id) {
        rawEvents.push({
          raw_id: f.id_falla,
          source: 'EXCEL_FAULT',
          maquina_id: f.maquina_id,
          date: d,
          description: f.descripcion_falla || 'Falla operativa',
          category: f.categoria_falla,
          folio: undefined,
          id_original: undefined
        });
      }
    }

    // Telegram events
    for (const tg of input.telegram_events) {
      const d = normalizeDate(tg.fecha);
      if (d && tg.maquina_id) {
        rawEvents.push({
          raw_id: `TG_${tg.id}`,
          source: 'TELEGRAM',
          maquina_id: tg.maquina_id,
          date: d,
          description: tg.descripcion || tg.falla || 'Paro reportado Telegram',
          folio: tg.folio,
          id_original: tg.id
        });
      }
    }

    // Work orders
    for (const ot of input.work_orders) {
      const d = normalizeDate(ot.fecha_inicio || ot.fecha_fin);
      if (d && ot.maquina_id) {
        rawEvents.push({
          raw_id: ot.id_orden,
          source: 'WORK_ORDER',
          maquina_id: ot.maquina_id,
          date: d,
          description: ot.tipo_orden || 'Orden de Trabajo',
          folio: ot.folio,
          id_original: ot.id_original,
          downtime_minutes: ot.tiempo_atencion_min
        });
      }
    }

    // Deduplicate all historical events once
    const dedupedEvents = deduplicateHistoricalEvents(rawEvents);

    // 2. Process each machine
    for (const m of input.machines) {
      const machineId = String(m.equipo_towell || '').trim().toUpperCase();
      if (!machineId) continue;

      const dept = normalizeDepartmentCode(m.departamento_codigo || m.area, machineId);
      const isLoom = isLoomMachine(machineId, dept);
      const maxAllowed = isLoom ? FREQUENCY_RULES.loom_max_per_year : FREQUENCY_RULES.standard_max_per_year;

      if (isLoom) loomsCount++;
      else standardCount++;

      // Inactive machine check
      if (m.activo === false) {
        blockedCount++;
        continue;
      }

      // Criticality
      const critItem = input.criticalities.find(c => String(c.maquina_id || '').trim().toUpperCase() === machineId);
      const critLevel = critItem?.nivel_criticidad || 'Media';

      // Historical Calculators
      const recurrence = calculateRecurrenceMetrics(machineId, dedupedEvents, generationDateStr);
      const downtime = calculateDowntimeMetrics(machineId, input.bitacoras, input.work_orders);
      const maintenanceHistory = calculateMaintenanceHistory(machineId, input.work_orders, generationDateStr);

      // Priority Engine
      const priorityComponents = calculatePreventivePriority(critLevel, recurrence, downtime, maintenanceHistory);

      // Year Guard
      const yearGuard = evaluatePreventiveYearGuard(machineId, targetYear, input.existing_calendar_details || [], dept);

      // Service Resolver
      const serviceRes = resolvePreventiveService(machineId, dept, input.services);

      // Parts Estimator
      const partsEst = estimatePreventiveParts(machineId, input.parts, input.parts_by_machine);

      if (yearGuard.can_schedule && serviceRes.service) {
        eligibleCount++;
      } else {
        blockedCount++;
      }

      machineProfiles[machineId] = {
        machine_id: machineId,
        department_code: dept,
        is_active: m.activo,
        is_loom: isLoom,
        max_preventives_allowed_per_year: maxAllowed,
        criticality_level: critLevel,
        recurrence_metrics: recurrence,
        downtime_metrics: downtime,
        maintenance_history: maintenanceHistory,
        priority_components: priorityComponents,
        selected_service: serviceRes.service,
        service_status: serviceRes.status,
        estimated_parts: partsEst.parts,
        budget_status: partsEst.budget_status,
        estimated_parts_cost_total: partsEst.known_cost_total,
        year_guard_status: yearGuard.status,
        active_preventives_in_target_year: yearGuard.active_preventives_count,
        can_schedule: yearGuard.can_schedule && Boolean(serviceRes.service)
      };
    }

    // 3. Run Annual Scheduler
    const profilesList = Object.values(machineProfiles);
    const scheduledSlots = scheduleAnnualPreventiveCalendar(profilesList, targetYear, calendarReference);

    // 4. Run Budget Aggregator
    const budgetSummary = aggregatePreventiveBudget(scheduledSlots);

    // 5. Build and Validate Contract Payloads
    const contractPayloads: any[] = [];
    for (const slot of scheduledSlots) {
      const payload = buildPreventiveScheduleContract(slot);
      const val = validatePreventiveOutput(payload, targetYear);
      if (!val.isValid) {
        throw new Error(`PREVENTIVE_OUTPUT_VALIDATION_ERROR: ${val.errorMessage}`);
      }
      contractPayloads.push(payload);
    }

    let durationMs = Date.now() - startTimeMs;
    if (startHr && process.hrtime) {
      const endHr = process.hrtime.bigint();
      durationMs = Number(endHr - startHr) / 1e6;
    }

    return {
      engine_version: AG002_ENGINE_VERSION,
      dataset_ref: 'AG002-DATA-MAP-001',
      target_year: targetYear,
      generation_date: generationDateStr,
      calendar_reference: calendarReference,
      audit_summary: {
        machines_scanned: input.machines.length,
        machines_eligible: eligibleCount,
        machines_scheduled: scheduledSlots.length,
        machines_blocked: blockedCount,
        looms_count: loomsCount,
        standard_machines_count: standardCount,
        total_slots_planned: scheduledSlots.length,
        duration_ms: Math.round(durationMs * 100) / 100,
        llm_used: false,
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost_usd: 0
      },
      rules_versions: AG002_RULE_VERSIONS,
      schedule_items: scheduledSlots,
      budget_summary: budgetSummary,
      machine_profiles: machineProfiles,
      contract_payloads: contractPayloads
    };
  }
}
