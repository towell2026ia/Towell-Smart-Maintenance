// supabase/functions/agents-orchestrator/agents/ag006/providers/ag006-openai-adapter.ts
// OpenAI Provider Adapter for AG-006 (gpt-4o-mini with Structured Outputs) v1.1

import { FormDefinition, FormFamily, TargetResponseTable, IntermediateRepresentation, FormSectionDefinition, FormFieldDefinition } from '../types/ag006.types.ts';
import { validateFormDefinition } from '../validators/form-validator.ts';
import { callOpenAIWithRetry } from '../../../providers/openai-adapter.ts';

export const AG006_SYSTEM_PROMPT = `
Eres AG-006 Constructor de Formularios para Towell Smart Maintenance AI.
Tu tarea es convertir una representación intermedia de un archivo Excel (.xlsx / .xlsm) en un esquema estructurado de formulario JSON bajo la versión 'FORM-DEFINITION-001'.

REGLAS ESTRUCTURALES Y DE FAMILIAS:
1. LEVANTAMIENTO_PREDICTIVO: Organizar únicamente en bloques (Electrónico, Mecánico, Limpieza, Lubricación).
2. LEVANTAMIENTO_AUTONOMO: Organizar únicamente en bloques (Vibración, Limpieza, Lubricación, Temperatura, Cableado).
3. REQUISICION_OT: Solicitud de intervención de mantenimiento (NO requisición de compra).
4. Asigna la tabla de respuesta adecuada (respuestas_checklist_orden, respuestas_checklist_predictivo, respuestas_checklist_autonomo, solicitudes_mantenimiento).
5. Responde ÚNICAMENTE en JSON válido conforme al schema asignado.
`;

export function resolveTargetResponseTable(family: FormFamily): TargetResponseTable {
  switch (family) {
    case 'LEVANTAMIENTO_PREDICTIVO':
      return 'respuestas_checklist_predictivo';
    case 'LEVANTAMIENTO_AUTONOMO':
      return 'respuestas_checklist_autonomo';
    case 'REQUISICION_OT':
      return 'solicitudes_mantenimiento';
    case 'OT_CHECKLIST':
    case 'BITACORA_LEVANTAMIENTO':
    case 'FORMULARIO_GENERICO':
    default:
      return 'respuestas_checklist_orden';
  }
}

/**
 * Deterministic Fallback Form Generator (used when LLM calls are disabled or in parser-only mode)
 */
export function buildDeterministicFormDefinition(
  interRep: IntermediateRepresentation,
  targetFamily: FormFamily = 'FORMULARIO_GENERICO'
): FormDefinition {
  const sections: FormSectionDefinition[] = [];
  let secCounter = 1;
  let fieldCounter = 1;

  for (const sheet of interRep.sheets) {
    const fields: FormFieldDefinition[] = [];

    for (const region of sheet.regions) {
      for (const cell of region.cells) {
        if (!cell.value) continue;
        const valStr = String(cell.value).trim();
        if (!valStr || valStr.length < 2) continue;

        let fType: FormFieldDefinition['field_type'] = 'TEXT';
        let src: 'INPUT' | 'CONTEXT' = 'INPUT';
        let persist = true;
        const lower = valStr.toLowerCase();

        if (lower.includes('máquina') || lower.includes('telar') || lower.includes('equipo')) {
          fType = 'TEXT';
          src = 'CONTEXT';
        } else if (lower.includes('fecha') || lower.includes('hora')) {
          fType = 'DATE';
          src = 'CONTEXT';
        } else if (lower.includes('observ') || lower.includes('coment') || lower.includes('descrip')) {
          fType = 'TEXTAREA';
          src = 'INPUT';
        } else if (lower.includes('estado') || lower.includes('conforme') || lower.includes('bueno/malo') || lower.includes('si/no')) {
          fType = 'SELECT';
          src = 'INPUT';
        } else if (lower.includes('costo') || lower.includes('precio') || lower.includes('monto') || lower.includes('cantidad')) {
          fType = 'NUMBER';
          src = 'INPUT';
        }

        fields.push({
          code: `fld_${fieldCounter++}`,
          label: valStr,
          field_type: fType,
          required: false,
          source_type: src,
          persists: persist,
          order: fields.length + 1,
          options: fType === 'SELECT' ? ['CONFORME', 'NO CONFORME', 'NO APLICA'] : undefined
        });
      }
    }

    if (fields.length > 0) {
      sections.push({
        section_id: `sec_${secCounter++}`,
        name: sheet.sheet_name,
        order: sections.length + 1,
        fields: fields
      });
    }
  }

  return {
    schema_version: 'FORM-DEFINITION-001',
    form: {
      form_id: `form_${Date.now()}`,
      form_name: interRep.workbook_name.replace(/\.[^/.]+$/, ''),
      name: interRep.workbook_name.replace(/\.[^/.]+$/, ''),
      form_type: targetFamily,
      status: 'DRAFT',
      version: 1,
      target_response_table: resolveTargetResponseTable(targetFamily)
    },
    sections: sections.length > 0 ? sections : [{
      section_id: 'sec_1',
      name: 'General',
      order: 1,
      fields: [{ code: 'obs', label: 'Observaciones', field_type: 'TEXTAREA', required: false, order: 1 }]
    }],
    metadata: {
      source_file_name: interRep.workbook_name,
      source_file_hash: interRep.file_hash,
      has_macros_detected: interRep.has_macros,
      macros_logged: interRep.macro_names
    }
  };
}

/**
 * Invokes OpenAI API (gpt-4o-mini) via Central Adapter with Structured Outputs if enabled,
 * otherwise falls back to deterministic generator
 */
export async function generateFormSemantics(
  interRep: IntermediateRepresentation,
  apiKey: string | undefined,
  targetFamily: FormFamily = 'FORMULARIO_GENERICO'
): Promise<{ formDef: FormDefinition; llmUsed: boolean; tokens: { input: number; output: number } }> {
  if (!apiKey) {
    return {
      formDef: buildDeterministicFormDefinition(interRep, targetFamily),
      llmUsed: false,
      tokens: { input: 0, output: 0 }
    };
  }

  try {
    const userPrompt = `Formato: ${interRep.workbook_name}\nHojas: ${JSON.stringify(interRep.sheets.slice(0, 2))}`;

    const aiRes = await callOpenAIWithRetry(
      apiKey,
      'gpt-4o-mini',
      AG006_SYSTEM_PROMPT,
      userPrompt,
      null,
      2
    );

    const parsed = typeof aiRes.parsedOutput === 'object' && aiRes.parsedOutput !== null
      ? aiRes.parsedOutput
      : JSON.parse(aiRes.text);

    parsed.target_response_table = resolveTargetResponseTable(parsed.form_family || targetFamily);
    const val = validateFormDefinition(parsed);

    if (val.isValid) {
      return {
        formDef: parsed as FormDefinition,
        llmUsed: true,
        tokens: {
          input: aiRes.inputTokens || 0,
          output: aiRes.outputTokens || 0
        }
      };
    }
  } catch (err) {
    console.warn('[AG006OpenAIAdapter] Error in central OpenAI processing, falling back to deterministic parser:', err);
  }

  return {
    formDef: buildDeterministicFormDefinition(interRep, targetFamily),
    llmUsed: false,
    tokens: { input: 0, output: 0 }
  };
}
