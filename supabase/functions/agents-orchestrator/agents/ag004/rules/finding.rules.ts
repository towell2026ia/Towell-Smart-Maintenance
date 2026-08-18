// supabase/functions/agents-orchestrator/agents/ag004/rules/finding.rules.ts
// Manifest: AG004-FINDING-RULES-001

import { FindingSeverity, AutonomousBlock } from '../types/ag004.types.ts';

export const FINDING_RULES_VERSION = 'AG004-FINDING-RULES-001';

export function buildAutonomousFindingCode(block: AutonomousBlock, itemCode: string): string {
  const normBlock = String(block).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return `ANOMALIA_${normBlock}_${String(itemCode).trim().toUpperCase()}`;
}

export function buildAutonomousFindingId(machineId: string, weekStr: string | number, itemCode: string, seq: number = 1): string {
  const normMachine = String(machineId).trim().toUpperCase();
  const cleanWeek = String(weekStr).replace(/[^0-9a-zA-Z]/g, '');
  const seqPadded = String(seq).padStart(2, '0');
  return `FND-${normMachine}-W${cleanWeek}-${itemCode}-${seqPadded}`;
}
