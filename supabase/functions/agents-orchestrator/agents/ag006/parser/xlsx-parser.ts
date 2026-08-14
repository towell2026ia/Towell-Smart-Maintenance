// supabase/functions/agents-orchestrator/agents/ag006/parser/xlsx-parser.ts
// Deterministic XLSX / XLSM Parser & Safe Macro Detector for AG-006 v1.0

import { IntermediateRepresentation, IntermediateSheet, IntermediateRegion, IntermediateCell } from '../types/ag006.types.ts';

export const PARSER_VERSION = 'PARSER-001';

/**
 * Computes Web Crypto SHA-256 hex hash for file content
 */
export async function computeSha256(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Inspects a binary file or raw payload for XLSM macro markers (vbaProject.bin, Macro, VBA)
 * Macro code is NEVER executed.
 */
export function detectMacroSignatures(fileData: string | Uint8Array | Record<string, any>): {
  hasMacros: boolean;
  macroNames: string[];
} {
  const macroNames: string[] = [];

  if (typeof fileData === 'object' && !ArrayBuffer.isView(fileData) && !(fileData instanceof Uint8Array)) {
    // Inserts mock / JSON payload detection
    if (fileData.has_macros || fileData.vba_detected) {
      macroNames.push(fileData.macro_name || 'AutoExec_Macro');
      return { hasMacros: true, macroNames };
    }
  }

  const str = typeof fileData === 'string' 
    ? fileData 
    : new TextDecoder('latin1').decode(fileData as Uint8Array);

  if (str.includes('vbaProject.bin') || str.includes('VBA/') || str.includes('Sub AutoOpen') || str.includes('Sub Workbook_Open')) {
    macroNames.push('VBA_Project_Macro');
    return { hasMacros: true, macroNames };
  }

  return { hasMacros: false, macroNames: [] };
}

/**
 * Parses raw JSON / Excel payload into IntermediateRepresentation
 */
export async function parseWorkbookToIntermediate(
  fileName: string,
  rawPayload: Record<string, any>
): Promise<IntermediateRepresentation> {
  const fileHash = rawPayload.file_hash || await computeSha256(JSON.stringify(rawPayload));
  const macroCheck = detectMacroSignatures(rawPayload);

  const sheets: IntermediateSheet[] = [];

  const rawSheets = Array.isArray(rawPayload.sheets) 
    ? rawPayload.sheets 
    : [{ name: rawPayload.sheet_name || 'Hoja1', rows: rawPayload.rows || [] }];

  for (const rawSheet of rawSheets) {
    const sheetName = rawSheet.name || 'Checklist';
    const regions: IntermediateRegion[] = [];

    const cells: IntermediateCell[] = [];
    const rows = Array.isArray(rawSheet.rows) ? rawSheet.rows : [];

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const rowObj = rows[rIdx];
      if (typeof rowObj === 'object' && rowObj !== null) {
        const keys = Object.keys(rowObj);
        for (let cIdx = 0; cIdx < keys.length; cIdx++) {
          const k = keys[cIdx];
          const val = rowObj[k];
          const colLetter = String.fromCharCode(65 + (cIdx % 26));
          const address = `${colLetter}${rIdx + 1}`;

          cells.push({
            address,
            value: val,
            data_type: typeof val === 'number' ? 'NUMBER' : 'STRING'
          });
        }
      }
    }

    regions.push({
      range: `A1:Z${Math.max(rows.length, 1)}`,
      label: sheetName,
      cells
    });

    sheets.push({
      name: sheetName,
      regions
    });
  }

  return {
    workbook_name: fileName,
    file_hash: fileHash,
    has_macros: macroCheck.hasMacros,
    macro_names: macroCheck.macroNames,
    sheets
  };
}
