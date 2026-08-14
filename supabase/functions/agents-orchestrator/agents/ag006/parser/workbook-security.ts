// supabase/functions/agents-orchestrator/agents/ag006/parser/workbook-security.ts
// Workbook Security Inspector for AG-006.2 v1.2 (Security Matrix & Structural Macro Inspector)

import type { SecurityCheckResult, SecurityFinding, AllowedExtension, WorkbookSourceMeta } from './workbook-types.ts';

const ALLOWED_EXTENSIONS: AllowedExtension[] = ['xlsx', 'xlsm'];

/**
 * Inspects a workbook payload or buffer for security violations, macro signatures, and corruption.
 * Security Matrix:
 * - MACRO_DETECTED / VBA_DETECTED -> CONTINUE_WITH_WARNING (safe_to_parse = true)
 * - ACTIVEX_DETECTED -> HUMAN_REVIEW_REQUIRED (safe_to_parse = true)
 * - WORKBOOK_CORRUPTED / FILE_EXTENSION_NOT_ALLOWED -> BLOCK (safe_to_parse = false)
 * CRITICAL RULE: Macros and VBA code are NEVER executed.
 */
export function inspectWorkbookSecurity(
  meta: WorkbookSourceMeta,
  rawPayload: Record<string, any> | Uint8Array | string
): SecurityCheckResult {
  const findings: SecurityFinding[] = [];
  const fileName = meta.fileName || 'file.xlsx';
  
  // 1. Check file extension
  const extMatch = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  const extension = extMatch ? extMatch[1] : '';

  if (!ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    findings.push({
      code: 'FILE_EXTENSION_NOT_ALLOWED',
      severity: 'CRITICAL',
      action: 'BLOCK',
      message: `La extensión de archivo '.${extension}' no está autorizada. Solo se permiten .xlsx y .xlsm.`
    });
    return {
      safe_to_parse: false,
      extension,
      has_macros: false,
      has_unsupported_components: true,
      requires_human_review: true,
      findings
    };
  }

  // 2. Check for workbook corruption flag
  if (typeof rawPayload === 'object' && rawPayload !== null && (rawPayload as any).corrupted) {
    findings.push({
      code: 'WORKBOOK_CORRUPTED',
      severity: 'CRITICAL',
      action: 'BLOCK',
      message: `El archivo '${fileName}' se encuentra dañado o ilegible.`
    });
    return {
      safe_to_parse: false,
      extension,
      has_macros: false,
      has_unsupported_components: true,
      requires_human_review: true,
      findings
    };
  }

  // 3. Structural Macro / VBA Container Detection
  // Structural check ignores cell text like "Curso de programación VBA" or "AutoOpen"
  let hasMacros = false;

  if (typeof rawPayload === 'object' && rawPayload !== null) {
    if ((rawPayload as any).has_macros || (rawPayload as any).vba_container_present) {
      hasMacros = true;
    }
  } else if (typeof rawPayload === 'string') {
    // Structural container inspection (vbaProject.bin or VBA container headers)
    if (rawPayload.includes('vbaProject.bin') || rawPayload.includes('PK\x03\x04') && rawPayload.includes('xl/vbaProject.bin')) {
      hasMacros = true;
    }
  }

  // Mandatory check: .xlsm extension inherently indicates macro container
  if (extension === 'xlsm') {
    hasMacros = true;
  }

  if (hasMacros) {
    findings.push({
      code: 'MACRO_DETECTED',
      severity: 'WARNING',
      action: 'CONTINUE_WITH_WARNING',
      message: `Se detectó un contenedor de macros/VBA en '${fileName}'. Se permite el parsing estructural; las macros NUNCA se ejecutan.`,
      details: { macro_names: (typeof rawPayload === 'object' && (rawPayload as any).macro_name) ? [(rawPayload as any).macro_name] : ['vbaProject.bin'] }
    });
  }

  // 4. Check for ActiveX or Embedded Objects
  let hasUnsupported = false;
  let requiresHumanReview = false;

  if (typeof rawPayload === 'object' && rawPayload !== null && (rawPayload as any).unsupported_activex) {
    hasUnsupported = true;
    requiresHumanReview = true;
    findings.push({
      code: 'ACTIVEX_DETECTED',
      severity: 'WARNING',
      action: 'HUMAN_REVIEW_REQUIRED',
      message: `Se detectaron componentes ActiveX no soportados en '${fileName}'. Se requiere revisión humana.`
    });
  }

  const isBlocked = findings.some(f => f.action === 'BLOCK');

  return {
    safe_to_parse: !isBlocked,
    extension,
    has_macros: hasMacros,
    has_unsupported_components: hasUnsupported,
    requires_human_review: requiresHumanReview || hasMacros || hasUnsupported,
    findings
  };
}
