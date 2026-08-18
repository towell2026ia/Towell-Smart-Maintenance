// supabase/functions/agents-orchestrator/agents/ag009/ag009_3/core/state-machine.ts
// Corrective Work Order State Machine for AG-009.3 (§52, §55 PRD)

import { AG009WorkflowState } from '../../types/ag009.types.ts';
import { CorrectiveConnectorError } from '../errors/corrective-error-catalog.ts';

const VALID_TRANSITIONS: Record<AG009WorkflowState, AG009WorkflowState[]> = {
  REQUESTED: ['VALIDATED', 'BLOCKED'],
  VALIDATED: ['CORRECTIVE_REQUEST_PREPARED', 'PENDING_APPROVAL', 'SUBTASK_PREPARED', 'BLOCKED'],
  CORRECTIVE_REQUEST_PREPARED: ['PENDING_APPROVAL', 'APPROVED', 'BLOCKED'],
  SURVEY_PREPARED: ['IN_PROGRESS', 'BLOCKED'],
  SCHEDULED: ['VALIDATED', 'BLOCKED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'BLOCKED'],
  APPROVED: ['OT_CREATED', 'BLOCKED'],
  REJECTED: ['BLOCKED'],
  OT_CREATED: ['ASSIGNED', 'IN_PROGRESS', 'BLOCKED'],
  SUBTASK_PREPARED: ['ASSIGNED', 'IN_PROGRESS', 'BLOCKED'],
  ASSIGNED: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['IN_VALIDATION', 'BLOCKED'],
  IN_VALIDATION: ['CLOSED', 'IN_PROGRESS', 'BLOCKED'],
  CLOSED: [],
  AUTONOMOUS_SURVEY_COMPLETED: [],
  AUTONOMOUS_FINDING_DETECTED: [],
  BLOCKED: []
};

export class CorrectiveStateMachine {
  private currentState: AG009WorkflowState;

  constructor(initialState: AG009WorkflowState = 'REQUESTED') {
    this.currentState = initialState;
  }

  public getState(): AG009WorkflowState {
    return this.currentState;
  }

  public transitionTo(nextState: AG009WorkflowState): void {
    const allowed = VALID_TRANSITIONS[this.currentState] || [];
    if (!allowed.includes(nextState)) {
      throw new CorrectiveConnectorError(
        'INVALID_STATE_TRANSITION',
        `Transición de estado inválida: "${this.currentState}" -> "${nextState}".`
      );
    }
    this.currentState = nextState;
  }
}
