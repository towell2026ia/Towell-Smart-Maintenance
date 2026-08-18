// supabase/functions/agents-orchestrator/agents/ag003/rules/priority.rules.ts
// Rule Definition for Priority Scoring Weights (§50-59 PRD)

export const PRIORITY_RULES_VERSION = 'AG003-PRIORITY-RULES-001';

export const PRIORITY_CONFIG = {
  version: PRIORITY_RULES_VERSION,
  WEIGHTS: {
    QUALITY_DEVIATION: 40,      // Max 40 pts (Dominant primary signal)
    QUALITY_PERSISTENCE: 20,    // Max 20 pts (Volume and rate of defect)
    DATA_CONFIDENCE: 10,        // Max 10 pts (Statistical sample sufficiency)
    FAILURE_CONTEXT: 15,        // Max 15 pts (Recent breakdowns / paros)
    DOWNTIME_CONTEXT: 5,        // Max 5 pts (Hours stopped)
    CRITICALITY: 5,             // Max 5 pts (Plant asset criticality)
    INSPECTION_RECENCY: 5       // Max 5 pts (Days since last predictive survey)
  },
  CRITICALITY_POINTS: {
    'Muy Alta': 5,
    'Alta': 3.5,
    'Media': 2,
    'Baja': 0.5
  },
  RECENCY_DAYS_PENALTY_THRESHOLD: 30 // surveyed < 30d gets lower recency points
};
