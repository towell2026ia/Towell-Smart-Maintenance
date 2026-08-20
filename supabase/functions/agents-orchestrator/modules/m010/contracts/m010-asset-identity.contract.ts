// supabase/functions/agents-orchestrator/modules/m010/contracts/m010-asset-identity.contract.ts
// Asset Identity Contract for M-010 Expediente Único del Activo (v1.0)
// Frozen under Token: M010-ASSET-IDENTITY-001
// Invariant: Canonical asset_id resolves strictly against cat_maquinas; stable identity (§5-8 PRD)

import type { AssetIdentity, AssetDepartment, AssetCriticality, AssetStatus } from '../types/m010.types.ts';

export interface RawMachineRecord {
  id: string;
  codigo_maquina?: string | null;
  nombre: string;
  depto: string;
  tipo?: string | null;
  modelo?: string | null;
  marca?: string | null;
  serie?: string | null;
  criticidad?: string | null;
  ubicacion?: string | null;
  estatus?: string | null;
  activo?: boolean | null;
  created_at?: string | null;
}

export function buildAssetIdentity(raw: RawMachineRecord): AssetIdentity {
  const canonicalId = (raw.codigo_maquina || raw.id || raw.nombre).trim();
  const canonicalCode = (raw.codigo_maquina || raw.id).trim();

  // Department validation
  let dept: AssetDepartment = 'PF';
  const rawDept = (raw.depto || '').trim().toUpperCase();
  if (rawDept === 'CF' || rawDept === 'TF' || rawDept === 'AF') {
    dept = rawDept;
  }

  // Criticality validation
  let crit: AssetCriticality = 'MEDIA';
  const rawCrit = (raw.criticidad || '').trim().toUpperCase();
  if (rawCrit === 'ALTA' || rawCrit === 'BAJA') {
    crit = rawCrit;
  }

  // Status validation
  let status: AssetStatus = 'OPERANDO';
  const rawStatus = (raw.estatus || '').trim().toUpperCase();
  if (rawStatus === 'PARADA' || rawStatus === 'MANTENIMIENTO' || rawStatus === 'INACTIVA' || rawStatus === 'DESMANTELADA') {
    status = rawStatus;
  }

  return {
    asset_id: canonicalId,
    codigo_maquina: canonicalCode,
    nombre: raw.nombre.trim(),
    departamento: dept,
    tipo: raw.tipo || null,
    modelo: raw.modelo || null,
    marca: raw.marca || null,
    serie: raw.serie || null,
    criticidad: crit,
    ubicacion: raw.ubicacion || null,
    estatus: status,
    activo: raw.activo !== false,
    fecha_alta: raw.created_at || null
  };
}
