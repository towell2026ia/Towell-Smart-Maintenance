// supabase/functions/agents-orchestrator/modules/m012/resolvers/m012-technical-memory-resolver.ts
// Technical Memory Resolver for M-012 (v1.0)
// Frozen under Token: M012-MEMORY-CONSUMER-001
// Invariant: Consume AG-011 verified memories, M012_memory_reranking = 0, candidate_memory_as_approved = 0 (§24-30 PRD-M-012.2)

import type { TechnicalMemoryReference } from '../types/m012.types.ts';
import { M012TemporalGuard } from '../guards/m012-temporal-guard.ts';

export class M012TechnicalMemoryResolver {
  public static resolve(ag011Memories?: any[], evaluationAt?: string): TechnicalMemoryReference[] {
    if (!ag011Memories || !Array.isArray(ag011Memories) || ag011Memories.length === 0) {
      return [];
    }

    const cutoff = evaluationAt || new Date().toISOString();
    const result: TechnicalMemoryReference[] = [];

    for (const mem of ag011Memories) {
      // 1. Invariant: Only APPROVED, non-retired, non-superseded memories
      if (mem.status !== 'APPROVED') {
        continue; // Candidate or draft memories are rejected
      }
      if (mem.is_superseded || mem.is_retired) {
        continue;
      }

      // 2. Invariant: Temporal cutoff
      if (!M012TemporalGuard.isRecordEligible(mem.created_at || mem.approved_at, cutoff)) {
        continue;
      }

      result.push({
        memory_id: mem.memory_id || mem.id,
        version: mem.version || '1.0',
        title: mem.title || mem.titulo || 'Memoria Técnica Validada',
        status: 'APPROVED',
        applicability: mem.applicability || 'DIRECTLY_APPLICABLE',
        key_procedure_steps: Array.isArray(mem.key_procedure_steps) ? mem.key_procedure_steps : [],
        critical_precautions: Array.isArray(mem.critical_precautions) ? mem.critical_precautions : [],
        limitations: Array.isArray(mem.limitations) ? mem.limitations : [],
        relevance_score: typeof mem.relevance_score === 'number' ? mem.relevance_score : 1.0
      });

      // Cap at Top-5
      if (result.length >= 5) {
        break;
      }
    }

    return result;
  }
}
