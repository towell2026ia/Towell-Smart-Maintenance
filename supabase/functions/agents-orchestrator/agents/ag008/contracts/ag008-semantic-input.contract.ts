// supabase/functions/agents-orchestrator/agents/ag008/contracts/ag008-semantic-input.contract.ts
// Semantic Input Contract for AG-008 (v1.0)
// Frozen under Token: AG008-SEMANTIC-INPUT-001

import type {
  FailureScope,
  TimeGranularity,
  FailureSignal,
  FailureRecurrenceGroup
} from '../types/ag008.types.ts';
import type { ReincidenceEventPair } from '../analytics/failure-reincidence-engine.ts';
import type { TrendAnalysisResult } from '../analytics/failure-trend-engine.ts';
import type { ConcentrationSummary } from '../analytics/failure-concentration-engine.ts';
import type { CrossMachinePattern } from '../analytics/cross-machine-pattern-engine.ts';
import type { SeasonalityAnalysisResult } from '../analytics/failure-seasonality-engine.ts';
import type { DataQualityReport } from '../quality/failure-data-quality-engine.ts';
import type { FrequencySummary } from '../analytics/failure-frequency-engine.ts';

export interface SemanticFailureInputPayload {
  snapshot_id: string;
  scope: FailureScope;
  target_id: string;
  period_granularity: TimeGranularity;
  metrics: {
    total_events: number;
    frequency: FrequencySummary;
    recurrence_groups: FailureRecurrenceGroup[];
    reincidences: ReincidenceEventPair[];
    trend: TrendAnalysisResult;
    concentration: ConcentrationSummary;
    cross_machine_patterns: CrossMachinePattern[];
    seasonality: SeasonalityAnalysisResult;
  };
  deterministic_alerts: FailureSignal[];
  data_quality: DataQualityReport;
  source_references: string[];
  user_intent?: string | null;
}
