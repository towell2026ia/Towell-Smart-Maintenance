// supabase/functions/agents-orchestrator/agents/ag008/guards/failure-machine-guard.ts
// Failure Machine Guard for AG-008 (v1.0)
// Frozen under Token: AG008-FAILURE-IDENTITY-RULES-001

export interface MachineValidationResult {
  isValid: boolean;
  resolvedMachineId: string | null;
  status: 'VALID_OFFICIAL_MACHINE' | 'UNATTRIBUTED_FAILURE' | 'INVALID_MACHINE_REFERENCE';
}

export function validateMachineIdentity(
  candidateId: string | null | undefined,
  validMachineCatalog: Set<string> | string[]
): MachineValidationResult {
  const catalogSet = Array.isArray(validMachineCatalog) ? new Set(validMachineCatalog) : validMachineCatalog;

  if (!candidateId || typeof candidateId !== 'string' || candidateId.trim() === '') {
    return {
      isValid: false,
      resolvedMachineId: null,
      status: 'UNATTRIBUTED_FAILURE'
    };
  }

  const cleanId = candidateId.trim().toUpperCase();

  if (catalogSet.has(cleanId)) {
    return {
      isValid: true,
      resolvedMachineId: cleanId,
      status: 'VALID_OFFICIAL_MACHINE'
    };
  }

  // Attempt standard prefix normalizations (e.g. "TELAR 202" -> "TELAR-202" or "T202" -> "TELAR-202")
  const hyphenated = cleanId.replace(/\s+/g, '-');
  if (catalogSet.has(hyphenated)) {
    return {
      isValid: true,
      resolvedMachineId: hyphenated,
      status: 'VALID_OFFICIAL_MACHINE'
    };
  }

  return {
    isValid: false,
    resolvedMachineId: null,
    status: 'INVALID_MACHINE_REFERENCE'
  };
}
