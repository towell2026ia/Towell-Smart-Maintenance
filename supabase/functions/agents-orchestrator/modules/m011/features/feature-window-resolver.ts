// supabase/functions/agents-orchestrator/modules/m011/features/feature-window-resolver.ts
// Feature Time Window Resolver for M-011 (v1.0)
// Frozen under Token: M011-WINDOW-RESOLVER-RULES-001
// Invariant: Pure deterministic temporal bounding; zero future data leakage (§27-31 PRD-M-011.2)

import type { FeatureTimeWindow } from '../types/m011.types.ts';

export interface ResolvedTimeWindow {
  window_type: FeatureTimeWindow;
  start_date: string;
  end_date: string;
  rule_version: string;
}

export function resolveFeatureTimeWindow(
  windowType: FeatureTimeWindow,
  evaluationAt: string
): ResolvedTimeWindow {
  const evalDate = new Date(evaluationAt);
  const endIso = evalDate.toISOString();

  let startIso: string;

  switch (windowType) {
    case '30_DAYS': {
      const d = new Date(evalDate);
      d.setUTCDate(d.getUTCDate() - 30);
      startIso = d.toISOString();
      break;
    }
    case '90_DAYS': {
      const d = new Date(evalDate);
      d.setUTCDate(d.getUTCDate() - 90);
      startIso = d.toISOString();
      break;
    }
    case 'CURRENT_YEAR': {
      const year = evalDate.getUTCFullYear();
      startIso = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)).toISOString();
      break;
    }
    case 'LIFETIME':
    default: {
      startIso = '1970-01-01T00:00:00.000Z';
      break;
    }
  }

  return {
    window_type: windowType,
    start_date: startIso,
    end_date: endIso,
    rule_version: 'M011-WINDOW-1.0'
  };
}
