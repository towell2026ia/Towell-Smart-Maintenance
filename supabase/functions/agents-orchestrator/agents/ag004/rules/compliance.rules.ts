// supabase/functions/agents-orchestrator/agents/ag004/rules/compliance.rules.ts
// Manifest: AG004-COMPLIANCE-RULES-001

export const COMPLIANCE_RULES_VERSION = 'AG004-COMPLIANCE-RULES-001';

export function calculateComplianceRate(completedCount: number, eligibleCount: number): number {
  if (eligibleCount <= 0) return 1.0;
  return Math.min(1.0, Math.max(0.0, completedCount / eligibleCount));
}
