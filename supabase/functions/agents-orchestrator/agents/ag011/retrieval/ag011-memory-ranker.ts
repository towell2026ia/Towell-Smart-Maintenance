// supabase/functions/agents-orchestrator/agents/ag011/retrieval/ag011-memory-ranker.ts
// Deterministic Memory Ranking Engine for AG-011 (v1.0)
// Frozen under Token: AG011-RANKING-ENGINE-001
// Invariant: 100% Deterministic Factor Scoring & Tie-Break (§124-133 PRD-AG-011.2)

import type { AG011TechnicalMemoryItem, AG011MemoryQueryResultItem } from '../types/ag011.types.ts';

export class AG011MemoryRanker {
  public static rankMemories(params: {
    memories: AG011TechnicalMemoryItem[];
    asset_id: string;
    machine_model?: string | null;
    component_id?: string | null;
    problem_text: string;
  }): AG011MemoryQueryResultItem[] {
    const scoredList: { memory: AG011TechnicalMemoryItem; score: number; factors: string[] }[] = [];

    const problemLower = (params.problem_text || '').toLowerCase();
    const problemWords = problemLower.split(/\s+/).filter(w => w.length > 3);

    for (const mem of params.memories) {
      let score = 0;
      const factors: string[] = [];

      // 1. SAME_ASSET (35 pts)
      if (mem.scope.asset_id && mem.scope.asset_id === params.asset_id) {
        score += 35;
        factors.push('SAME_ASSET (+35)');
      }

      // 2. SAME_MACHINE_MODEL (25 pts)
      if (mem.scope.machine_model && params.machine_model && mem.scope.machine_model === params.machine_model) {
        score += 25;
        factors.push('SAME_MACHINE_MODEL (+25)');
      }

      // 3. SAME_COMPONENT (20 pts)
      if (mem.scope.component_id && params.component_id && mem.scope.component_id === params.component_id) {
        score += 20;
        factors.push('SAME_COMPONENT (+20)');
      }

      // 4. KEYWORD_FAILURE_MATCH (15 pts)
      const descLower = (mem.technical_content.condition_description || '').toLowerCase();
      const matchCount = problemWords.filter(w => descLower.includes(w)).length;
      if (matchCount > 0) {
        const kwScore = Math.min(15, matchCount * 5);
        score += kwScore;
        factors.push(`KEYWORD_FAILURE_MATCH (+${kwScore})`);
      }

      // 5. APPROVED_STATUS (5 pts)
      if (mem.status === 'APPROVED') {
        score += 5;
        factors.push('APPROVED_STATUS (+5)');
      }

      scoredList.push({
        memory: mem,
        score: Math.min(100, score),
        factors
      });
    }

    // Deterministic Tie-Break: Score DESC, then effective_from DESC, then memory_id ASC
    scoredList.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const timeA = new Date(a.memory.effective_from).getTime();
      const timeB = new Date(b.memory.effective_from).getTime();
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return a.memory.memory_id.localeCompare(b.memory.memory_id);
    });

    return scoredList.map((item, idx) => ({
      memory: item.memory,
      relevance_score: item.score,
      relevance_factors: item.factors,
      rank: idx + 1
    }));
  }
}
