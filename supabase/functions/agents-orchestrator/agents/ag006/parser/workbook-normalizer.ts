// supabase/functions/agents-orchestrator/agents/ag006/parser/workbook-normalizer.ts
// Cell Normalizer Engine for AG-006.2

export function normalizeCellValue(rawValue: any): {
  normalized: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'empty';
} {
  if (rawValue === null || rawValue === undefined) {
    return { normalized: '', type: 'empty' };
  }

  if (typeof rawValue === 'number') {
    return { normalized: String(rawValue), type: 'number' };
  }

  if (typeof rawValue === 'boolean') {
    return { normalized: rawValue ? 'TRUE' : 'FALSE', type: 'boolean' };
  }

  const str = String(rawValue).normalize('NFC').replace(/\r\n/g, '\n').trim();

  if (!str) {
    return { normalized: '', type: 'empty' };
  }

  // Detect Date strings ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return { normalized: str, type: 'date' };
  }

  return { normalized: str, type: 'string' };
}
