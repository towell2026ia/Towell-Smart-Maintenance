// supabase/functions/agents-orchestrator/agents/ag009/ag009_1/resolvers/checklist-resolver.ts
// Checklist Resolver for AG-009.1 (§21, §22, §23, §24, §25 PRD-AG-009.1)

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PreventiveConnectorError } from '../errors/preventive-error-catalog.ts';

export interface ChecklistItem {
  id_checklist?: string;
  codigo_servicio: string;
  codigo_pregunta?: string;
  pregunta: string;
  tipo_respuesta?: string;
  obligatorio?: boolean;
  orden?: number;
  activo?: boolean;
}

export interface ChecklistResolutionOutput {
  service_code: string;
  checklist_reference: string;
  total_items: number;
  items: ChecklistItem[];
}

export async function resolveChecklistForService(
  supabase: SupabaseClient | null,
  serviceCode: string,
  localChecklists?: ChecklistItem[]
): Promise<ChecklistResolutionOutput> {
  const normCode = serviceCode.trim().toUpperCase();

  let questions: ChecklistItem[] = [];

  // 1. Consultar Supabase
  if (supabase) {
    const { data, error } = await supabase
      .from('checklists_mantenimiento')
      .select('id_checklist, codigo_servicio, codigo_pregunta, pregunta, tipo_respuesta, obligatorio, orden, activo')
      .eq('codigo_servicio', normCode)
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (!error && data && data.length > 0) {
      questions = data;
    }
  }

  // 2. Fallback a catálogo local
  if (questions.length === 0 && localChecklists) {
    questions = localChecklists.filter(c => c.codigo_servicio.toUpperCase() === normCode && c.activo !== false);
  }

  // Si no se encontraron preguntas para el servicio (§22 PRD)
  if (questions.length === 0) {
    throw new PreventiveConnectorError(
      'CHECKLIST_NOT_FOUND',
      `No se encontró ningún checklist activo asociado al servicio preventivo "${normCode}". Una OT preventiva no puede crearse sin checklist.`
    );
  }

  return {
    service_code: normCode,
    checklist_reference: `CHK-${normCode}`,
    total_items: questions.length,
    items: questions
  };
}
