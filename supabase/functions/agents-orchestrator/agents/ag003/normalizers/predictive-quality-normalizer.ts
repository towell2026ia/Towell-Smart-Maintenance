// supabase/functions/agents-orchestrator/agents/ag003/normalizers/predictive-quality-normalizer.ts
// Predictive Quality Row Normalizer (§17, §18 PRD)

import { RawQualityRow } from '../types/ag003.types.ts';

export interface NormalizedQualityRow {
  machine_id: string;
  fecha: string;
  codigo_defecto: string;
  defecto: string;
  cantidad_defecto: number;
  pzas_rollo: number;
  mts_rollo: number;
  numero_serie: string;
  is_valid: boolean;
  validation_issue?: string;
}

export function normalizeQualityRow(raw: RawQualityRow): NormalizedQualityRow {
  const machineId = String(raw.maquina_id || raw.produccion || '').trim().toUpperCase();
  const dateStr = String(raw.fecha || '').trim().slice(0, 10);
  const defectCode = String(raw.codigo_defecto || '').trim().toUpperCase();
  const defectName = String(raw.defecto || 'DEFECTO_NO_ESPECIFICADO').trim();
  const serialNo = String(raw.numero_serie || '').trim();

  let cantidad = 0;
  if (raw.cantidad_defecto !== undefined && raw.cantidad_defecto !== null && raw.cantidad_defecto !== '') {
    const parsed = Number(raw.cantidad_defecto);
    cantidad = isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  let pzas = 0;
  if (raw.pzas_rollo !== undefined && raw.pzas_rollo !== null && raw.pzas_rollo !== '') {
    const parsed = Number(raw.pzas_rollo);
    pzas = isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  let mts = 0;
  if (raw.mts_rollo !== undefined && raw.mts_rollo !== null && raw.mts_rollo !== '') {
    const parsed = Number(raw.mts_rollo);
    mts = isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  if (!machineId) {
    return {
      machine_id: 'UNMAPPED_MACHINE',
      fecha: dateStr,
      codigo_defecto: defectCode,
      defecto: defectName,
      cantidad_defecto: cantidad,
      pzas_rollo: pzas,
      mts_rollo: mts,
      numero_serie: serialNo,
      is_valid: false,
      validation_issue: 'UNMAPPED_PRODUCTION_RECORD'
    };
  }

  if (!dateStr || isNaN(Date.parse(dateStr))) {
    return {
      machine_id: machineId,
      fecha: dateStr,
      codigo_defecto: defectCode,
      defecto: defectName,
      cantidad_defecto: cantidad,
      pzas_rollo: pzas,
      mts_rollo: mts,
      numero_serie: serialNo,
      is_valid: false,
      validation_issue: 'INVALID_PRODUCTION_DATE'
    };
  }

  return {
    machine_id: machineId,
    fecha: dateStr,
    codigo_defecto: defectCode,
    defecto: defectName,
    cantidad_defecto: cantidad,
    pzas_rollo: pzas,
    mts_rollo: mts,
    numero_serie: serialNo,
    is_valid: true
  };
}
