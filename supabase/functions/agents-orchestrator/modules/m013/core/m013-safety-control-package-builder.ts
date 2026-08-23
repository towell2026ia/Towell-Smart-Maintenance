// supabase/functions/agents-orchestrator/modules/m013/core/m013-safety-control-package-builder.ts
// Package Builder constructing the canonical SafetyControlPackage (v1.0)
// Frozen under Token: M013-SAFETY-CONTROL-PACKAGE-001

import type {
  SafetyControlPackage,
  SafetyRequirement,
  LotoControl,
  PermitControl,
  SafetyEvidence,
  HumanConfirmation,
  SafetyConflict,
  SafetyBlockingReason,
  M013SafetyStatus
} from '../types/m013.types.ts';
import { M013TraceabilityBuilder } from './m013-traceability-builder.ts';

export class M013SafetyControlPackageBuilder {
  public static build(
    workOrderId: string,
    assetId: string,
    evaluationAt: string,
    requirements: SafetyRequirement[],
    lotoControl: LotoControl,
    permitControl: PermitControl,
    evidence: SafetyEvidence[],
    humanConfirmations: HumanConfirmation[],
    conflicts: SafetyConflict[],
    blockingReasons: SafetyBlockingReason[],
    statusResult: { status: M013SafetyStatus; is_blocked: boolean; controls_complete: boolean }
  ): SafetyControlPackage {
    const missingControls: string[] = [];
    if (lotoControl.is_required && lotoControl.status !== 'VERIFIED_BY_HUMAN') {
      missingControls.push('LOTO_VERIFICATION_PENDING');
    }
    if (permitControl.is_required && permitControl.status !== 'APPROVED_BY_HUMAN') {
      missingControls.push('PERMIT_APPROVAL_PENDING');
    }

    const traceability = M013TraceabilityBuilder.build(
      evaluationAt,
      requirements.length,
      2, // LOTO + Permit
      evidence.length,
      humanConfirmations.length,
      conflicts.length,
      blockingReasons.length
    );

    return {
      work_order_id: workOrderId,
      asset_id: assetId,
      evaluation_at: evaluationAt,
      requirements,
      loto_control: lotoControl,
      permit_control: permitControl,
      evidence,
      human_confirmations: humanConfirmations,
      missing_controls: missingControls,
      conflicts,
      blocking_reasons: blockingReasons,
      status: statusResult.status,
      is_blocked: statusResult.is_blocked,
      controls_complete: statusResult.controls_complete,
      traceability
    };
  }
}
