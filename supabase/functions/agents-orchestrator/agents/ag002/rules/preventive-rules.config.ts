// supabase/functions/agents-orchestrator/agents/ag002/rules/preventive-rules.config.ts
// Versioned Configuration and Constants for AG-002 (§32, §62, §88, §89 PRD)
// Universal Invariant: 1 Machine + 1 Year = Maximum 1 Preventive across ALL departments (PF, CF, TF, AF)

export const AG002_ENGINE_VERSION = 'AG002-ENGINE-1.0';

export const AG002_RULE_VERSIONS = {
  dedupe: 'AG002-DEDUPE-RULES-001',
  recurrence: 'AG002-RECURRENCE-RULES-001',
  priority: 'AG002-PRIORITY-RULES-001',
  capacity: 'AG002-CAPACITY-RULES-001',
  scheduling: 'AG002-SCHEDULING-RULES-001',
  parts: 'AG002-PARTS-RULES-001',
  budget: 'AG002-BUDGET-RULES-001'
};

export const PRIORITY_WEIGHTS = {
  criticality: {
    'Muy Alta': 35,
    'Alta': 25,
    'Media': 15,
    'Baja': 5,
    'A': 35,
    'B': 20,
    'C': 10
  } as Record<string, number>,
  recurrence: {
    points_per_failure: 2.5,
    max_points: 25
  },
  downtime: {
    points_per_100_minutes: 2.0,
    max_points: 20
  },
  corrective_frequency: {
    points_per_ot: 2.0,
    max_points: 10
  },
  preventive_age: {
    points_per_month_overdue: 1.0,
    max_points: 10
  }
};

export const PRIORITY_BANDS = {
  VERY_HIGH: 80,
  HIGH: 60,
  MEDIUM: 40,
  NORMAL: 0
};

export const CAPACITY_CONFIG = {
  max_preventives_per_week: 4,
  max_preventives_per_month: 16,
  annual_work_weeks: 50,
  start_week: 2,
  end_week: 51
};

export const FREQUENCY_RULES = {
  max_preventives_per_machine_per_year: 1 // Universal across PF, CF, TF, AF
};
