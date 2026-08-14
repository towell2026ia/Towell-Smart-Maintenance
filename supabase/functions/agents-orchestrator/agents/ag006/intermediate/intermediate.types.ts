// supabase/functions/agents-orchestrator/agents/ag006/intermediate/intermediate.types.ts
// WORKBOOK-IR-001 Domain Types for AG-006.2

import { ParsedCell, SecurityFinding } from '../parser/workbook-types.ts';

export type RegionType =
  | 'TITLE_REGION'
  | 'HEADER_REGION'
  | 'TABLE_REGION'
  | 'QUESTION_REGION'
  | 'OPTIONS_REGION'
  | 'INSTRUCTION_REGION'
  | 'UNKNOWN_REGION';

export interface IRRegion {
  range: string;
  region_type: RegionType;
  label?: string;
  cells: ParsedCell[];
}

export interface IRSheet {
  name: string;
  order: number;
  visibility: 'visible' | 'hidden' | 'very_hidden';
  regions: IRRegion[];
}

export interface WorkbookIR {
  ir_version: 'WORKBOOK-IR-001';
  source: {
    file_name: string;
    file_hash: string;
    extension: string;
    has_macros: boolean;
  };
  workbook: {
    sheet_count: number;
    sheets: IRSheet[];
  };
  security_findings: SecurityFinding[];
  parser_warnings: string[];
}
