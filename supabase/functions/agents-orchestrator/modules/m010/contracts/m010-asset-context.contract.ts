// supabase/functions/agents-orchestrator/modules/m010/contracts/m010-asset-context.contract.ts
// Consumer Context Filter Contract for M-010 (v1.0)
// Frozen under Token: M010-ASSET-CONTEXT-001
// Invariant: Minimum necessary context; consumers receive ONLY requested sections (§88-92 PRD)

import type { Asset360, AssetContextRequest, AssetContextResponse, AssetSectionType } from '../types/m010.types.ts';

export function filterAssetContextForConsumer(
  fullAsset: Asset360,
  request: AssetContextRequest
): AssetContextResponse {
  const startTime = Date.now();
  const partialData: Partial<Asset360> = {
    asset_id: fullAsset.asset_id,
    record_version: fullAsset.record_version,
    retrieved_at: fullAsset.retrieved_at
  };

  const sectionsProvided: AssetSectionType[] = [];

  for (const section of request.requested_sections) {
    sectionsProvided.push(section);
    if (section === 'IDENTITY') {
      partialData.identity = fullAsset.identity;
      partialData.current_status = fullAsset.current_status;
    } else if (section === 'WORK_ORDERS') {
      let wos = fullAsset.work_orders;
      if (request.date_range?.from_date) {
        wos = wos.filter(w => w.fecha_creacion >= request.date_range!.from_date!);
      }
      if (request.limit_per_section) {
        wos = wos.slice(0, request.limit_per_section);
      }
      partialData.work_orders = wos;
    } else if (section === 'FAILURES') {
      let fails = fullAsset.failure_history;
      if (request.date_range?.from_date) {
        fails = fails.filter(f => f.fecha >= request.date_range!.from_date!);
      }
      if (request.limit_per_section) {
        fails = fails.slice(0, request.limit_per_section);
      }
      partialData.failure_history = fails;
    } else if (section === 'MAINTENANCE') {
      let plans = fullAsset.maintenance_plans;
      if (request.limit_per_section) {
        plans = plans.slice(0, request.limit_per_section);
      }
      partialData.maintenance_plans = plans;
    } else if (section === 'PARTS') {
      let parts = fullAsset.parts_history;
      if (request.limit_per_section) {
        parts = parts.slice(0, request.limit_per_section);
      }
      partialData.parts_history = parts;
    } else if (section === 'ALERTS') {
      partialData.alerts = fullAsset.alerts;
    } else if (section === 'TIMELINE') {
      let tl = fullAsset.timeline;
      if (request.limit_per_section) {
        tl = tl.slice(0, request.limit_per_section);
      }
      partialData.timeline = tl;
    }
  }

  return {
    asset_id: fullAsset.asset_id,
    consumer_id: request.consumer_id,
    sections_provided: sectionsProvided,
    data: partialData,
    retrieved_at: new Date().toISOString(),
    duration_ms: Date.now() - startTime
  };
}
