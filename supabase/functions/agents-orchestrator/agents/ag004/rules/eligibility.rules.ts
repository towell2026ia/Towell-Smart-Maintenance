// supabase/functions/agents-orchestrator/agents/ag004/rules/eligibility.rules.ts
// Manifest: AG004-ELIGIBILITY-RULES-001

import { DepartmentCode } from '../types/ag004.types.ts';

export const ELIGIBILITY_RULES_VERSION = 'AG004-ELIGIBILITY-RULES-001';

export const ALLOWED_DEPARTMENTS: ReadonlySet<DepartmentCode> = new Set<DepartmentCode>(['PF', 'CF', 'TF', 'AF']);

export function normalizeActiveStatus(activo: any): boolean {
  if (activo === undefined || activo === null) return true; // Default to active if omitted
  if (typeof activo === 'boolean') return activo;
  if (typeof activo === 'number') return activo === 1;
  const str = String(activo).trim().toLowerCase();
  return str === 'true' || str === '1' || str === 'activo' || str === 'si';
}

export function extractDepartment(record: { area?: string; departamento_codigo?: string }): DepartmentCode | null {
  const raw = (record.departamento_codigo || record.area || '').trim().toUpperCase();
  if (ALLOWED_DEPARTMENTS.has(raw as DepartmentCode)) {
    return raw as DepartmentCode;
  }
  return null;
}
