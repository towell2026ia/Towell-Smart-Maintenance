export const AG002_ENGINE_VERSION = 'AG002-ENGINE-2.0-R2';

export const AG002_RULE_VERSIONS = {
  dedupe: 'AG002-DEDUPE-RULES-002',
  recurrence: 'AG002-RECURRENCE-RULES-002',
  priority: 'AG002-PRIORITY-RULES-002',
  capacity: 'AG002-CAPACITY-RULES-002',
  scheduling: 'AG002-SCHEDULING-RULES-002',
  parts: 'AG002-PARTS-RULES-002',
  budget: 'AG002-BUDGET-RULES-002'
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

// Official Operational Calendar Configuration for AG-002 (PX-002 & EC-003)
export const OPERATIONAL_CALENDAR_CONFIG = {
  source: 'PLANT_MAINTENANCE_SCHEDULE_RULES',
  operating_days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const,
  operating_day_indices: [1, 2, 3, 4, 5] as const // 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri
};

// Capacity Constraint Configuration (PX-005)
export const CAPACITY_CONFIG = {
  capacity_constraint_source: 'NONE' as const, // If no physical ceiling is configured in DB
  max_preventives_per_day: null as number | null,
  max_preventives_per_week: null as number | null
};

export const FREQUENCY_RULES = {
  max_preventives_per_machine_per_year: 1 // Universal across PF, CF, TF, AF
};
