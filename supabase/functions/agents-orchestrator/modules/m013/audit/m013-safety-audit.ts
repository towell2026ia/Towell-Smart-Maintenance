// supabase/functions/agents-orchestrator/modules/m013/audit/m013-safety-audit.ts
// Audit Logger for M-013 Safety Control Engine (v1.0)
// Frozen under Token: M013-SAFETY-ENGINE-001

import type { SafetyControlPackage } from '../types/m013.types.ts';
import { M013SafetyConfigRegistry } from '../config/m013-safety-config-registry.ts';

export class M013SafetyAudit {
  public static logExecution(
    pkg: SafetyControlPackage,
    durationMs: number,
    requestId?: string
  ): any {
    const evidence = M013SafetyConfigRegistry.getCompositeSafetyModelEvidence();

    const auditEntry = {
      event_type: 'M013_SAFETY_CONTROL_EVALUATED',
      timestamp: new Date().toISOString(),
      request_id: requestId || `REQ-${pkg.work_order_id}`,
      module_id: 'M-013',
      work_order_id: pkg.work_order_id,
      asset_id: pkg.asset_id,
      evaluation_at: pkg.evaluation_at,
      safety_status: pkg.status,
      is_blocked: pkg.is_blocked,
      controls_complete: pkg.controls_complete,
      requirements_count: pkg.requirements.length,
      evidence_count: pkg.evidence.length,
      human_confirmations_count: pkg.human_confirmations.length,
      loto_status: pkg.loto_control.status,
      permit_status: pkg.permit_control.status,
      conflicts_count: pkg.conflicts.length,
      blocking_reasons_count: pkg.blocking_reasons.length,
      model_sha256: evidence.m013_safety_model_sha256,
      duration_ms: durationMs,
      provider: 'NONE',
      llm_calls: 0,
      tokens: 0,
      cost_usd: 0
    };

    return auditEntry;
  }
}
