// supabase/functions/agents-orchestrator/agents/ag013/contracts/ag013-input.contract.ts
// Input Contract Specification for AG-013 (AG013-INPUT-001)
// Frozen under Token: AG013-DATA-MAP-001

import type { BadActorAnalysisRequest } from '../types/ag013.types.ts';

export const AG013InputContract = {
  version: '1.0',
  contract_token: 'AG013-INPUT-001',
  schema: {
    type: 'object',
    required: ['request_id', 'evaluation_at', 'population_scope', 'analysis_window', 'assets'],
    properties: {
      request_id: { type: 'string' },
      event_id: { type: ['string', 'null'] },
      correlation_id: { type: ['string', 'null'] },
      evaluation_at: { type: 'string', format: 'date-time' },
      population_scope: { type: 'string', enum: ['PLANT_WIDE', 'AREA_SPECIFIC', 'FAMILY_SPECIFIC'] },
      target_area: { type: ['string', 'null'] },
      target_family: { type: ['string', 'null'] },
      analysis_window: { type: 'string', enum: ['ROLLING_90D', 'ROLLING_180D', 'ROLLING_365D'] },
      consumer: { type: 'string' },
      assets: {
        type: 'array',
        items: {
          type: 'object',
          required: ['asset_raw'],
          properties: {
            asset_raw: {
              type: 'object',
              required: ['id', 'codigo_maquina', 'nombre', 'area', 'machine_family', 'criticality', 'activo']
            },
            ag008_context: { type: ['object', 'null'] },
            ag007_context: { type: ['object', 'null'] },
            m011_context: { type: ['object', 'null'] },
            ag010_context: { type: ['object', 'null'] },
            ag011_context: { type: ['object', 'null'] },
            ag012_context: { type: ['object', 'null'] }
          }
        }
      }
    }
  },
  validate(request: BadActorAnalysisRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!request.request_id) errors.push('request_id es obligatorio');
    if (!request.evaluation_at) errors.push('evaluation_at es obligatorio');
    if (!request.population_scope) errors.push('population_scope es obligatorio');
    if (!request.analysis_window) errors.push('analysis_window es obligatorio');
    if (!Array.isArray(request.assets) || request.assets.length === 0) {
      errors.push('assets debe ser un arreglo no vacío de activos a evaluar');
    }
    return { valid: errors.length === 0, errors };
  }
};
