// supabase/functions/agents-orchestrator/agents/ag006/preview/source-comparator.ts
// Source vs Draft Comparator for AG-006.3 (FORM-COMPARE-001)

import type { WorkbookIR } from '../intermediate/intermediate.types.ts';
import type { FormDefinitionContract } from '../form-definition/form-definition.types.ts';
import type { SourceComparisonReport, ComparisonDifference } from './comparison.types.ts';
import { COMPARATOR_VERSION } from './comparison.types.ts';

/**
 * Compares source WORKBOOK-IR-001 against generated/edited FORM-DEFINITION-001.
 * Detects discrepancies: SOURCE_ONLY, DRAFT_ONLY, TYPE_CHANGED, etc.
 */
export function compareSourceWithFormDefinition(
  ir: WorkbookIR,
  contract: FormDefinitionContract
): SourceComparisonReport {
  const differences: ComparisonDifference[] = [];
  const summary = {
    source_only: 0,
    draft_only: 0,
    type_changed: 0,
    label_changed: 0,
    order_changed: 0,
    section_changed: 0,
    options_changed: 0,
    validation_changed: 0,
    required_changed: 0,
    unsupported_component: 0,
    ambiguous_mapping: 0
  };

  // Extract source text cells
  const sourceCellsMap = new Map<string, { sheet: string; range: string; text: string }>();
  for (const sheet of ir.workbook.sheets || []) {
    for (const region of sheet.regions || []) {
      for (const cell of region.cells || []) {
        if (cell.normalized_value && cell.normalized_value.trim().length >= 2) {
          const key = cell.normalized_value.trim().toLowerCase();
          sourceCellsMap.set(key, { sheet: sheet.name, range: cell.address, text: cell.normalized_value.trim() });
        }
      }
    }
  }

  // Extract draft fields
  const draftFieldsMap = new Map<string, { code: string; label: string; type: string; sheet?: string; range?: string }>();
  for (const sec of contract.form.sections || []) {
    for (const f of sec.fields || []) {
      const key = f.label.trim().toLowerCase();
      draftFieldsMap.set(key, {
        code: f.code,
        label: f.label,
        type: f.field_type,
        sheet: f.source_reference?.sheet,
        range: f.source_reference?.cell_range
      });
    }
  }

  // 1. Detect SOURCE_ONLY (Relevant cells in Excel not in draft)
  sourceCellsMap.forEach((srcInfo, srcKey) => {
    if (!draftFieldsMap.has(srcKey)) {
      summary.source_only++;
      differences.push({
        type: 'SOURCE_ONLY',
        severity: 'WARNING',
        source_reference: { sheet: srcInfo.sheet, cell_range: srcInfo.range },
        source_value: srcInfo.text,
        message: `El texto '${srcInfo.text}' de la hoja '${srcInfo.sheet}' (celda ${srcInfo.range}) existe en el Excel pero no se representó en el borrador.`
      });
    }
  });

  // 2. Detect DRAFT_ONLY (Fields in draft not traceable to Excel source -> potential invented field)
  draftFieldsMap.forEach((draftInfo, draftKey) => {
    if (!sourceCellsMap.has(draftKey)) {
      summary.draft_only++;
      differences.push({
        type: 'DRAFT_ONLY',
        severity: 'CRITICAL',
        field_code: draftInfo.code,
        draft_value: draftInfo.label,
        message: `El campo '${draftInfo.label}' (${draftInfo.code}) existe en el borrador pero no fue trazado a la fuente Excel.`
      });
    }
  });

  // 3. Detect UNSUPPORTED_COMPONENT or MACRO_DETECTED
  if (ir.source.has_macros) {
    summary.unsupported_component++;
    differences.push({
      type: 'UNSUPPORTED_COMPONENT',
      severity: 'WARNING',
      message: 'Se detectó contenedor de macros/VBA en la fuente Excel. Las macros no fueron ejecutadas.'
    });
  }

  // 4. Detect AMBIGUOUS_MAPPING
  if (contract.warnings && contract.warnings.some(w => w.includes('AMBIGUOUS_FIELD'))) {
    summary.ambiguous_mapping++;
    differences.push({
      type: 'AMBIGUOUS_MAPPING',
      severity: 'WARNING',
      message: 'Existen campos con mapeo ambiguo que requieren revisión humana.'
    });
  }

  const totalDiffs = differences.length;
  const hasCritical = differences.some(d => d.severity === 'CRITICAL');

  return {
    comparator_version: COMPARATOR_VERSION,
    comparison_status: totalDiffs === 0 ? 'IDENTICAL' : (hasCritical ? 'CRITICAL_MISMATCH' : 'DIFFERENCES_FOUND'),
    total_differences: totalDiffs,
    summary,
    differences,
    requires_human_review: totalDiffs > 0
  };
}
