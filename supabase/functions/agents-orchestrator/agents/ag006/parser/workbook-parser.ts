// supabase/functions/agents-orchestrator/agents/ag006/parser/workbook-parser.ts
// Pure Workbook Parser for AG-006.2 v1.2

import type { ParsedWorkbook, ParsedSheet, ParsedCell, DataValidationRule, AllowedExtension, WorkbookSourceMeta } from './workbook-types.ts';
import { inspectWorkbookSecurity } from './workbook-security.ts';
import { normalizeCellValue } from './workbook-normalizer.ts';

export const PARSER_VERSION = 'FORM-PARSER-001';

export async function computeSha256(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Pure workbook parser accepting raw payload or bytes and source metadata.
 * Works uniformly regardless of origin (Supabase Storage, local file, upload, fixture).
 */
export async function parseWorkbookSafely(
  inputData: Record<string, any> | Uint8Array | string,
  meta?: Partial<WorkbookSourceMeta>
): Promise<ParsedWorkbook> {
  const sourceMeta: WorkbookSourceMeta = {
    fileName: meta?.fileName || (typeof inputData === 'object' && (inputData as any).form_name) || 'workbook.xlsx',
    mimeType: meta?.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sourceId: meta?.sourceId || 'local_payload'
  };

  const rawPayload = typeof inputData === 'object' && inputData !== null ? inputData : {};
  const security = inspectWorkbookSecurity(sourceMeta, inputData);
  const fileHash = (rawPayload as any).file_hash || await computeSha256(typeof inputData === 'string' ? inputData : JSON.stringify(inputData));

  if (!security.safe_to_parse) {
    return {
      file_name: sourceMeta.fileName,
      file_hash: fileHash,
      extension: (security.extension as AllowedExtension) || 'xlsx',
      sheet_count: 0,
      sheets: [],
      security
    };
  }

  const sheets: ParsedSheet[] = [];

  const rawSheets = Array.isArray((rawPayload as any).sheets)
    ? (rawPayload as any).sheets
    : [{ name: (rawPayload as any).sheet_name || 'Sheet1', rows: (rawPayload as any).rows || [] }];

  let orderIndex = 1;

  for (const rawSheet of rawSheets) {
    const sheetName = rawSheet.name || `Hoja_${orderIndex}`;
    const visibility = rawSheet.visibility || 'visible';
    const mergedRanges: string[] = rawSheet.merged_ranges || [];
    const dataValidations: DataValidationRule[] = rawSheet.data_validations || [];

    const cells: ParsedCell[] = [];
    const rows = Array.isArray(rawSheet.rows) ? rawSheet.rows : [];

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const rowObj = rows[rIdx];
      if (typeof rowObj === 'object' && rowObj !== null) {
        const keys = Object.keys(rowObj);
        for (let cIdx = 0; cIdx < keys.length; cIdx++) {
          const key = keys[cIdx];
          const rawVal = rowObj[key];
          const colLetter = String.fromCharCode(65 + (cIdx % 26));
          const address = `${colLetter}${rIdx + 1}`;

          const norm = normalizeCellValue(rawVal);
          const formula = typeof rawVal === 'string' && rawVal.startsWith('=') ? rawVal : null;

          cells.push({
            address,
            row: rIdx + 1,
            column: cIdx + 1,
            raw_value: rawVal,
            normalized_value: norm.normalized,
            value_type: norm.type,
            formula,
            cached_value: formula ? rowObj[`${key}_cached`] : undefined,
            merged: mergedRanges.some(m => m.includes(address)),
            merge_range: mergedRanges.find(m => m.includes(address)) || null
          });
        }
      }
    }

    sheets.push({
      name: sheetName,
      order: orderIndex++,
      visibility,
      used_range: `A1:Z${Math.max(rows.length, 1)}`,
      cells,
      merged_ranges: mergedRanges,
      data_validations: dataValidations
    });
  }

  return {
    file_name: sourceMeta.fileName,
    file_hash: fileHash,
    extension: (security.extension as AllowedExtension) || 'xlsx',
    sheet_count: sheets.length,
    sheets,
    security
  };
}
