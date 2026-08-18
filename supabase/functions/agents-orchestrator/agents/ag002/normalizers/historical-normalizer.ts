// supabase/functions/agents-orchestrator/agents/ag002/normalizers/historical-normalizer.ts
// Normalizer for Historical Records from Excel, Telegram, OTs, and Bitacoras (§14, §15 PRD)

import { DepartmentCode } from '../types/ag002.types.ts';

export function normalizeDepartmentCode(deptStr?: string, machineId?: string): DepartmentCode {
  const d = String(deptStr || '').trim().toUpperCase();
  const m = String(machineId || '').trim().toUpperCase();

  if (d === 'PF' || d === 'PRODUCCION' || d === 'PRODUCCIÓN' || d === 'TEJEDURIA' || d === 'TEJEDURÍA' || d === 'URDIDO' || d === 'JACQUARD') {
    return 'PF';
  }
  if (d === 'CF' || d === 'COSTURA' || d === 'CORTE' || d === 'CONFECCION' || d === 'CONFECCIÓN') {
    return 'CF';
  }
  if (d === 'TF' || d === 'TINTORERIA' || d === 'TINTORERÍA' || d === 'ACABADO' || d === 'QUIMICA') {
    return 'TF';
  }
  if (d === 'AF' || d === 'ADMINISTRATIVO' || d === 'SERVICIOS' || d === 'CALIDAD') {
    return 'AF';
  }

  // Infer from machine prefix
  if (m.includes('TEJI') || m.includes('TEL') || m.includes('URDI') || m.includes('MACC') || m.includes('ENG')) return 'PF';
  if (m.includes('CORT') || m.includes('COS') || m.includes('DOBL') || m.includes('CONFE') || m.includes('DETMET') || m.includes('SUBL') || m.includes('LOG')) return 'CF';
  if (m.includes('TINT') || m.includes('JET') || m.includes('SECA') || m.includes('OVER') || m.includes('CAMP') || m.includes('CALD') || m.includes('ABRI') || m.includes('RAMA') || m.includes('BARC') || m.includes('POZO') || m.includes('AGUA') || m.includes('CLAY')) return 'TF';

  return 'AF';
}

export function isLoomMachine(machineId?: string, departmentCode?: DepartmentCode): boolean {
  const m = String(machineId || '').trim().toUpperCase();
  const dept = departmentCode || normalizeDepartmentCode(undefined, m);

  if (dept !== 'PF') return false;
  return m.includes('TEL') || m.includes('TEJI') || m.includes('JACQ') || /^\d{3}$/.test(m);
}

export function normalizeDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  const d = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split('T')[0];
}
