// supabase/functions/agents-orchestrator/modules/m013/core/m013-safety-engine.ts
// Central Deterministic Safety Control Engine for M-013 (v1.0)
// Frozen under Token: M013-SAFETY-ENGINE-001

import type { M013ExecutionRequest, M013ExecutionResponse } from '../types/m013.types.ts';
import { M013InputValidator } from '../validators/m013-input-validator.ts';
import { M013OtResolver } from '../resolvers/m013-ot-resolver.ts';
import { M013AssetResolver } from '../resolvers/m013-asset-resolver.ts';
import { M013M012PackageResolver } from '../resolvers/m013-m012-package-resolver.ts';
import { M013SafetyRequirementResolver } from '../resolvers/m013-safety-requirement-resolver.ts';
import { M013HumanAuthorityValidator } from '../authority/m013-human-authority-validator.ts';
import { M013SafetyEvidenceResolver } from '../resolvers/m013-safety-evidence-resolver.ts';
import { M013LotoResolver } from '../resolvers/m013-loto-resolver.ts';
import { M013PermitResolver } from '../resolvers/m013-permit-resolver.ts';
import { M013SafetyConflictDetector } from '../conflicts/m013-safety-conflict-detector.ts';
import { M013SafetyBlockingEngine } from '../blocking/m013-safety-blocking-engine.ts';
import { M013SafetyStatusEngine } from '../status/m013-safety-status-engine.ts';
import { M013SafetyControlPackageBuilder } from './m013-safety-control-package-builder.ts';
import { M013TraceabilityValidator } from '../validators/m013-traceability-validator.ts';
import { M013OutputValidator } from '../validators/m013-output-validator.ts';
import { M013SafetyAudit } from '../audit/m013-safety-audit.ts';

export class M013SafetyEngine {
  public static execute(request: M013ExecutionRequest): M013ExecutionResponse {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // 1. Input Validation
    M013InputValidator.validate(request);

    const evaluationAt = request.evaluation_at || new Date().toISOString();

    // 2. OT & Asset Resolution
    const ot = M013OtResolver.resolve(request.work_order_id, request.work_order_raw);
    const assetId = M013AssetResolver.resolve(request.asset_id, request.work_order_raw, request.m012_package);

    // 3. M-012 Upstream Resolution
    const m012Data = M013M012PackageResolver.resolve(request.m012_package);

    // 4. Requirements Resolution
    const requirements = M013SafetyRequirementResolver.resolve(
      m012Data.safety_dependencies,
      request.work_order_raw,
      request.work_order_raw ? request.work_order_raw.ag011_memories : []
    );

    // 5. Human Authority Validation
    const humanConfirmations = M013HumanAuthorityValidator.validateConfirmations(
      request.human_confirmations_raw || [],
      ot.id
    );

    // 6. Evidence Resolution
    const evidence = M013SafetyEvidenceResolver.resolve(
      requirements,
      request.work_order_raw ? request.work_order_raw.evidencias_seguridad_raw : [],
      humanConfirmations,
      evaluationAt
    );

    // 7. LOTO Resolution
    const lotoControl = M013LotoResolver.resolve(
      requirements,
      humanConfirmations,
      request.loto_raw || (request.work_order_raw ? request.work_order_raw.loto_raw : undefined)
    );

    // 8. Permit Resolution
    const permitControl = M013PermitResolver.resolve(
      requirements,
      request.permits_raw || (request.work_order_raw ? request.work_order_raw.permits_raw : []),
      evaluationAt
    );

    // 9. Conflict Detection
    const conflicts = M013SafetyConflictDetector.detect(
      request.work_order_raw,
      lotoControl,
      permitControl,
      request.checklists_raw || []
    );

    // 10. Blocking Engine
    const blockingReasons = M013SafetyBlockingEngine.evaluate(
      requirements,
      lotoControl,
      permitControl,
      conflicts
    );

    // 11. Status Engine
    const statusResult = M013SafetyStatusEngine.deriveStatus(
      blockingReasons,
      conflicts,
      requirements.length > 0
    );

    // 12. Package Building
    const pkg = M013SafetyControlPackageBuilder.build(
      ot.id,
      assetId,
      evaluationAt,
      requirements,
      lotoControl,
      permitControl,
      evidence,
      humanConfirmations,
      conflicts,
      blockingReasons,
      statusResult
    );

    // 13. Traceability Validation
    M013TraceabilityValidator.validate(pkg);

    const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const durationMs = Number((t1 - t0).toFixed(3));

    const response: M013ExecutionResponse = {
      success: true,
      module_id: 'M-013',
      version: '1.0',
      work_order_id: ot.id,
      asset_id: assetId,
      evaluation_at: evaluationAt,
      package: pkg,
      telemetry: {
        duration_ms: durationMs,
        llm_calls: 0,
        tokens: 0,
        cost_usd: 0
      }
    };

    // 14. Output Validation
    M013OutputValidator.validate(response);

    // 15. Audit Execution
    M013SafetyAudit.logExecution(pkg, durationMs, request.request_id);

    return response;
  }
}
