// supabase/functions/agents-orchestrator/agents/ag009/ag009_1/guards/machine-guard.ts
// Machine Guard for AG-009.1 (§12, §13 PRD-AG-009.1)

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DepartmentCode } from '../../types/ag009.types.ts';
import { PreventiveConnectorError } from '../errors/preventive-error-catalog.ts';

export const ALLOWED_DEPARTMENTS: DepartmentCode[] = ['PF', 'CF', 'TF', 'AF'];

export interface MachineValidationOutput {
  machine_id: string;
  department: DepartmentCode;
  criticidad: string;
  activo: boolean;
}

export async function validateMachineGuard(
  supabase: SupabaseClient | null,
  machineId: string,
  localCatalog?: Array<{ equipo_towell: string; departamento_codigo?: string; activo?: boolean; criticidad?: string }>
): Promise<MachineValidationOutput> {
  const normId = machineId.trim().toUpperCase();

  let machRecord: { equipo_towell: string; departamento_codigo?: string; activo?: boolean; criticidad?: string } | null = null;

  // 1. Consultar Supabase si está disponible
  if (supabase) {
    const { data, error } = await supabase
      .from('cat_maquinas')
      .select('equipo_towell, departamento_codigo, activo, criticidad')
      .eq('equipo_towell', normId)
      .maybeSingle();

    if (!error && data) {
      machRecord = data;
    }
  }

  // 2. Fallback a catálogo local en memoria (para tests/offline)
  if (!machRecord && localCatalog) {
    machRecord = localCatalog.find(m => m.equipo_towell.toUpperCase() === normId) || null;
  }

  // Si no existe la máquina
  if (!machRecord) {
    throw new PreventiveConnectorError(
      'MACHINE_NOT_FOUND',
      `La máquina "${normId}" no existe en el catálogo de cat_maquinas.`
    );
  }

  // Si la máquina está inactiva
  if (machRecord.activo === false) {
    throw new PreventiveConnectorError(
      'MACHINE_INACTIVE',
      `La máquina "${normId}" está inactiva en cat_maquinas y no puede recibir órdenes preventivas.`
    );
  }

  // Validar y normalizar departamento
  const rawDept = String(machRecord.departamento_codigo || 'PF').toUpperCase().trim();
  const deptCode = ALLOWED_DEPARTMENTS.includes(rawDept as DepartmentCode) ? (rawDept as DepartmentCode) : 'PF';

  return {
    machine_id: machRecord.equipo_towell,
    department: deptCode,
    criticidad: machRecord.criticidad || 'B',
    activo: true
  };
}
