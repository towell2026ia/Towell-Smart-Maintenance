// supabase/functions/agents-orchestrator/agents/ag008/normalizers/failure-normalizer.ts
// Deterministic Failure Normalizer (No AI / LLM) for AG-008 (v1.0)
// Frozen under Token: AG008-FAILURE-NORMALIZATION-RULES-001

// Closed technical alias catalog for industrial textile maintenance
const APPROVED_TECHNICAL_ALIASES: Record<string, string> = {
  // Paros de trama / hilo
  'falla de trama': 'FALLA_TRAMA',
  'paro de trama': 'FALLA_TRAMA',
  'hilo roto en trama': 'FALLA_TRAMA',
  'rotura de trama': 'FALLA_TRAMA',
  'trama rota': 'FALLA_TRAMA',
  'sensor de trama': 'FALLA_SENSOR_TRAMA',
  
  // Paros de urdimbre
  'falla de urdimbre': 'FALLA_URDIMBRE',
  'paro de urdimbre': 'FALLA_URDIMBRE',
  'hilo de urdimbre reventado': 'FALLA_URDIMBRE',
  'rotura de urdimbre': 'FALLA_URDIMBRE',
  'urdimbre rota': 'FALLA_URDIMBRE',

  // Vibración y ruidos mecánicos (Síntomas, NO causas)
  'vibracion': 'VIBRACION_EXCESIVA',
  'vibracion excesiva': 'VIBRACION_EXCESIVA',
  'vibracion fuerte': 'VIBRACION_EXCESIVA',
  'ruido anormal': 'RUIDO_ANORMAL',
  'ruido extrano': 'RUIDO_ANORMAL',
  'ruido extrano ': 'RUIDO_ANORMAL',
  'rechinido': 'RUIDO_ANORMAL',

  // Fugas y niveles
  'fuga de aceite': 'FUGA_ACEITE',
  'fuga aceite': 'FUGA_ACEITE',
  'tiradero de aceite': 'FUGA_ACEITE',
  'fuga de aire': 'FUGA_AIRE_NEUMATICA',
  'fuga aire': 'FUGA_AIRE_NEUMATICA',
  'fuga neumatica': 'FUGA_AIRE_NEUMATICA',
  'fuga de agua': 'FUGA_AGUA',

  // Eléctrico y electrónico
  'paro de emergencia': 'PARO_EMERGENCIA_ACTIVADO',
  'boton de paro': 'PARO_EMERGENCIA_ACTIVADO',
  'falla de motor': 'FALLA_MOTOR_ELECTRICO',
  'motor caliente': 'SOBRECALENTAMIENTO_MOTOR',
  'sobrecalentamiento motor': 'SOBRECALENTAMIENTO_MOTOR',
  'variador': 'FALLA_VARIADOR_FRECUENCIA',
  'falla variador': 'FALLA_VARIADOR_FRECUENCIA',
  'sensor inductivo': 'FALLA_SENSOR_POSICION'
};

export function normalizeFailureText(rawText: string | null | undefined): string {
  if (!rawText || typeof rawText !== 'string') {
    return 'UNKNOWN_FAILURE';
  }

  // 1. Trim & Lowercase
  let cleaned = rawText.trim().toLowerCase();

  // 2. Remove Accents / Diacritics
  cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 3. Normalize whitespace & punctuation
  cleaned = cleaned.replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim();

  if (!cleaned) {
    return 'UNKNOWN_FAILURE';
  }

  // 4. Exact match against closed technical alias catalog
  if (APPROVED_TECHNICAL_ALIASES[cleaned]) {
    return APPROVED_TECHNICAL_ALIASES[cleaned];
  }

  // 5. Check prefix/suffix in closed technical alias catalog
  for (const [aliasKey, canonical] of Object.entries(APPROVED_TECHNICAL_ALIASES)) {
    if (cleaned === aliasKey || cleaned.startsWith(aliasKey + ' ') || cleaned.endsWith(' ' + aliasKey)) {
      return canonical;
    }
  }

  // 6. Generic deterministic slugification for uncatalogued descriptions
  const slug = cleaned.toUpperCase().replace(/\s+/g, '_');
  return slug.length > 50 ? slug.substring(0, 50) : slug;
}
