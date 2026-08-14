// supabase/functions/agents-orchestrator/agents/ag005/schema-registry.ts
// Schema Registry for AG-005 Auditor de Bases v1.0

import { SchemaDefinition } from './types/ag005.types.ts';
import MAQUINAS_V1 from './schemas/MAQUINAS_V1.schema.json' with { type: 'json' };
import TELEGRAM_V1 from './schemas/TELEGRAM_V1.schema.json' with { type: 'json' };
import REFACCIONES_V1 from './schemas/REFACCIONES_V1.schema.json' with { type: 'json' };
import FALLAS_V1 from './schemas/FALLAS_V1.schema.json' with { type: 'json' };
import SEGUNDAS_V1 from './schemas/SEGUNDAS_V1.schema.json' with { type: 'json' };

const REGISTERED_SCHEMAS: Record<string, SchemaDefinition> = {
  'MAQUINAS_1.0': MAQUINAS_V1 as unknown as SchemaDefinition,
  'TELEGRAM_1.0': TELEGRAM_V1 as unknown as SchemaDefinition,
  'REFACCIONES_1.0': REFACCIONES_V1 as unknown as SchemaDefinition,
  'FALLAS_1.0': FALLAS_V1 as unknown as SchemaDefinition,
  'SEGUNDAS_1.0': SEGUNDAS_V1 as unknown as SchemaDefinition
};

/**
 * Normalizes a header column name according to Rule DATA-NORM-001 (matches importar_excel.js)
 */
export function normalizeHeaderName(colName: string): string {
  if (!colName) return '';
  return colName
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_ ]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Loads a schema definition by ID and optional version (defaults to 1.0)
 */
export function loadSchema(schemaId: string, version: string = '1.0'): SchemaDefinition | null {
  const key = `${schemaId.toUpperCase()}_${version}`;
  return REGISTERED_SCHEMAS[key] || null;
}

/**
 * Identifies the matching schema by checking column headers against registered schemas.
 * Requires exact length match and all expected columns present (exact matching logic from importar_excel.js).
 */
export function identifySchema(headers: string[], declaredSource?: string): SchemaDefinition | null {
  if (!headers || headers.length === 0) return null;

  const normalizedHeaders = headers.map(normalizeHeaderName);

  for (const schema of Object.values(REGISTERED_SCHEMAS)) {
    // If source declared and matches, try matching columns
    const expected = schema.expected_columns.map(normalizeHeaderName);

    // Exact count and header match check
    if (normalizedHeaders.length === expected.length) {
      const allPresent = expected.every(expCol => normalizedHeaders.includes(expCol));
      if (allPresent) {
        return schema;
      }
    }

    // Secondary loose check for required columns if declared source matches
    if (declaredSource && declaredSource.toUpperCase() === schema.schema_id) {
      const required = schema.required_columns.map(normalizeHeaderName);
      const allRequiredPresent = required.every(reqCol => normalizedHeaders.includes(reqCol));
      if (allRequiredPresent) {
        return schema;
      }
    }
  }

  return null;
}

export function listRegisteredSchemas(): Array<{ schema_id: string; version: string; source: string }> {
  return Object.values(REGISTERED_SCHEMAS).map(s => ({
    schema_id: s.schema_id,
    version: s.version,
    source: s.source
  }));
}
