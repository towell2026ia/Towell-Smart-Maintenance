// supabase/functions/agents-orchestrator/agents/ag004/resolvers/autonomous-checklist-resolver.ts
// Resolver for LEVANTAMIENTO_AUTONOMO 5-Block Checklist

import { AutonomousBlock } from '../types/ag004.types.ts';
import { OFFICIAL_5_BLOCKS, MANDATORY_BLOCK } from '../rules/checklist-validation.rules.ts';

export interface ChecklistBlockDefinition {
  block: AutonomousBlock;
  isMandatory: boolean;
  fields: string[];
}

export function getAutonomousChecklistDefinition(): ChecklistBlockDefinition[] {
  return [
    {
      block: 'Vibración',
      isMandatory: true,
      fields: ['vibracion_estado', 'vibracion_mms', 'vibracion_hz', 'vibracion_obs']
    },
    {
      block: 'Limpieza',
      isMandatory: true,
      fields: ['limpieza_estado', 'limpieza_evidencia', 'limpieza_obs']
    },
    {
      block: 'Lubricación',
      isMandatory: true,
      fields: ['lubricacion_estado', 'lubricacion_nivel', 'lubricacion_fugas', 'lubricacion_contaminacion', 'lubricacion_obs']
    },
    {
      block: 'Temperatura',
      isMandatory: true, // CRITICAL NOT NULL
      fields: ['temperatura_c', 'temperatura_obs']
    },
    {
      block: 'Cableado',
      isMandatory: true,
      fields: ['cableado_estado', 'cableado_obs']
    }
  ];
}
