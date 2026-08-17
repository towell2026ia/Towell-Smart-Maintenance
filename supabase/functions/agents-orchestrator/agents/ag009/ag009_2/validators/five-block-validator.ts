// supabase/functions/agents-orchestrator/agents/ag009/ag009_2/validators/five-block-validator.ts
// Validator for Mandatory 5 Blocks & Temperature Guard (§19, §20, §21 PRD)

import { AutonomousResponseItem, AutonomousBlock } from '../../types/ag009.types.ts';
import { AutonomousConnectorError } from '../errors/autonomous-error-catalog.ts';

export const MANDATORY_FIVE_BLOCKS: AutonomousBlock[] = [
  'Vibración',
  'Limpieza',
  'Lubricación',
  'Temperatura',
  'Cableado'
];

export interface FiveBlockValidationResult {
  isValid: boolean;
  presentBlocks: AutonomousBlock[];
  missingBlocks: AutonomousBlock[];
}

export function validateFiveBlocksAndTemperature(
  responses: AutonomousResponseItem[]
): FiveBlockValidationResult {
  const presentSet = new Set<string>();

  for (const item of responses) {
    if (item && item.block) {
      presentSet.add(item.block);
    }
  }

  const missingBlocks: AutonomousBlock[] = [];

  for (const block of MANDATORY_FIVE_BLOCKS) {
    if (!presentSet.has(block)) {
      missingBlocks.push(block);
    }
  }

  // 1. Specific Temperature Guard (§21 PRD)
  if (!presentSet.has('Temperatura')) {
    throw new AutonomousConnectorError(
      'TEMPERATURE_BLOCK_MISSING',
      'El bloque obligatorio de Temperatura no está presente en el checklist autónomo.'
    );
  }

  // 2. Complete 5-Block Structure Check (§20 PRD)
  if (missingBlocks.length > 0) {
    throw new AutonomousConnectorError(
      'AUTONOMOUS_CHECKLIST_INCOMPLETE',
      `El checklist autónomo está incompleto. Faltan los siguientes bloques obligatorios: ${missingBlocks.join(', ')}.`
    );
  }

  return {
    isValid: true,
    presentBlocks: Array.from(presentSet) as AutonomousBlock[],
    missingBlocks: []
  };
}
