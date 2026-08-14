// supabase/functions/agents-orchestrator/agents/ag006/intermediate/intermediate-builder.ts
// Intermediate Representation Builder (WORKBOOK-IR-001) for AG-006.2

import type { ParsedWorkbook, ParsedCell } from '../parser/workbook-types.ts';
import type { WorkbookIR, IRSheet, IRRegion, RegionType } from './intermediate.types.ts';

export const IR_VERSION = 'WORKBOOK-IR-001';

/**
 * Classifies a group of cells into a logical region type
 */
export function classifyRegionType(cells: ParsedCell[], sheetOrder: number, rIdx: number): RegionType {
  if (cells.length === 0) return 'UNKNOWN_REGION';

  const firstText = cells.find(c => c.normalized_value)?.normalized_value.toLowerCase() || '';

  if (rIdx === 0 && (firstText.includes('checklist') || firstText.includes('levantamiento') || firstText.includes('mantenimiento') || firstText.includes('formulario'))) {
    return 'TITLE_REGION';
  }

  if (firstText.includes('máquina') || firstText.includes('fecha') || firstText.includes('técnico') || firstText.includes('folio')) {
    return 'HEADER_REGION';
  }

  if (firstText.includes('revisar') || firstText.includes('inspeccionar') || firstText.includes('verificar') || firstText.includes('pregunta') || firstText.includes('parámetro')) {
    return 'QUESTION_REGION';
  }

  if (firstText.includes('sí') || firstText.includes('no') || firstText.includes('n/a') || firstText.includes('opciones')) {
    return 'OPTIONS_REGION';
  }

  if (firstText.includes('nota') || firstText.includes('instrucción') || firstText.includes('importante')) {
    return 'INSTRUCTION_REGION';
  }

  return 'TABLE_REGION';
}

/**
 * Builds WORKBOOK-IR-001 representation from ParsedWorkbook
 */
export function buildIntermediateRepresentation(parsed: ParsedWorkbook): WorkbookIR {
  const irSheets: IRSheet[] = [];
  const parserWarnings: string[] = [];

  for (const sheet of parsed.sheets) {
    const regions: IRRegion[] = [];
    
    // Group cells row by row into regions
    const rowMap = new Map<number, ParsedCell[]>();
    for (const cell of sheet.cells) {
      if (!cell.normalized_value) continue;
      if (!rowMap.has(cell.row)) {
        rowMap.set(cell.row, []);
      }
      rowMap.get(cell.row)!.push(cell);
    }

    let regIdx = 0;
    rowMap.forEach((rowCells, rowNum) => {
      const regType = classifyRegionType(rowCells, sheet.order, regIdx);
      regions.push({
        range: `A${rowNum}:Z${rowNum}`,
        region_type: regType,
        label: rowCells[0]?.normalized_value || `Fila_${rowNum}`,
        cells: rowCells
      });
      regIdx++;
    });

    irSheets.push({
      name: sheet.name,
      order: sheet.order,
      visibility: sheet.visibility,
      regions
    });
  }

  return {
    ir_version: IR_VERSION,
    source: {
      file_name: parsed.file_name,
      file_hash: parsed.file_hash,
      extension: parsed.extension,
      has_macros: parsed.security.has_macros
    },
    workbook: {
      sheet_count: irSheets.length,
      sheets: irSheets
    },
    security_findings: parsed.security.findings,
    parser_warnings: parserWarnings
  };
}
