// supabase/functions/agents-orchestrator/agents/ag006/ag006-executor.ts
// AG-006 Constructor de Formularios v1.1 — Specialist Agent Engine

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AG006AuditResult, FormFamily } from './types/ag006.types.ts';
import { parseWorkbookToIntermediate, PARSER_VERSION } from './parser/xlsx-parser.ts';
import { validateFormDefinition, VALIDATOR_VERSION } from './validators/form-validator.ts';
import { generateFormSemantics, resolveTargetResponseTable } from './providers/ag006-openai-adapter.ts';

export const AGENT_VERSION = '1.0';
export const SCHEMA_VERSION = 'FORM-DEFINITION-001';

export async function executeAG006FormBuilder(
  supabase: SupabaseClient | null,
  payload: Record<string, any>,
  correlationId: string,
  openAiApiKey?: string
): Promise<AG006AuditResult> {
  const warnings: string[] = [];

  const fileName = payload.form_name || payload.nombre_archivo || payload.file_name || 'formulario_template.xlsx';
  const targetFamily: FormFamily = payload.form_family || payload.tipo_formulario || 'FORMULARIO_GENERICO';
  const targetResponseTable = resolveTargetResponseTable(targetFamily);

  // 1. Safe Parse & Macro Check
  const interRep = await parseWorkbookToIntermediate(fileName, payload);

  if (interRep.has_macros) {
    warnings.push(`UNSUPPORTED_MACRO_LOGIC: Se detectaron macros o código VBA [${interRep.macro_names?.join(', ')}] en el archivo '${fileName}'. No se ejecutaron de acuerdo con la política de seguridad.`);
  }

  // 2. Generate Form Semantics
  const semanticsRes = await generateFormSemantics(interRep, openAiApiKey, targetFamily);
  const formDef = semanticsRes.formDef;

  // 3. Validate Form Definition
  const valResult = validateFormDefinition(formDef);
  for (const f of valResult.findings) {
    warnings.push(`[${f.code}] ${f.message}`);
  }

  // Count Sections and Fields
  let fieldsCount = 0;
  for (const sec of formDef.sections) {
    fieldsCount += sec.fields ? sec.fields.length : 0;
  }

  const status: AG006AuditResult['status'] = interRep.has_macros
    ? 'UNSUPPORTED_MACRO_LOGIC'
    : (valResult.isValid ? 'DRAFT_READY_FOR_REVIEW' : 'INVALID_FORM_DEFINITION');

  return {
    status,
    agent_id: 'AG-006',
    correlation_id: correlationId,
    source_file_name: fileName,
    source_file_hash: interRep.file_hash,
    form_family: targetFamily,
    target_response_table: targetResponseTable,
    sections_count: formDef.sections.length,
    fields_count: fieldsCount,
    unsupported_components_count: interRep.has_macros ? (interRep.macro_names?.length || 1) : 0,
    ambiguous_fields_count: 0,
    can_publish: false, // Never auto-publish! Always requires human review
    requires_human_review: true,
    draft_definition: formDef,
    warnings,
    agent_version: AGENT_VERSION,
    parser_version: PARSER_VERSION,
    schema_version: SCHEMA_VERSION
  };
}
