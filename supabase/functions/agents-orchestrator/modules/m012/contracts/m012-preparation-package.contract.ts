// supabase/functions/agents-orchestrator/modules/m012/contracts/m012-preparation-package.contract.ts
// Canonical OT Preparation Package Contract for M-012 (v1.0)
// Frozen under Token: M012-DATA-MAP-001

import type { OTPreparationPackage } from '../types/m012.types.ts';

export const M012_PREPARATION_PACKAGE_SCHEMA = {
  type: 'object',
  properties: {
    work_order_id: { type: 'string' },
    asset_id: { type: 'string' },
    evaluation_at: { type: 'string', format: 'date-time' },
    scope_snapshot: { type: 'object' },
    asset_context: { type: 'object' },
    technical_memories: { type: 'array' },
    checklist: { type: ['object', 'null'] },
    parts: { type: 'array' },
    tools: { type: 'array' },
    resources: { type: 'array' },
    dependencies: { type: 'array' },
    safety_dependencies: { type: 'array' },
    missing_information: { type: 'array' },
    readiness: { type: 'object' },
    traceability: { type: 'object' }
  },
  required: [
    'work_order_id',
    'asset_id',
    'evaluation_at',
    'scope_snapshot',
    'asset_context',
    'technical_memories',
    'parts',
    'tools',
    'resources',
    'dependencies',
    'safety_dependencies',
    'missing_information',
    'readiness',
    'traceability'
  ],
  additionalProperties: false
};
