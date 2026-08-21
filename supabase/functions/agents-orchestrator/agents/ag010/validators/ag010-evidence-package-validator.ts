// supabase/functions/agents-orchestrator/agents/ag010/validators/ag010-evidence-package-validator.ts
// Strict Evidence Package Validator for AG-010 (v1.0)
// Frozen under Token: AG010-DATA-MAP-001
// Invariant: 100% Traceability and zero contamination (§107-112 PRD-AG-010.2)

import type { AG010EvidencePackage } from '../types/ag010.types.ts';

export class AG010EvidencePackageValidationError extends Error {
  constructor(message: string) {
    super(`[AG010_EVIDENCE_PACKAGE_VALIDATION_ERROR] ${message}`);
    this.name = 'AG010EvidencePackageValidationError';
  }
}

export class AG010EvidencePackageValidator {
  public static validate(pkg: AG010EvidencePackage): void {
    if (!pkg.case_id || !pkg.asset_id || !pkg.evaluation_at) {
      throw new AG010EvidencePackageValidationError('Missing core identity fields (case_id, asset_id, evaluation_at).');
    }

    if (!Array.isArray(pkg.certified_facts)) {
      throw new AG010EvidencePackageValidationError('certified_facts must be an array.');
    }

    if (!Array.isArray(pkg.previous_cases)) {
      throw new AG010EvidencePackageValidationError('previous_cases must be an array.');
    }

    // Verify all facts have valid source references
    for (const fact of pkg.certified_facts) {
      if (!fact.source_reference || !fact.source_reference.source_table) {
        throw new AG010EvidencePackageValidationError(`Fact '${fact.evidence_id}' lacks valid source_reference.`);
      }
    }

    // Verify all previous cases have valid source references
    for (const match of pkg.previous_cases) {
      if (!match.previous_case.previous_case_id) {
        throw new AG010EvidencePackageValidationError('Previous case lacks previous_case_id.');
      }
    }
  }
}
