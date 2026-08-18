// supabase/functions/agents-orchestrator/agents/ag003/engine/predictive-priority-engine.ts
// Predictive Priority Engine (§50-59 PRD)

import { PriorityScoreBreakdown, DeviationCalculationResult } from '../types/ag003.types.ts';
import { DataQualityEvaluation } from '../guards/data-quality-guard.ts';
import { HistoricalContextResult } from '../collectors/historical-context-collector.ts';
import { PRIORITY_CONFIG } from '../rules/priority.rules.ts';

export function calculatePredictivePriorityScore(
  deviation: DeviationCalculationResult,
  totalSegundas: number,
  dataQuality: DataQualityEvaluation,
  historicalContext: HistoricalContextResult,
  criticality: 'Muy Alta' | 'Alta' | 'Media' | 'Baja' | string = 'Media',
  lastPredictiveDaysAgo: number | null = null
): PriorityScoreBreakdown {
  // 1. Quality Deviation Score (Max 40 pts - Primary Dominant Signal)
  let qualityDevScore = 0;
  if (deviation.is_relative_applicable) {
    if (deviation.relative_deviation >= 0.50) {
      qualityDevScore = 40;
    } else if (deviation.relative_deviation >= 0.25) {
      qualityDevScore = 30;
    } else if (deviation.relative_deviation >= 0.10) {
      qualityDevScore = 20;
    } else if (deviation.relative_deviation > 0) {
      qualityDevScore = 10;
    } else {
      qualityDevScore = 0;
    }
  } else {
    if (deviation.current_metric >= 20) qualityDevScore = 40;
    else if (deviation.current_metric >= 10) qualityDevScore = 30;
    else if (deviation.current_metric >= 5) qualityDevScore = 20;
    else if (deviation.current_metric > 0) qualityDevScore = 10;
    else qualityDevScore = 0;
  }

  // 2. Quality Persistence Score (Max 20 pts)
  let qualityPersistScore = 0;
  if (totalSegundas >= 50) qualityPersistScore = 20;
  else if (totalSegundas >= 25) qualityPersistScore = 15;
  else if (totalSegundas >= 10) qualityPersistScore = 10;
  else if (totalSegundas > 0) qualityPersistScore = 5;
  else qualityPersistScore = 0;

  // 3. Data Confidence Score (Max 10 pts)
  let dataConfScore = 0;
  if (dataQuality.status === 'SUFFICIENT_DATA') dataConfScore = 10;
  else if (dataQuality.status === 'PARTIAL_DATA') dataConfScore = 5;
  else dataConfScore = 0;

  // 4. Failure Context Score (Max 15 pts)
  let failureScore = 0;
  const fCount = historicalContext.deduplicatedFailuresCount;
  if (fCount >= 4) failureScore = 15;
  else if (fCount >= 2) failureScore = 10;
  else if (fCount >= 1) failureScore = 5;
  else failureScore = 0;

  // 5. Downtime Context Score (Max 5 pts)
  let downtimeScore = 0;
  const dtHours = historicalContext.downtimeHours;
  if (dtHours >= 10) downtimeScore = 5;
  else if (dtHours >= 4) downtimeScore = 3;
  else if (dtHours > 0) downtimeScore = 1;
  else downtimeScore = 0;

  // 6. Criticality Score (Max 5 pts)
  const critKey = criticality as 'Muy Alta' | 'Alta' | 'Media' | 'Baja';
  const critScore = PRIORITY_CONFIG.CRITICALITY_POINTS[critKey] || 2;

  // 7. Inspection Recency Score (Max 5 pts)
  let recencyScore = 5;
  if (lastPredictiveDaysAgo !== null && lastPredictiveDaysAgo !== undefined) {
    if (lastPredictiveDaysAgo <= 30) recencyScore = 0;
    else if (lastPredictiveDaysAgo <= 60) recencyScore = 2;
    else if (lastPredictiveDaysAgo <= 90) recencyScore = 4;
    else recencyScore = 5;
  }

  const total = Number(
    (qualityDevScore + qualityPersistScore + dataConfScore + failureScore + downtimeScore + critScore + recencyScore).toFixed(1)
  );

  return {
    quality_deviation_score: qualityDevScore,
    quality_persistence_score: qualityPersistScore,
    data_confidence_score: dataConfScore,
    failure_context_score: failureScore,
    downtime_context_score: downtimeScore,
    criticality_score: critScore,
    inspection_recency_score: recencyScore,
    total_score: Math.min(100, Math.max(0, total))
  };
}
