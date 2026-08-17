// supabase/functions/agents-orchestrator/agents/ag009/ag009_2/guards/autonomous-machine-guard.ts
// Guard for Machine Existence, Active Status, and Department Support for Autonomous Maintenance (§12 & §13 PRD)

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DepartmentCode } from '../../types/ag009.types.ts';
import { AutonomousConnectorError } from '../errors/autonomous-error-catalog.ts';

export interface AutonomousMachineValidationResult {
  machine_id: string;
  department: DepartmentCode;
  criticidad: 'A' | 'B' | 'C';
  activo: boolean;
}

const VALID_DEPARTMENTS: Set<string> = new Set(['PF', 'CF', 'TF', 'AF']);

export async function validateAutonomousMachineGuard(
  supabase: SupabaseClient | null,
  machineId: string,
  localCatalogFallback?: Array<{ equipo_towell: string; departamento_codigo?: string; area?: string; activo?: boolean; criticidad?: string }>
): Promise<AutonomousMachineValidationResult> {
  const normId = String(machineId || '').trim().toUpperCase();

  let machRecord: {
    equipo_towell: string;
    departamento_codigo?: string;
    area?: string;
    activo?: boolean;
    criticidad?: string;
  } | null = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('cat_maquinas')
        .select('equipo_towell, departamento_codigo, area, activo, criticidad')
        .ilike('equipo_towell', normId)
        .maybeSingle();

      if (!error && data) {
        machRecord = data;
      }
    } catch (e) {
      console.warn('[AutonomousMachineGuard] DB query failed, falling back to local catalog:', e);
    }
  }

  // Fallback to local catalog if provided (for offline or standalone test suite)
  if (!machRecord && localCatalogFallback && Array.isArray(localCatalogFallback)) {
    const found = localCatalogFallback.find(
      m => m.equipo_towell && m.equipo_towell.trim().toUpperCase() === normId
    );
    if (found) {
      machRecord = found;
    }
  }

  // 1. Machine Existence Check
  if (!machRecord) {
    throw new AutonomousConnectorError(
      'MACHINE_NOT_FOUND',
      `La máquina '${normId}' no se encuentra registrada en cat_maquinas.`
    );
  }

  // 2. Active Status Check
  if (machRecord.activo === false) {
    throw new AutonomousConnectorError(
      'MACHINE_INACTIVE',
      `La máquina '${normId}' se encuentra inactiva (activo = false). No se pueden registrar rutinas autónomas en máquinas inactivas.`
    );
  }

  // 3. Department Resolution & Validation (PF, CF, TF, AF)
  let rawDept = (machRecord.departamento_codigo || machRecord.area || '').toUpperCase().trim();
  if (!VALID_DEPARTMENTS.has(rawDept)) {
    // Auto-infer by standard prefix if not explicitly set
    if (normId.startsWith('COS')) rawDept = 'CF';
    else if (normId.startsWith('TIN') || normId.startsWith('JET') || normId.startsWith('RAM')) rawDept = 'TF';
    else if (normId.startsWith('COMP') || normId.startsWith('CHIL') || normId.startsWith('CALD')) rawDept = 'AF';
    else rawDept = 'PF';
  }

  const deptCode = VALID_DEPARTMENTS.has(rawDept) ? (rawDept as DepartmentCode) : 'PF';
  const critRaw = String(machRecord.criticidad || 'B').toUpperCase().trim();
  const criticidad: 'A' | 'B' | 'C' = critRaw === 'A' ? 'A' : critRaw === 'C' ? 'C' : 'B';

  return {
    machine_id: machRecord.equipo_towell,
    department: deptCode,
    criticidad,
    activo: true
  };
}
