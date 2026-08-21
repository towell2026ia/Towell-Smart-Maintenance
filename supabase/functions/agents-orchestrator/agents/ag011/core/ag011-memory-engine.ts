// supabase/functions/agents-orchestrator/agents/ag011/core/ag011-memory-engine.ts
// Master Deterministic Engine for AG-011 Technical Memory (v1.0)
// Frozen under Token: AG011-MEMORY-ENGINE-001
// Invariant: Closed Operation Catalog & 100% Deterministic Execution (§8-11 PRD-AG-011.2)

import { AG011MemoryCandidateResolver, type CandidateBuildParams } from '../candidates/ag011-memory-candidate-resolver.ts';
import { AG011MemoryBuilder, type MemoryBuildParams } from './ag011-memory-builder.ts';
import { AG011MemoryRetriever } from '../retrieval/ag011-memory-retriever.ts';
import { AG011MemoryApprovalGuard } from '../approval/ag011-memory-approval-guard.ts';
import { AG011MemoryStatusEngine } from '../lifecycle/ag011-memory-status-engine.ts';
import { AG011MemoryVersionEngine } from '../versioning/ag011-memory-version-engine.ts';
import { AG011MemoryConfigRegistry } from '../config/ag011-memory-config-registry.ts';
import { AG011MemoryAudit, type AG011AuditRecord } from '../audit/ag011-memory-audit.ts';
import type {
  AG011TechnicalMemoryItem,
  AG011MemoryCandidate,
  AG011MemoryQuery,
  AG011MemoryRetrievalOutput,
  AG011MemoryStatus
} from '../types/ag011.types.ts';

export type AG011Operation =
  | 'BUILD_CANDIDATE'
  | 'GET_MEMORY'
  | 'RETRIEVE_MEMORIES'
  | 'PROCESS_REVIEW_DECISION'
  | 'CREATE_NEW_VERSION'
  | 'SUPERSEDE_MEMORY'
  | 'RETIRE_MEMORY';

export interface AG011EngineRequest {
  request_id?: string;
  event_id?: string | null;
  correlation_id?: string | null;
  operation: AG011Operation;
  candidate_params?: CandidateBuildParams;
  memory_params?: MemoryBuildParams;
  query_params?: AG011MemoryQuery;
  approval_params?: {
    memory_id: string;
    version: string;
    reviewer_email: string;
    reviewer_role: string;
    decision: 'APPROVED' | 'REJECTED' | 'REVISE';
    notes: string;
    evidence_snapshot_sha256: string;
    is_ai_agent?: boolean;
  };
  supersede_params?: {
    prior_memory_id: string;
    new_memory_id: string;
  };
  retire_params?: {
    memory_id: string;
    reason: string;
  };
  memory_store?: AG011TechnicalMemoryItem[];
}

export interface AG011EngineResponse {
  success: boolean;
  agent_id: 'AG-011';
  operation: AG011Operation;
  result?: any;
  error?: string;
  audit_record: AG011AuditRecord;
  ag011_memory_model_sha256: string;
}

export class AG011MemoryEngine {
  public static async execute(request: AG011EngineRequest): Promise<AG011EngineResponse> {
    const startTime = Date.now();
    const reqId = request.request_id || `REQ-MEM-${Date.now()}`;
    const modelEvidence = AG011MemoryConfigRegistry.getCompositeMemoryModelEvidence();

    try {
      let opResult: any = null;

      switch (request.operation) {
        case 'BUILD_CANDIDATE': {
          if (!request.candidate_params) {
            throw new Error('[AG011MemoryEngine] Se requieren candidate_params para BUILD_CANDIDATE.');
          }
          opResult = AG011MemoryCandidateResolver.buildCandidate(request.candidate_params);
          break;
        }

        case 'RETRIEVE_MEMORIES': {
          if (!request.query_params) {
            throw new Error('[AG011MemoryEngine] Se requieren query_params para RETRIEVE_MEMORIES.');
          }
          const store = request.memory_store || [];
          opResult = AG011MemoryRetriever.retrieve(request.query_params, store);
          break;
        }

        case 'PROCESS_REVIEW_DECISION': {
          if (!request.approval_params) {
            throw new Error('[AG011MemoryEngine] Se requieren approval_params para PROCESS_REVIEW_DECISION.');
          }
          const approval = AG011MemoryApprovalGuard.validateApprovalEvent(request.approval_params);
          const nextStatus: AG011MemoryStatus = request.approval_params.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
          opResult = {
            approval,
            status_transition: {
              from: 'REVIEW_REQUIRED',
              to: nextStatus
            }
          };
          break;
        }

        case 'CREATE_NEW_VERSION': {
          if (!request.memory_params) {
            throw new Error('[AG011MemoryEngine] Se requieren memory_params para CREATE_NEW_VERSION.');
          }
          opResult = AG011MemoryBuilder.build(request.memory_params);
          break;
        }

        case 'SUPERSEDE_MEMORY': {
          if (!request.supersede_params) {
            throw new Error('[AG011MemoryEngine] Se requieren supersede_params para SUPERSEDE_MEMORY.');
          }
          opResult = {
            superseded_memory_id: request.supersede_params.prior_memory_id,
            active_memory_id: request.supersede_params.new_memory_id,
            status: 'SUPERSEDED'
          };
          break;
        }

        case 'RETIRE_MEMORY': {
          if (!request.retire_params) {
            throw new Error('[AG011MemoryEngine] Se requieren retire_params para RETIRE_MEMORY.');
          }
          opResult = {
            retired_memory_id: request.retire_params.memory_id,
            reason: request.retire_params.reason,
            status: 'RETIRED'
          };
          break;
        }

        default:
          throw new Error(`[AG011MemoryEngine] Operación no catalogada: '${request.operation}'.`);
      }

      const durationMs = Date.now() - startTime;
      const audit = AG011MemoryAudit.createRecord({
        request_id: reqId,
        event_id: request.event_id,
        correlation_id: request.correlation_id,
        operation: request.operation,
        duration_ms: durationMs,
        status: 'SUCCESS'
      });

      return {
        success: true,
        agent_id: 'AG-011',
        operation: request.operation,
        result: opResult,
        audit_record: audit,
        ag011_memory_model_sha256: modelEvidence.ag011_memory_model_sha256
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const audit = AG011MemoryAudit.createRecord({
        request_id: reqId,
        event_id: request.event_id,
        correlation_id: request.correlation_id,
        operation: request.operation,
        duration_ms: durationMs,
        status: 'FAILED',
        error_message: err.message
      });

      return {
        success: false,
        agent_id: 'AG-011',
        operation: request.operation,
        error: err.message,
        audit_record: audit,
        ag011_memory_model_sha256: modelEvidence.ag011_memory_model_sha256
      };
    }
  }
}
