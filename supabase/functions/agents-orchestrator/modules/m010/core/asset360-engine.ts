// supabase/functions/agents-orchestrator/modules/m010/core/asset360-engine.ts
// Master Deterministic Asset 360 Aggregation Engine for M-010 (v1.0)
// Frozen under Token: M010-ASSET360-ENGINE-001
// Invariant: 100% deterministic read-only aggregation; zero LLM calls, zero tokens, $0.00 USD (§1-8 PRD-M-010.2-R1)

import { MachineFetcher } from '../fetchers/machine-fetcher.ts';
import { WorkOrdersFetcher, type RawWorkOrderRecord } from '../fetchers/work-orders-fetcher.ts';
import { MaintenanceFetcher, type RawMaintenancePlanRecord } from '../fetchers/maintenance-fetcher.ts';
import { ChecklistsFetcher, type RawChecklistDefinition, type RawChecklistExecution } from '../fetchers/checklists-fetcher.ts';
import { SurveysFetcher, type RawSurveyRecord } from '../fetchers/surveys-fetcher.ts';
import { FindingsFetcher, type RawFindingRecord } from '../fetchers/findings-fetcher.ts';
import { FailuresFetcher, type RawFailureRecord } from '../fetchers/failures-fetcher.ts';
import { PartsFetcher, type RawPartRecord } from '../fetchers/parts-fetcher.ts';
import { DowntimeFetcher, type RawDowntimeRecord } from '../fetchers/downtime-fetcher.ts';
import { AlertsFetcher, type RawAlertRecord } from '../fetchers/alerts-fetcher.ts';
import { buildAsset360Record } from './asset360-builder.ts';
import { filterAssetContextForConsumer } from '../context/asset-context-filter.ts';
import { sanitizePaginationOptions, type PaginationOptions } from '../pagination/asset-pagination.ts';
import { validateAsset360Output } from '../validators/asset360-validator.ts';
import { AssetQueryAuditor } from '../audit/asset-query-audit.ts';
import type { RawMachineRecord } from '../contracts/m010-asset-identity.contract.ts';
import type { Asset360, AssetSummary, AssetContextRequest, AssetContextResponse, AssetSectionType } from '../types/m010.types.ts';

export interface Asset360EngineRepositories {
  machines: RawMachineRecord[];
  workOrders: RawWorkOrderRecord[];
  maintenancePlans: RawMaintenancePlanRecord[];
  checklistDefinitions?: RawChecklistDefinition[];
  checklistExecutions?: RawChecklistExecution[];
  surveys?: RawSurveyRecord[];
  findings?: RawFindingRecord[];
  failures: RawFailureRecord[];
  parts: RawPartRecord[];
  downtime?: RawDowntimeRecord[];
  alerts: RawAlertRecord[];
}

export interface AssetQueryRequest {
  request_id?: string;
  event_id?: string | null;
  correlation_id?: string | null;
  asset_id: string;
  mode?: 'SUMMARY' | 'DETAIL' | 'CONTEXT';
  sections?: AssetSectionType[];
  consumer_request?: AssetContextRequest;
  pagination?: PaginationOptions;
}

export class Asset360Engine {
  private machineFetcher: MachineFetcher;
  private workOrdersFetcher: WorkOrdersFetcher;
  private maintenanceFetcher: MaintenanceFetcher;
  private checklistsFetcher: ChecklistsFetcher;
  private surveysFetcher: SurveysFetcher;
  private findingsFetcher: FindingsFetcher;
  private failuresFetcher: FailuresFetcher;
  private partsFetcher: PartsFetcher;
  private downtimeFetcher: DowntimeFetcher;
  private alertsFetcher: AlertsFetcher;

  constructor(repos: Asset360EngineRepositories) {
    this.machineFetcher = new MachineFetcher(repos.machines);
    this.workOrdersFetcher = new WorkOrdersFetcher(repos.workOrders);
    this.maintenanceFetcher = new MaintenanceFetcher(repos.maintenancePlans);
    this.checklistsFetcher = new ChecklistsFetcher(repos.checklistDefinitions || [], repos.checklistExecutions || []);
    this.surveysFetcher = new SurveysFetcher(repos.surveys || []);
    this.findingsFetcher = new FindingsFetcher(repos.findings || []);
    this.failuresFetcher = new FailuresFetcher(repos.failures);
    this.partsFetcher = new PartsFetcher(repos.parts);
    this.downtimeFetcher = new DowntimeFetcher(repos.downtime || []);
    this.alertsFetcher = new AlertsFetcher(repos.alerts);
  }

