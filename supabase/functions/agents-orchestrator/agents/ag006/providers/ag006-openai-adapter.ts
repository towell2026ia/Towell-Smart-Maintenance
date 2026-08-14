// supabase/functions/agents-orchestrator/agents/ag006/providers/ag006-openai-adapter.ts
// OpenAI Provider Adapter for AG-006 (gpt-4.1-mini with Structured Outputs) v1.1

import { FormDefinition, FormFamily, TargetResponseTable, IntermediateRepresentation, FormSectionDefinition, FormFieldDefinition } from '../types/ag006.types.ts';
import { validateFormDefinition } from '../validators/form-validator.ts';

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
          fType = 'MACHINE_SELECTOR';
        } else if (lower.includes('técnico') || lower.includes('operador') || lower.includes('atendió')) {
          fType = 'TECHNICIAN_SELECTOR';
        } else if (lower.includes('fecha')) {
          fType = 'DATE';
        } else if (lower.includes('foto') || lower.includes('evidencia')) {
          fType = 'PHOTO';
        } else if (lower.includes('firma')) {
          fType = 'SIGNATURE';
        } else if (lower.includes('estado') || lower.includes('cumple') || lower.includes('ok')) {
          fType = 'YES_NO';
        } else if (lower.includes('folio') || lower.includes('ot:')) {
          fType = 'READ_ONLY';
          src = 'CONTEXT';
          persist = false;
        } else if (typeof cell.value === 'number') {
          fType = 'DECIMAL';
        }

        fields.push({
          code: `field_${fieldCounter}`,
          label: valStr,
          field_type: fType,
          required: lower.includes('obligatorio') || lower.includes('*'),
          order: fieldCounter,
          source: src,
          persist_response: persist,
          source_reference: {
            sheet: sheet.name,
            cell_range: cell.address
          }
        });
        fieldCounter++;
      }
    }

    sections.push({
      code: `SEC_${secCounter}`,
      title: sheet.name || `Sección ${secCounter}`,
      order: secCounter,
      fields: fields.length > 0 ? fields : [
        { code: `field_${fieldCounter++}`, label: 'Observaciones Generales', field_type: 'TEXTAREA', required: false, order: 1 }
      ]
    });
    secCounter++;
  }

  const codeSlug = interRep.workbook_name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();

  return {
    schema_version: 'FORM-DEFINITION-001',
    form_code: `FORM_${codeSlug}`,
    title: `Formulario Extraído: ${interRep.workbook_name}`,
    form_family: targetFamily,
    target_response_table: resolveTargetResponseTable(targetFamily),
    version: '1.0',
    sections: sections.length > 0 ? sections : [{
      code: 'SEC_GENERAL',
      title: 'Datos Generales',
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
 * Invokes OpenAI API (gpt-4.1-mini) with Structured Outputs if enabled, otherwise falls back to deterministic generator
 */
export async function generateFormSemantics(
  interRep: IntermediateRepresentation,
  apiKey: string | undefined,
  targetFamily: FormFamily = 'FORMULARIO_GENERICO'
): Promise<{ formDef: FormDefinition; llmUsed: boolean; tokens: { input: number; output: number } }> {
  if (!apiKey) {
    // Fallback to deterministic parser
    return {
      formDef: buildDeterministicFormDefinition(interRep, targetFamily),
      llmUsed: false,
      tokens: { input: 0, output: 0 }
    };
  }

  try {
    const userPrompt = `Formato: ${interRep.workbook_name}\nHojas: ${JSON.stringify(interRep.sheets.slice(0, 2))}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: AG006_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    });

    if (!res.ok) {
      console.warn('[AG006OpenAIAdapter] OpenAI API call failed, falling back to deterministic parser.');
      return {
        formDef: buildDeterministicFormDefinition(interRep, targetFamily),
        llmUsed: false,
        tokens: { input: 0, output: 0 }
      };
    }

    const data = await res.json();
    const content = data.choices[0]?.message?.content;
    const parsed = JSON.parse(content);
    parsed.target_response_table = resolveTargetResponseTable(parsed.form_family || targetFamily);
    const val = validateFormDefinition(parsed);

    if (val.isValid) {
      return {
        formDef: parsed as FormDefinition,
        llmUsed: true,
        tokens: {
          input: data.usage?.prompt_tokens || 0,
          output: data.usage?.completion_tokens || 0
        }
      };
    }
  } catch (err) {
    console.warn('[AG006OpenAIAdapter] Error in GPT-4.1 Mini processing:', err);
  }

  return {
    formDef: buildDeterministicFormDefinition(interRep, targetFamily),
    llmUsed: false,
    tokens: { input: 0, output: 0 }
  };
}
