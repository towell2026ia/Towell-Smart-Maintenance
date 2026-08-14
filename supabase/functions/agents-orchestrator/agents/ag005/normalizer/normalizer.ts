// supabase/functions/agents-orchestrator/agents/ag005/normalizer/normalizer.ts
// Value Normalization Engine DATA-NORM-001 for AG-005 Auditor de Bases v1.0

import { NormalizationRecord } from '../types/ag005.types.ts';

export const NORMALIZER_VERSION = 'DATA-NORM-001';

/**
 * Normalizes column header strings
 */
export function normalizeColumnName(colName: string): string {
  if (!colName) return '';
  return colName
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_ ]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Normalizes machine code and infers plant area and process.
 * Replicates exact business logic from importar_excel.js.
 */
export function normalizeMachineCode(rawCode: any): {
  normalized_code: string;
  inferred_area: string;
  inferred_process: string;
  clave: string;
  transformation?: NormalizationRecord;
} {
  const str = String(rawCode || '').trim().toUpperCase();
  if (!str) {
    return {
      normalized_code: '',
      inferred_area: 'PF',
      inferred_process: 'Tejido',
      clave: ''
    };
  }

  let inferred_area = 'PF';
  let inferred_process = 'Tejido';

  if (str.includes('COS')) {
    inferred_area = 'CF';
    inferred_process = 'Costura';
  } else if (str.includes('TIN') || str.includes('JET')) {
    inferred_area = 'TF';
    inferred_process = 'Tintorería';
  } else if (str.includes('AUX') || str.includes('SUB') || str.includes('COM')) {
    inferred_area = 'AF';
    inferred_process = 'Auxiliares';
  }

  const parts = str.split('-');
  const clave = parts.length > 1 ? parts[1] : str;

  const normalized_code = str.replace(/\s+/g, '-');

  const record: NormalizationRecord = {
    field: 'maquina_id',
    original_value: rawCode,
    normalized_value: normalized_code,
    rule_applied: `DATA-NORM-001:INFER_AREA_${inferred_area}`
  };

  return {
    normalized_code,
    inferred_area,
    inferred_process,
    clave,
    transformation: record
  };
}

/**
 * Normalizes date formats (Excel serial number, YYYY-MM-DD, DD/MM/YYYY)
 */
export function normalizeDate(value: any): {
  date: Date | null;
  iso_string: string | null;
  isValid: boolean;
  transformation?: NormalizationRecord;
} {
  if (value === undefined || value === null || value === '') {
    return { date: null, iso_string: null, isValid: false };
  }

  let parsedDate: Date | null = null;

  // Handle Excel Serial Number (e.g. 45292)
  if (typeof value === 'number' || (!isNaN(Number(value)) && !String(value).includes('/') && !String(value).includes('-'))) {
    const num = Number(value);
    // Excel serial offset 25569 days to Unix Epoch
    parsedDate = new Date(Math.round((num - 25569) * 86400 * 1000));
  } else if (value instanceof Date) {
    parsedDate = value;
  } else if (typeof value === 'string') {
    const str = value.trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      parsedDate = new Date(str);
    }
    // DD/MM/YYYY
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
      const parts = str.split('/');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      parsedDate = new Date(year, month, day);
    } else {
      const ts = Date.parse(str);
      if (!isNaN(ts)) {
        parsedDate = new Date(ts);
      }
    }
  }

  if (!parsedDate || isNaN(parsedDate.getTime())) {
    return { date: null, iso_string: null, isValid: false };
  }

  const iso = parsedDate.toISOString();
  return {
    date: parsedDate,
    iso_string: iso,
    isValid: true,
    transformation: {
      field: 'fecha',
      original_value: value,
      normalized_value: iso,
      rule_applied: 'DATA-NORM-001:PARSED_DATE'
    }
  };
}

/**
 * Normalizes numeric inputs (strips currency signs, handles comma decimals)
 */
export function normalizeNumeric(value: any, isDecimal: boolean = false): {
  numberValue: number | null;
  isValid: boolean;
  transformation?: NormalizationRecord;
} {
  if (value === undefined || value === null || value === '') {
    return { numberValue: null, isValid: false };
  }

  if (typeof value === 'number') {
    return { numberValue: value, isValid: !isNaN(value) };
  }

  const cleanStr = String(value)
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .trim();

  const num = isDecimal ? parseFloat(cleanStr) : parseInt(cleanStr, 10);

  if (isNaN(num)) {
    return { numberValue: null, isValid: false };
  }

  return {
    numberValue: num,
    isValid: true,
    transformation: {
      field: 'numeric',
      original_value: value,
      normalized_value: num,
      rule_applied: 'DATA-NORM-001:CLEAN_NUMERIC'
    }
  };
}

/**
 * Normalizes text fields (trims and collapses whitespace)
 */
export function normalizeText(value: any): string {
  if (value === undefined || value === null) return '';
  return String(value).trim().replace(/\s+/g, ' ');
}
