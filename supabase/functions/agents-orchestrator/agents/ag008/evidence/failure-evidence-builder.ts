// supabase/functions/agents-orchestrator/agents/ag008/evidence/failure-evidence-builder.ts
// Failure Evidence Builder for AG-008 (v1.0)
// Frozen under Token: AG008-FAILURE-LINEAGE-001
// Invariant: 100% Traceability of failure signals to raw events and source references.

import type { FailureEvent } from '../types/ag008.types.ts';

export interface SignalEvidencePayload {
  evidence_event_ids: string[];
  source_references: string[];
  total_evidence_events: number;
}

export function buildSignalEvidence(events: FailureEvent[]): SignalEvidencePayload {
  const eventIds = events.map(e => e.failure_event_id);
  const sourceRefs = new Set<string>();

  for (const ev of events) {
    if (ev.source_reference) {
      sourceRefs.add(ev.source_reference);
    }
  }

  return {
    evidence_event_ids: eventIds,
    source_references: Array.from(sourceRefs),
    total_evidence_events: events.length
  };
}
