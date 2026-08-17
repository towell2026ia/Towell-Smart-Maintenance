// supabase/functions/agents-orchestrator/agents/ag009/ag009_2/engine/finding-rules.ts
// Finding Rule Registry AUTONOMOUS-FINDING-RULES-001 (§25, §26, §27 PRD)

import { AutonomousResponseItem, AutonomousBlock } from '../../types/ag009.types.ts';

export interface FindingEvaluationRule {
  rule_id: string;
  block: AutonomousBlock;
  evaluate: (item: AutonomousResponseItem) => { isFinding: boolean; description?: string; severity?: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA' };
}

export const CANONICAL_FINDING_RULES: FindingEvaluationRule[] = [
  // 1. Vibración Rule (§29 PRD)
  {
    rule_id: 'RULE_VIBRACION_001',
    block: 'Vibración',
    evaluate: (item) => {
      if (item.value === null || item.value === 'N/A' || item.value === 'NA') return { isFinding: false };

      if (item.response_type === 'NUMERIC') {
        const val = Number(item.value);
        const max = item.reference_max !== undefined ? item.reference_max : 7.0; // mm/s default threshold
        if (!isNaN(val) && val > max) {
          return {
            isFinding: true,
            description: `Vibración excesiva detectada: ${val} ${item.unit || 'mm/s'} (máximo permitido: ${max} ${item.unit || 'mm/s'}) en ${item.question_text}.`,
            severity: val > (max * 1.5) ? 'CRITICA' : 'ALTA'
          };
        }
      } else if (item.response_type === 'YES_NO') {
        const str = String(item.value).toUpperCase().trim();
        if (str === 'NO' || str === 'NOK' || str === 'INCORRECTO' || str === 'FALSE') {
          return {
            isFinding: true,
            description: `Condición anormal de vibración reportada en: ${item.question_text}.`,
            severity: 'ALTA'
          };
        }
      }
      return { isFinding: false };
    }
  },

  // 2. Limpieza Rule (§30 PRD)
  {
    rule_id: 'RULE_LIMPIEZA_001',
    block: 'Limpieza',
    evaluate: (item) => {
      if (item.value === null || item.value === 'N/A' || item.value === 'NA') return { isFinding: false };

      if (item.response_type === 'YES_NO') {
        const str = String(item.value).toUpperCase().trim();
        if (str === 'NO' || str === 'NOK' || str === 'INCORRECTO' || str === 'FALSE') {
          return {
            isFinding: true,
            description: `Acumulación de suciedad, residuos o falta de limpieza en: ${item.question_text}.`,
            severity: 'MEDIA'
          };
        }
      }
      return { isFinding: false };
    }
  },

  // 3. Lubricación Rule (§31 PRD)
  {
    rule_id: 'RULE_LUBRICACION_001',
    block: 'Lubricación',
    evaluate: (item) => {
      if (item.value === null || item.value === 'N/A' || item.value === 'NA') return { isFinding: false };

      if (item.response_type === 'NUMERIC') {
        const val = Number(item.value);
        const min = item.reference_min !== undefined ? item.reference_min : 30.0;
        const max = item.reference_max !== undefined ? item.reference_max : 100.0;
        if (!isNaN(val) && (val < min || val > max)) {
          return {
            isFinding: true,
            description: `Presión/nivel de lubricación fuera de rango: ${val} ${item.unit || 'PSI'} (rango esperado: ${min}-${max}) en ${item.question_text}.`,
            severity: val < (min * 0.5) ? 'CRITICA' : 'ALTA'
          };
        }
      } else if (item.response_type === 'YES_NO') {
        const str = String(item.value).toUpperCase().trim();
        if (str === 'NO' || str === 'NOK' || str === 'INCORRECTO' || str === 'FALSE') {
          return {
            isFinding: true,
            description: `Anomalía en sistema de lubricación/nivel de aceite en: ${item.question_text}.`,
            severity: 'ALTA'
          };
        }
      }
      return { isFinding: false };
    }
  },

  // 4. Temperatura Rule (§32 & §64 PRD)
  {
    rule_id: 'RULE_TEMPERATURA_001',
    block: 'Temperatura',
    evaluate: (item) => {
      if (item.value === null || item.value === 'N/A' || item.value === 'NA') return { isFinding: false };

      if (item.response_type === 'NUMERIC') {
        const val = Number(item.value);
        const max = item.reference_max !== undefined ? item.reference_max : 70.0; // °C threshold
        const min = item.reference_min !== undefined ? item.reference_min : 0.0;
        if (!isNaN(val) && (val > max || val < min)) {
          return {
            isFinding: true,
            description: `Temperatura fuera de rango operativo: ${val} ${item.unit || '°C'} (máximo permitido: ${max} ${item.unit || '°C'}) en ${item.question_text}.`,
            severity: val > (max + 20) ? 'CRITICA' : 'ALTA'
          };
        }
      } else if (item.response_type === 'YES_NO') {
        const str = String(item.value).toUpperCase().trim();
        if (str === 'NO' || str === 'NOK' || str === 'INCORRECTO' || str === 'FALSE') {
          return {
            isFinding: true,
            description: `Sobrecalentamiento o temperatura anormal reportada en: ${item.question_text}.`,
            severity: 'ALTA'
          };
        }
      }
      return { isFinding: false };
    }
  },

  // 5. Cableado Rule (§33 PRD)
  {
    rule_id: 'RULE_CABLEADO_001',
    block: 'Cableado',
    evaluate: (item) => {
      if (item.value === null || item.value === 'N/A' || item.value === 'NA') return { isFinding: false };

      if (item.response_type === 'YES_NO') {
        const str = String(item.value).toUpperCase().trim();
        if (str === 'NO' || str === 'NOK' || str === 'INCORRECTO' || str === 'FALSE') {
          return {
            isFinding: true,
            description: `Defecto en cableado, conexión eléctrica o canalización en: ${item.question_text}.`,
            severity: 'ALTA'
          };
        }
      }
      return { isFinding: false };
    }
  }
];
