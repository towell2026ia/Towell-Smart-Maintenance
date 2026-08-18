// supabase/functions/agents-orchestrator/agents/ag004/evaluators/autonomous-reference-evaluator.ts
// Autonomous Reference Evaluator for Checklist Responses

import { AutonomousSurveyResponses, AutonomousBlock, FindingSeverity } from '../types/ag004.types.ts';

export interface EvaluatedBlockAnomaly {
  block: AutonomousBlock;
  itemCode: string;
  isAbnormal: boolean;
  severity: FindingSeverity;
  description: string;
}

export function evaluateBlockAnomalies(responses: AutonomousSurveyResponses): EvaluatedBlockAnomaly[] {
  const anomalies: EvaluatedBlockAnomaly[] = [];

  // 1. Vibración
  if (responses.vibracion_estado === 'ANORMAL' || (responses.vibracion_mms !== null && responses.vibracion_mms !== undefined && responses.vibracion_mms > 7.1)) {
    const isCritical = responses.vibracion_mms !== null && responses.vibracion_mms !== undefined && responses.vibracion_mms > 11.2;
    anomalies.push({
      block: 'Vibración',
      itemCode: 'VIB_NIVEL',
      isAbnormal: true,
      severity: isCritical ? 'CRITICA' : 'ALTA',
      description: responses.vibracion_obs || `Vibración fuera de rango normal (${responses.vibracion_mms || 'N/A'} mm/s).`
    });
  }

  // 2. Limpieza
  if (responses.limpieza_estado === 'NO_CONFORME') {
    anomalies.push({
      block: 'Limpieza',
      itemCode: 'LIM_RESIDUOS',
      isAbnormal: true,
      severity: 'MEDIA',
      description: responses.limpieza_obs || 'Acumulación de residuos / falta de limpieza en zonas críticas.'
    });
  }

  // 3. Lubricación
  if (responses.lubricacion_estado === 'INCORRECTO' || responses.lubricacion_fugas === 'CON_FUGAS' || responses.lubricacion_contaminacion === 'SI') {
    const hasFugas = responses.lubricacion_fugas === 'CON_FUGAS';
    anomalies.push({
      block: 'Lubricación',
      itemCode: 'LUB_ESTADO',
      isAbnormal: true,
      severity: hasFugas ? 'ALTA' : 'MEDIA',
      description: responses.lubricacion_obs || `Condición de lubricación no conforme (fugas: ${responses.lubricacion_fugas}, nivel: ${responses.lubricacion_nivel}).`
    });
  }

  // 4. Temperatura
  if (responses.temperatura_c !== null && responses.temperatura_c !== undefined) {
    if (responses.temperatura_c >= 85.0) {
      const isCritical = responses.temperatura_c >= 100.0;
      anomalies.push({
        block: 'Temperatura',
        itemCode: 'TEMP_ELEVADA',
        isAbnormal: true,
        severity: isCritical ? 'CRITICA' : 'ALTA',
        description: responses.temperatura_obs || `Sobrecalentamiento detectado: ${responses.temperatura_c}°C.`
      });
    }
  }

  // 5. Cableado
  if (responses.cableado_estado && responses.cableado_estado !== 'CORRECTO') {
    const isExposed = responses.cableado_estado === 'EXPUESTO' || responses.cableado_estado === 'SOBRECALENTADO';
    anomalies.push({
      block: 'Cableado',
      itemCode: 'CAB_INTEGRIDAD',
      isAbnormal: true,
      severity: isExposed ? 'ALTA' : 'MEDIA',
      description: responses.cableado_obs || `Cableado en condición no conforme: ${responses.cableado_estado}.`
    });
  }

  return anomalies;
}
