// supabase/functions/agents-orchestrator/agents/ag003/guards/loom-eligibility-guard.ts
// Loom Eligibility Guard (§8, §9, §21-26 PRD)

export interface LoomEligibilityResult {
  isEligible: boolean;
  code?: 'ELIGIBLE' | 'MACHINE_NOT_FOUND' | 'MACHINE_INACTIVE' | 'MACHINE_NOT_PREDICTIVE_SCOPE';
  reason?: string;
}

export function validateLoomEligibility(machine: {
  machine_id?: string;
  equipo_towell?: string;
  departamento_codigo?: string;
  area?: string;
  activo?: boolean;
  tipo?: string;
} | null | undefined): LoomEligibilityResult {
  if (!machine) {
    return {
      isEligible: false,
      code: 'MACHINE_NOT_FOUND',
      reason: 'Máquina no encontrada en el catálogo de activos.'
    };
  }

  const dept = String(machine.departamento_codigo || machine.area || '').toUpperCase().trim();
  if (dept !== 'PF') {
    return {
      isEligible: false,
      code: 'MACHINE_NOT_PREDICTIVE_SCOPE',
      reason: `El departamento "${dept}" está fuera del alcance de AG-003 v1 (Exclusivo PF/Telares).`
    };
  }

  if (machine.activo === false) {
    return {
      isEligible: false,
      code: 'MACHINE_INACTIVE',
      reason: 'El telar se encuentra inactivo en el catálogo de máquinas.'
    };
  }

  return {
    isEligible: true,
    code: 'ELIGIBLE'
  };
}
