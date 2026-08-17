// supabase/functions/agents-orchestrator/agents/ag009/ag009_1/core/state-machine.ts
// Workflow State Machine for AG-009.1 (§53, §54 PRD-AG-009.1)

import { AG009WorkflowState } from '../../types/ag009.types.ts';
import { PreventiveConnectorError } from '../errors/preventive-error-catalog.ts';

export const ALLOWED_STATE_TRANSITIONS: Record<AG009WorkflowState, AG009WorkflowState[]> = {
  SCHEDULED: ['VALIDATED', 'BLOCKED'],
  VALIDATED: ['PENDING_APPROVAL', 'BLOCKED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'BLOCKED'],
  APPROVED: ['OT_CREATED', 'BLOCKED'],
  REJECTED: ['BLOCKED'],
  OT_CREATED: [],
  BLOCKED: []
};

export class PreventiveStateMachine {
  private currentState: AG009WorkflowState;

  constructor(initialState: AG009WorkflowState = 'SCHEDULED') {
    this.currentState = initialState;
  }

  public getState(): AG009WorkflowState {
    return this.currentState;
  }

  public transitionTo(nextState: AG009WorkflowState): void {
    const allowed = ALLOWED_STATE_TRANSITIONS[this.currentState] || [];
    if (!allowed.includes(nextState)) {
      throw new PreventiveConnectorError(
        'INVALID_STATE_TRANSITION',
        `Transición de estado no permitida: de "${this.currentState}" hacia "${nextState}".`
      );
    }
    this.currentState = nextState;
  }
}
