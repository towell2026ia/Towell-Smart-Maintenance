// supabase/functions/agents-orchestrator/agents/ag009/ag009_3/guards/corrective-machine-guard.ts
// Machine & Department Guard for AG-009.3 (§11, §12 PRD)

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DepartmentCode } from '../../types/ag009.types.ts';
import { CorrectiveConnectorError } from '../errors/corrective-error-catalog.ts';

export interface ValidatedMachineResult {
  machine_id: string;
  department_code: DepartmentCode;
  criticidad?: string;
  nombre?: string;
}

export async function validateCorrectiveMachineGuard(
  supabase: SupabaseClient | null,
  rawMachineId: string,
  declaredDepartment: DepartmentCode,
  localCatalog?: Array<{
    equipo_towell?: string;
    id_maquina?: string;
    codigo_maquina?: string;
    id?: string;
    nombre?: string;
    departamento_codigo?: string;
    area?: string;
    activo?: boolean;
    criticidad?: string;
  }>
): Promise<ValidatedMachineResult> {
  const cleanId = String(rawMachineId || '').trim().toUpperCase();

  if (!cleanId) {
    throw new CorrectiveConnectorError(
      'MISSING_REQUIRED_DATA',
      'El identificador de máquina es obligatorio para la solicitud correctiva.'
    );
  }

  // 1. Verificar primero en catálogo local en memoria si existe
  if (localCatalog && localCatalog.length > 0) {
    const found = localCatalog.find(m => {
      const code = (m.equipo_towell || m.codigo_maquina || m.id_maquina || m.id || '').toUpperCase().trim();
      return code === cleanId;
    });

    if (!found) {
      throw new CorrectiveConnectorError(
        'MACHINE_NOT_FOUND',
        `La máquina "${cleanId}" no existe en el catálogo de activos de planta (cat_maquinas).`
      );
    }

    if (found.activo === false) {
      throw new CorrectiveConnectorError(
        'MACHINE_INACTIVE',
        `La máquina "${cleanId}" está marcada como inactiva o dada de baja.`
      );
    }

    const resolvedDept = (found.departamento_codigo || found.area || declaredDepartment || 'AF').toUpperCase().trim() as DepartmentCode;
    return {
      machine_id: cleanId,
      department_code: resolvedDept,
      criticidad: found.criticidad,
      nombre: found.nombre
    };
  }

  // 2. Si hay conexión a Supabase real
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('cat_maquinas')
        .select('equipo_towell, departamento_codigo, activo, criticidad, nombre')
        .eq('equipo_towell', cleanId)
        .maybeSingle();

      if (error) {
        console.warn(`[CorrectiveMachineGuard] DB Warning: ${error.message}`);
      }

      if (!data) {
        throw new CorrectiveConnectorError(
          'MACHINE_NOT_FOUND',
          `La máquina "${cleanId}" no existe en el catálogo de activos de planta (cat_maquinas).`
        );
      }

      if (data.activo === false) {
        throw new CorrectiveConnectorError(
          'MACHINE_INACTIVE',
          `La máquina "${cleanId}" está registrada pero se encuentra inactiva en planta.`
        );
      }

      const resolvedDept = (data.departamento_codigo || declaredDepartment || 'AF').toUpperCase().trim() as DepartmentCode;
      return {
        machine_id: cleanId,
        department_code: resolvedDept,
        criticidad: data.criticidad,
        nombre: data.nombre
      };
    } catch (err: any) {
      if (err instanceof CorrectiveConnectorError) throw err;
      console.warn('[CorrectiveMachineGuard] Error consultando Supabase, validando por convención:', err);
    }
  }

  // 3. Fallback determinístico si no hay catálogo
  return {
    machine_id: cleanId,
    department_code: declaredDepartment
  };
}
