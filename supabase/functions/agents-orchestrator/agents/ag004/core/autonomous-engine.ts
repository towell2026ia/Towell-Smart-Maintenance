// supabase/functions/agents-orchestrator/agents/ag004/core/autonomous-engine.ts
// Master Deterministic Engine for AG-004 — Autónomo Semanal (v1.0 Frozen)

import {
  MachineRecord,
  ExistingScheduleRecord,
  ScheduledAutonomousItem,
  AutonomousScheduleContractPayload,
  EngineAuditRecord,
  DepartmentCode
} from '../types/ag004.types.ts';
import { resolveIsoWeekFromKey, resolveIsoWeekFromDate } from '../resolvers/iso-week-resolver.ts';
import { collectWeeklyCoverage } from '../collectors/weekly-coverage-collector.ts';
import { balanceMachinesAcrossOperatingDays } from '../balancers/daily-load-balancer.ts';
import { scheduleAutonomousWeek } from '../schedulers/weekly-autonomous-scheduler.ts';
import { buildAutonomousScheduleContract } from '../builders/autonomous-schedule-contract-builder.ts';
import { validateAutonomousScheduleContract } from '../validators/autonomous-schedule-validator.ts';
import { buildAutonomousSurveyContext, AutonomousSurveyContext } from '../builders/autonomous-survey-context-builder.ts';
import { ELIGIBILITY_RULES_VERSION } from '../rules/eligibility.rules.ts';
import { WEEK_RULES_VERSION } from '../rules/week.rules.ts';
import { COVERAGE_RULES_VERSION } from '../rules/coverage.rules.ts';
import { LOAD_BALANCING_RULES_VERSION } from '../rules/load-balancing.rules.ts';
import { SCHEDULING_RULES_VERSION } from '../rules/scheduling.rules.ts';
import { IDEMPOTENCY_RULES_VERSION } from '../rules/idempotency.rules.ts';
import { CHECKLIST_VALIDATION_RULES_VERSION } from '../rules/checklist-validation.rules.ts';
import { FINDING_RULES_VERSION } from '../rules/finding.rules.ts';
import { COMPLIANCE_RULES_VERSION } from '../rules/compliance.rules.ts';

export interface AutonomousEngineInput {
  targetWeekKey?: string; // 'YYYY-Www'
  targetDate?: string | Date;
  machines: MachineRecord[];
  existingSchedules?: ExistingScheduleRecord[];
  correlationId: string;
  eventId?: string;
}

export interface AutonomousEngineOutput {
  status: 'SUCCESS' | 'NO_ELIGIBLE_MACHINES' | 'ALL_ALREADY_COVERED';
  targetWeek: string;
  isoYear: number;
  isoWeek: number;
  scheduledItems: ScheduledAutonomousItem[];
  contracts: AutonomousScheduleContractPayload[];
  surveys: AutonomousSurveyContext[];
  audit: EngineAuditRecord;
}

export class AutonomousEngine {
  public static runWeeklyGeneration(input: AutonomousEngineInput): AutonomousEngineOutput {
    const startTime = Date.now();

    // 1. Resolve Target ISO Week
    const weekInfo = input.targetWeekKey
      ? resolveIsoWeekFromKey(input.targetWeekKey)
      : resolveIsoWeekFromDate(input.targetDate || new Date());

    // 2. Collect Weekly Coverage and Check Existing
    const coverageResult = collectWeeklyCoverage(
      input.machines,
      weekInfo.iso_year,
      weekInfo.iso_week,
      input.existingSchedules || []
    );

    const deptBreakdown: Record<DepartmentCode, number> = coverageResult.departmentCounts;

    if (coverageResult.eligibleMachines.length === 0) {
      const audit: EngineAuditRecord = {
        event_id: input.eventId || `EVT-AUT-${Date.now()}`,
        correlation_id: input.correlationId,
        agent_id: 'AG-004',
        target_week: weekInfo.week_key,
        iso_year: weekInfo.iso_year,
        iso_week: weekInfo.iso_week,
        scanned_machines: input.machines.length,
        eligible_count: 0,
        already_scheduled_count: 0,
        already_completed_count: 0,
        new_schedules_count: 0,
        department_breakdown: deptBreakdown,
        daily_distribution: {},
        rules_applied: [
          ELIGIBILITY_RULES_VERSION,
          WEEK_RULES_VERSION,
          COVERAGE_RULES_VERSION
        ],
        execution_duration_ms: Date.now() - startTime,
        llm_used: false,
        tokens: 0,
        ai_cost: 0
      };

      return {
        status: 'NO_ELIGIBLE_MACHINES',
        targetWeek: weekInfo.week_key,
        isoYear: weekInfo.iso_year,
        isoWeek: weekInfo.iso_week,
        scheduledItems: [],
        contracts: [],
        surveys: [],
        audit
      };
    }

    // 3. Balance Machines Across Operating Days (Lunes a Sábado)
    const balanced = balanceMachinesAcrossOperatingDays(coverageResult.machinesToSchedule);

    // 4. Schedule Items
    const scheduledItems = scheduleAutonomousWeek(balanced.slots, weekInfo);

    // 5. Build and Validate Contracts
    const contracts: AutonomousScheduleContractPayload[] = [];
    const surveys: AutonomousSurveyContext[] = [];

    for (const item of scheduledItems) {
      const contract = buildAutonomousScheduleContract(item, input.correlationId);
      const val = validateAutonomousScheduleContract(contract);
      if (!val.isValid) {
        throw new Error(`CONTRACT_EMISSION_ERROR: ${val.errorCode} - ${val.errorMessage}`);
      }
      contracts.push(contract);

      const survey = buildAutonomousSurveyContext(item, input.correlationId);
      surveys.push(survey);
    }

    // 6. Build Daily Distribution Summary
    const dailyDist: Record<string, number> = {};
    for (const item of scheduledItems) {
      dailyDist[item.day_of_week] = (dailyDist[item.day_of_week] || 0) + 1;
    }

    // 7. Assemble Audit Record
    const audit: EngineAuditRecord = {
      event_id: input.eventId || `EVT-AUT-${Date.now()}`,
      correlation_id: input.correlationId,
      agent_id: 'AG-004',
      target_week: weekInfo.week_key,
      iso_year: weekInfo.iso_year,
      iso_week: weekInfo.iso_week,
      scanned_machines: input.machines.length,
      eligible_count: coverageResult.eligibleMachines.length,
      already_scheduled_count: coverageResult.alreadyCoveredCount,
      already_completed_count: 0,
      new_schedules_count: scheduledItems.length,
      department_breakdown: deptBreakdown,
      daily_distribution: dailyDist,
      rules_applied: [
        ELIGIBILITY_RULES_VERSION,
        WEEK_RULES_VERSION,
        COVERAGE_RULES_VERSION,
        LOAD_BALANCING_RULES_VERSION,
        SCHEDULING_RULES_VERSION,
        IDEMPOTENCY_RULES_VERSION,
        CHECKLIST_VALIDATION_RULES_VERSION,
        FINDING_RULES_VERSION,
        COMPLIANCE_RULES_VERSION
      ],
      execution_duration_ms: Date.now() - startTime,
      llm_used: false,
      tokens: 0,
      ai_cost: 0
    };

    return {
      status: scheduledItems.length > 0 ? 'SUCCESS' : 'ALL_ALREADY_COVERED',
      targetWeek: weekInfo.week_key,
      isoYear: weekInfo.iso_year,
      isoWeek: weekInfo.iso_week,
      scheduledItems,
      contracts,
      surveys,
      audit
    };
  }
}
