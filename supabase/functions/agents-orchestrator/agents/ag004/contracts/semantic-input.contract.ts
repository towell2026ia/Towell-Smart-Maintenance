// supabase/functions/agents-orchestrator/agents/ag004/contracts/semantic-input.contract.ts
// Manifest: AG004-SEMANTIC-INPUT-001 (Strict Input Contract for MiMo Interpretation Layer)

import { DepartmentCode, AutonomousBlock } from '../types/ag004.types.ts';

export const SEMANTIC_INPUT_VERSION = 'AG004-SEMANTIC-INPUT-001';

export interface AutonomousFindingSummary {
  finding_id: string;
  block: AutonomousBlock;
  item_code: string;
  finding_description: string;
  severity: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  week_reference: string | number;
  year: number;
}

export interface AutonomousCorrectiveSummary {
  request_folio: string;
  finding_id?: string;
  status: string;
  work_order_folio?: string;
  date: string;
}

export interface AutonomousSemanticInputPayload {
  contract_id: 'AG004-SEMANTIC-INPUT-001';
  machine: {
    machine_id: string;
    machine_name?: string;
    department: DepartmentCode;
    criticality: 'MUY_ALTA' | 'ALTA' | 'MEDIA' | 'BAJA';
  };
  target_week: {
    iso_year: number;
    iso_week: number;
    week_key: string;
  };
  schedule: {
    scheduled_date: string;
    day_of_week: string;
    calendar_reference: string;
    survey_reference: string;
  };
  historical_context: {
    last_autonomous_date: string | null;
    completed_autonomous_count: number;
    pending_autonomous_count: number;
    cancelled_count: number;
    recent_findings: AutonomousFindingSummary[];
    recent_correctives: AutonomousCorrectiveSummary[];
    data_quality_status: 'COMPLETE' | 'PARTIAL' | 'NO_HISTORY';
  };
  checklist_definition: {
    blocks: readonly AutonomousBlock[];
    mandatory_block: AutonomousBlock;
  };
  source_references: string[];
}
