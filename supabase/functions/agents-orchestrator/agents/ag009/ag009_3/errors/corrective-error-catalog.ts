// supabase/functions/agents-orchestrator/agents/ag009/ag009_3/errors/corrective-error-catalog.ts
// Comprehensive Error Catalog for AG-009.3 Conector Correctivo v1.0 (§72 PRD)

export type CorrectiveErrorCode =
  | 'INVALID_EVENT'
  | 'INVALID_CONTRACT'
  | 'INVALID_SOURCE'
  | 'MISSING_REQUIRED_DATA'
  | 'MACHINE_NOT_FOUND'
  | 'MACHINE_INACTIVE'
  | 'DEPARTMENT_NOT_FOUND'
  | 'INVALID_SOURCE_REFERENCE'
  | 'DUPLICATE_EVENT'
  | 'POSSIBLE_DUPLICATE'
  | 'CORRECTIVE_REQUEST_NOT_FOUND'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_INVALID'
  | 'APPROVAL_ALREADY_USED'
  | 'APPROVAL_PAYLOAD_MISMATCH'
  | 'PARENT_OT_NOT_FOUND'
  | 'INVALID_SUBTASK_REQUEST'
  | 'INVALID_STATE_TRANSITION'
  | 'PERSISTENCE_ERROR'
  | 'AGENT_CONNECTOR_DISABLED';

export class CorrectiveConnectorError extends Error {
  public readonly code: CorrectiveErrorCode;
  public readonly details?: Record<string, any>;

  constructor(code: CorrectiveErrorCode, message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'CorrectiveConnectorError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, CorrectiveConnectorError.prototype);
  }
}
