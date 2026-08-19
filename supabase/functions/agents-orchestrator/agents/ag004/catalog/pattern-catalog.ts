// supabase/functions/agents-orchestrator/agents/ag004/catalog/pattern-catalog.ts
// Manifest: AG004-PATTERN-CATALOG-001 (Closed Pattern Catalog for Autonomous Maintenance)

export const PATTERN_CATALOG_VERSION = 'AG004-PATTERN-CATALOG-001';

export interface AutonomousPatternDefinition {
  code: string;
  category: 'HISTORICAL' | 'FINDING' | 'COMPLIANCE' | 'QUALITY';
  description: string;
}

export const CLOSED_AUTONOMOUS_PATTERNS: readonly AutonomousPatternDefinition[] = [
  {
    code: 'NO_AUTONOMOUS_HISTORY',
    category: 'HISTORICAL',
    description: 'Activo nuevo o sin registros previos de mantenimiento autónomo en el sistema.'
  },
  {
    code: 'RECENT_AUTONOMOUS_COMPLETED',
    category: 'HISTORICAL',
    description: 'Activo con inspecciones autónomas completadas satisfactoriamente en las semanas recientes.'
  },
  {
    code: 'RECENT_AUTONOMOUS_PENDING',
    category: 'COMPLIANCE',
    description: 'Activo con inspecciones autónomas previas pendientes o vencidas (OVERDUE).'
  },
  {
    code: 'RECURRENT_VIBRATION_FINDING',
    category: 'FINDING',
    description: 'Historial de anomalías recurrentes en el bloque de Vibración (desbalance, desalineación o soltura).'
  },
  {
    code: 'RECURRENT_CLEANING_FINDING',
    category: 'FINDING',
    description: 'Historial de observaciones por acumulación de pelusa, borra o suciedad en zonas críticas.'
  },
  {
    code: 'RECURRENT_LUBRICATION_FINDING',
    category: 'FINDING',
    description: 'Historial de anomalías recurrentes en lubricación (fugas, nivel inadecuado o lubricante contaminado).'
  },
  {
    code: 'RECURRENT_TEMPERATURE_FINDING',
    category: 'FINDING',
    description: 'Historial de temperaturas elevadas (>85°C) o sobrecalentamientos en rodamientos/motores.'
  },
  {
    code: 'RECURRENT_WIRING_FINDING',
    category: 'FINDING',
    description: 'Historial de conexiones flojas, cables expuestos o sobrecalentamiento en tableros.'
  },
  {
    code: 'MULTI_BLOCK_FINDING_HISTORY',
    category: 'FINDING',
    description: 'Historial con anomalías registradas simultáneamente en múltiples bloques de inspección.'
  },
  {
    code: 'RECENT_CORRECTIVE_AFTER_AUTONOMOUS',
    category: 'FINDING',
    description: 'Hallazgo autónomo previo que requirió intervención correctiva formal vía AG-009.3.'
  },
  {
    code: 'REPEATED_AUTONOMOUS_NONCOMPLIANCE',
    category: 'COMPLIANCE',
    description: 'Incumplimiento reiterado en la ejecución de rutas de mantenimiento autónomo en semanas anteriores.'
  },
  {
    code: 'PARTIAL_HISTORY',
    category: 'QUALITY',
    description: 'Información histórica parcial o incompleta con necesidad de verificación en piso.'
  },
  {
    code: 'NO_SIGNIFICANT_AUTONOMOUS_PATTERN',
    category: 'HISTORICAL',
    description: 'Historial estándar y estable sin patrones anómalos ni observaciones críticas.'
  }
];

export const VALID_PATTERN_CODES: ReadonlySet<string> = new Set(CLOSED_AUTONOMOUS_PATTERNS.map(p => p.code));

export function isValidAutonomousPatternCode(code: string): boolean {
  return VALID_PATTERN_CODES.has(code);
}
