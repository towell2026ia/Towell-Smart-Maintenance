// supabase/functions/agents-orchestrator/agents/ag010/core/ag010-case-resolver.ts
// Deterministic Case Resolver for AG-010 (v1.0)
// Frozen under Token: AG010-CASE-RESOLVER-RULES-001
// Invariant: Stable, deterministic case_id anchoring (§17-23 PRD-AG-010.2)

import { buildCaseId, type AG010CaseScope } from '../contracts/ag010-case.contract.ts';

export class AG010CaseResolver {
  public static resolveCase(scope: AG010CaseScope): AG010CaseScope {
    const finalCaseId = scope.case_id || buildCaseId(scope.asset_id, scope.evaluation_at);
    return {
      ...scope,
      case_id: finalCaseId
    };
  }
}
