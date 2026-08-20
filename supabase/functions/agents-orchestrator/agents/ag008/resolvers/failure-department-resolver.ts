// supabase/functions/agents-orchestrator/agents/ag008/resolvers/failure-department-resolver.ts
// Department Resolver for AG-008 (v1.0)

import type { DepartmentCode } from '../types/ag008.types.ts';

const VALID_DEPTS = new Set<DepartmentCode>(['PF', 'CF', 'TF', 'AF']);

export function resolveDepartment(
  deptInput: string | null | undefined,
  machineDeptCatalog?: Map<string, DepartmentCode>,
  machineId?: string | null
): DepartmentCode | null {
  // 1. If machine catalog gives department, use official catalog
  if (machineId && machineDeptCatalog && machineDeptCatalog.has(machineId)) {
    return machineDeptCatalog.get(machineId)!;
  }

  if (!deptInput || typeof deptInput !== 'string') return null;

  const upper = deptInput.trim().toUpperCase();
  if (VALID_DEPTS.has(upper as DepartmentCode)) {
    return upper as DepartmentCode;
  }

  // Common aliases
  if (upper.includes('TEJIDO') || upper.includes('TELARES') || upper === 'TEJ') return 'PF';
  if (upper.includes('CORTE') || upper.includes('CONFECCION') || upper === 'CONF') return 'CF';
  if (upper.includes('TINTORERIA') || upper.includes('TINT') || upper === 'ACABADO') return 'TF';
  if (upper.includes('ADMIN') || upper.includes('SERVICIOS') || upper === 'MTTO') return 'AF';

  return null;
}