  public async getAsset360(request: AssetQueryRequest): Promise<{
    success: boolean;
    data: Asset360 | AssetSummary | AssetContextResponse;
    record_version: string;
    audit: any;
    duration_ms: number;
  }> {
    const startTime = Date.now();
    const requestId = request.request_id || `REQ-M010-${Date.now()}`;
    const mode = request.mode || 'DETAIL';
    const pagination = sanitizePaginationOptions(request.pagination);

    // 1. Resolve Asset Identity (Critical Section)
    const identity = await this.machineFetcher.fetchIdentity(request.asset_id);
    const assetId = identity.asset_id;

    // 2. Fetch Data from Closed Source Fetchers
    const woResult = await this.workOrdersFetcher.fetchByMachineId(assetId, {
      limit: pagination.limit,
      dateFrom: pagination.date_from || undefined,
      dateTo: pagination.date_to || undefined
    });

    const maintenance = await this.maintenanceFetcher.fetchByMachineId(assetId, {
      limit: pagination.limit,
      dateFrom: pagination.date_from || undefined,
      dateTo: pagination.date_to || undefined
    });

    const checklists = await this.checklistsFetcher.fetchByMachineId(assetId, {
      limit: pagination.limit,
      dateFrom: pagination.date_from || undefined,
      dateTo: pagination.date_to || undefined
    });

    const surveys = await this.surveysFetcher.fetchByMachineId(assetId, {
      limit: pagination.limit,
      dateFrom: pagination.date_from || undefined,
      dateTo: pagination.date_to || undefined
    });

    const findings = await this.findingsFetcher.fetchByMachineId(assetId, {
      limit: pagination.limit,
      dateFrom: pagination.date_from || undefined,
      dateTo: pagination.date_to || undefined
    });

    const failures = await this.failuresFetcher.fetchByMachineId(assetId, {
      limit: pagination.limit,
      dateFrom: pagination.date_from || undefined,
      dateTo: pagination.date_to || undefined
    });

    const parts = await this.partsFetcher.fetchByMachineId(assetId, {
      limit: pagination.limit,
      dateFrom: pagination.date_from || undefined,
      dateTo: pagination.date_to || undefined
    });

    const downtime = await this.downtimeFetcher.fetchByMachineId(assetId, {
      limit: pagination.limit,
      dateFrom: pagination.date_from || undefined,
      dateTo: pagination.date_to || undefined
    });

    const alerts = await this.alertsFetcher.fetchByMachineId(assetId, {
      limit: pagination.limit
    });

    // 3. Assemble Asset360 Record
    const fullAsset360 = buildAsset360Record({
      identity,
      workOrders: woResult.work_orders,
      subtasks: woResult.subtasks,
      failures,
      maintenancePlans: maintenance,
      surveys,
      findings,
      parts,
      downtime,
      alerts
    });

    // 4. Validate Output Contract
    const validation = validateAsset360Output(fullAsset360);
    if (!validation.isValid) {
      throw new Error(`[M010_ASSET360_VALIDATION_FAILED] ${validation.errors.join(', ')}`);
    }

    const durationMs = Date.now() - startTime;

    // 5. Audit Logging (Minimizing Sensitive Dump)
    const auditRecord = {
      request_id: requestId,
      event_id: request.event_id || null,
      correlation_id: request.correlation_id || null,
      module_id: 'M-010' as const,
      asset_id: assetId,
      mode,
      sections_requested: request.sections || ['IDENTITY', 'WORK_ORDERS', 'FAILURES', 'MAINTENANCE', 'PARTS', 'ALERTS', 'TIMELINE'],
      sections_returned: request.sections || ['IDENTITY', 'WORK_ORDERS', 'FAILURES', 'MAINTENANCE', 'PARTS', 'ALERTS', 'TIMELINE'],
      date_from: pagination.date_from,
      date_to: pagination.date_to,
      record_counts: {
        work_orders: woResult.work_orders.length,
        subtasks: woResult.subtasks.length,
        maintenance_plans: maintenance.length,
        checklists: checklists.length,
        surveys: surveys.length,
        findings: findings.length,
        failures: failures.length,
        parts: parts.length,
        downtime: downtime.length,
        alerts: alerts.length,
        timeline_events: fullAsset360.timeline.length
      },
      database_query_count: 8,
      asset_record_version: fullAsset360.record_version,
      duration_ms: durationMs,
      status: 'SUCCESS' as const,
      created_at: new Date().toISOString()
    };

    AssetQueryAuditor.recordAudit(auditRecord);

    // 6. Handle Different Query Modes
    let responseData: Asset360 | AssetSummary | AssetContextResponse = fullAsset360;

    if (mode === 'SUMMARY') {
      responseData = {
        asset_id: fullAsset360.asset_id,
        identity: fullAsset360.identity,
        current_status: fullAsset360.current_status,
        total_work_orders: fullAsset360.work_orders.length,
        total_failures: fullAsset360.failure_history.length,
        total_maintenances: fullAsset360.maintenance_plans.length,
        data_completeness: fullAsset360.data_completeness,
        retrieved_at: fullAsset360.retrieved_at
      };
    } else if (mode === 'CONTEXT' && request.consumer_request) {
      responseData = filterAssetContextForConsumer(fullAsset360, request.consumer_request);
    }

    return {
      success: true,
      data: responseData,
      record_version: fullAsset360.record_version,
      audit: auditRecord,
      duration_ms: durationMs
    };
  }
}
