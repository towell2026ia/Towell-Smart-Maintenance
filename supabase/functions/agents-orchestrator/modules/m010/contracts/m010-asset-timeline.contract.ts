// supabase/functions/agents-orchestrator/modules/m010/contracts/m010-asset-timeline.contract.ts
// Asset Timeline Contract for M-010 (v1.0)
// Frozen under Token: M010-ASSET-TIMELINE-001
// Invariant: Chronological ordering by actual event occurrence date; no created_at pollution (§49-59 PRD)

import type { AssetTimelineEvent, TimelineEventType, TimeQuality, AssetSourceReference } from '../types/m010.types.ts';

export function createTimelineEvent(params: {
  event_id: string;
  asset_id: string;
  event_type: TimelineEventType;
  occurred_at: string;
  time_quality?: TimeQuality;
  title: string;
  summary: string;
  status?: string | null;
  source_reference: AssetSourceReference;
}): AssetTimelineEvent {
  return {
    event_id: params.event_id,
    asset_id: params.asset_id,
    event_type: params.event_type,
    occurred_at: params.occurred_at,
    time_quality: params.time_quality || 'EXACT',
    title: params.title,
    summary: params.summary,
    status: params.status || null,
    source_reference: params.source_reference
  };
}

export function sortTimelineEventsChronologically(events: AssetTimelineEvent[], order: 'ASC' | 'DESC' = 'DESC'): AssetTimelineEvent[] {
  return [...events].sort((a, b) => {
    const timeA = new Date(a.occurred_at).getTime();
    const timeB = new Date(b.occurred_at).getTime();
    return order === 'ASC' ? timeA - timeB : timeB - timeA;
  });
}
