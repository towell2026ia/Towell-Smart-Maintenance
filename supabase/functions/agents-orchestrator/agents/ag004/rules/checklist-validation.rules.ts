// supabase/functions/agents-orchestrator/agents/ag004/rules/checklist-validation.rules.ts
// Manifest: AG004-CHECKLIST-VALIDATION-RULES-001

import { AutonomousBlock } from '../types/ag004.types.ts';

export const CHECKLIST_VALIDATION_RULES_VERSION = 'AG004-CHECKLIST-VALIDATION-RULES-001';

export const OFFICIAL_5_BLOCKS: readonly AutonomousBlock[] = [
  'Vibración',
  'Limpieza',
  'Lubricación',
  'Temperatura',
  'Cableado'
];

export const MANDATORY_BLOCK: AutonomousBlock = 'Temperatura';
