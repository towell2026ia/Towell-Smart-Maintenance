// supabase/functions/agents-orchestrator/agents/ag004/guards/autonomous-eligibility-guard.ts
// Strict Eligibility Guard for AG-004

import { MachineRecord, EligibilityStatus, DepartmentCode } from '../types/ag004.types.ts';
import { normalizeActiveStatus, extractDepartment } from '../rules/eligibility.rules.ts';

export interface EligibilityEvaluation {
  isEligible: boolean;
  status: EligibilityStatus;
  machineId: string;
  department?: DepartmentCode;
  reason?: string;
}

export function evaluateMachineEligibility(machine: MachineRecord | null | undefined): EligibilityEvaluation {
  if (!machine || typeof machine !== 'object') {
    return {
      isEligible: false,
      status: 'INVALID_MACHINE_RECORD',
      machineId: 'UNKNOWN',
      reason: 'El registro de máquina proporcionado es nulo o inválido.'
    };
  }

  const rawId = machine.equipo_towell || machine.id_maquina;
  if (!rawId || typeof rawId !== 'string' || rawId.trim().length === 0) {
    return {
      isEligible: false,
      status: 'MACHINE_NOT_FOUND',
      machineId: 'UNKNOWN',
      reason: 'El identificador de máquina (equipo_towell) no está presente.'
    };
  }

  const normId = rawId.trim().toUpperCase();

  // 1. Check active status
  const isActive = normalizeActiveStatus(machine.activo);
  if (!isActive) {
    return {
      isEligible: false,
      status: 'MACHINE_INACTIVE',
      machineId: normId,
      reason: `La máquina ${normId} se encuentra inactiva o dada de baja.`
    };
  }

  // 2. Check department
  const dept = extractDepartment(machine);
  if (!dept) {
    const rawDept = machine.departamento_codigo || machine.area || 'DESCONOCIDO';
    return {
      isEligible: false,
      status: 'INVALID_DEPARTMENT',
      machineId: normId,
      reason: `El departamento '${rawDept}' no pertenece a la cobertura oficial de AG-004 (PF, CF, TF, AF).`
    };
  }

  return {
    isEligible: true,
    status: 'ELIGIBLE',
    machineId: normId,
    department: dept
  };
}
