// supabase/functions/agents-orchestrator/agents/ag011/core/ag011-memory-builder.ts
// Canonical Technical Memory Builder for AG-011 (v1.0)
// Frozen under Token: AG011-TECHNICAL-MEMORY-MODEL-001
// Invariant: Structured Construction of Technical Memory Items (§47-50 PRD-AG-011.2)

import { AG011MemoryValidator } from '../validators/ag011-memory-validator.ts';
import { AG011MemoryQualityEngine } from '../quality/ag011-memory-quality-engine.ts';
import type {
  AG011TechnicalMemoryItem,
  AG011MemoryType,
  AG011MemoryStatus,
  AG011MemoryScope,
  AG011TechnicalContent,
  AG011MemoryEvidence,
  AG011MemoryApproval
} from '../types/ag011.types.ts';

export interface MemoryBuildParams {
  memory_id?: string;
  title: string;
  memory_type: AG011MemoryType;
  status: AG011MemoryStatus;
  version?: string;
  scope: AG011MemoryScope;
  technical_content: AG011TechnicalContent;
  evidence: AG011MemoryEvidence[];
  contradicting_evidence?: AG011MemoryEvidence[];
  limitations?: string[];
  origin_case_ids: string[];
  origin_analysis_ids?: string[];
  created_at?: string;
  effective_from?: string;
  effective_to?: string | null;
  supersedes_memory_id?: string | null;
  approval?: AG011MemoryApproval | null;
}

export class AG011MemoryBuilder {
  public static build(params: MemoryBuildParams): AG011TechnicalMemoryItem {
    const memoryId = params.memory_id || `MEM-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const createdAt = params.created_at || new Date().toISOString();
    const effectiveFrom = params.effective_from || createdAt;

    const quality = AG011MemoryQualityEngine.calculateQuality(
      params.evidence,
      params.contradicting_evidence || [],
      Boolean(params.technical_content.confirmed_root_cause)
    );

    const memory: AG011TechnicalMemoryItem = {
      memory_id: memoryId,
      title: params.title,
      memory_type: params.memory_type,
      status: params.status,
      quality,
      version: params.version || '1.0',
      scope: params.scope,
      technical_content: params.technical_content,
      evidence: params.evidence,
      limitations: params.limitations || [],
      origin_case_ids: params.origin_case_ids,
      origin_analysis_ids: params.origin_analysis_ids || [],
      created_at: createdAt,
      effective_from: effectiveFrom,
      effective_to: params.effective_to || null,
      supersedes_memory_id: params.supersedes_memory_id || null,
      superseded_by_memory_id: null,
      approval: params.approval || null
    };

    AG011MemoryValidator.validate(memory);
    return memory;
  }
}
