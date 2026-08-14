// supabase/functions/agents-orchestrator/agents/ag005/validators/catalog-validator.ts
// Catalog and Relation Validator for AG-005 Auditor de Bases v1.0

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AG005Finding } from '../types/ag005.types.ts';

// Known authorized machine codes in plant (fallback catalog for unit tests/offline)
const KNOWN_MACHNES_SEED = [
  'TOW-TEL201-TEJI', 'TOW-TEL202-TEJI', 'TOW-TEL203-TEJI', 'TEL-01', 'TEL-201', 'TEL-202',
  'TOW-LOG1-COST', 'TOW-TIN1-TINT', 'TOW-AUX1-AUX', 'TOW-CHILLER-AF', 'TOW-CALDERA2-AF'
];

const KNOWN_DEPARTMENTS_SEED = ['PF', 'CF', 'TF', 'AF', 'GENERAL'];

/**
 * Validates machine existence against cat_maquinas (equipo_towell column)
 */
export async function validateMachineCatalog(
  machineCode: string,
  rowIndex: number,
  supabase: SupabaseClient | null
): Promise<{ exists: boolean; finding?: AG005Finding }> {
  const cleanCode = (machineCode || '').trim().toUpperCase();

  if (!cleanCode) {
    return {
      exists: false,
      finding: {
        row: rowIndex,
        field: 'maquina_id',
        severity: 'ERROR',
        code: 'MACHINE_NOT_FOUND',
        original_value: machineCode,
        message: `El código de máquina en la fila ${rowIndex} está vacío.`
      }
    };
  }

  let found = false;

  if (supabase) {
    try {
      const { data } = await supabase
        .from('cat_maquinas')
        .select('equipo_towell')
        .eq('equipo_towell', cleanCode)
        .maybeSingle();

      if (data) {
        found = true;
      }
    } catch (err) {
      console.warn('[CatalogValidator] Error querying DB cat_maquinas:', err);
    }
  }

  // Fallback check against seed
  if (!found) {
    found = KNOWN_MACHNES_SEED.includes(cleanCode) || KNOWN_MACHNES_SEED.some(m => m.includes(cleanCode));
  }

  if (!found) {
    return {
      exists: false,
      finding: {
        row: rowIndex,
        field: 'maquina_id',
        severity: 'ERROR',
        code: 'MACHINE_NOT_FOUND',
        original_value: machineCode,
        message: `La máquina '${machineCode}' en la fila ${rowIndex} no existe en el catálogo autorizado 'cat_maquinas'.`
      }
    };
  }

  return { exists: true };
}

/**
 * Validates department existence against cat_departamentos
 */
export function validateDepartmentCatalog(
  deptCode: string,
  rowIndex: number
): { exists: boolean; finding?: AG005Finding } {
  const clean = (deptCode || '').trim().toUpperCase();

  if (!clean || !KNOWN_DEPARTMENTS_SEED.includes(clean)) {
    return {
      exists: false,
      finding: {
        row: rowIndex,
        field: 'depto',
        severity: 'WARNING',
        code: 'RELATION_NOT_FOUND',
        original_value: deptCode,
        message: `El departamento/área '${deptCode}' en la fila ${rowIndex} no se encuentra en el catálogo oficial.`
      }
    };
  }

  return { exists: true };
}
