// supabase/functions/agents-orchestrator/agents/ag007/resolvers/cost-period-resolver.ts
// Cost Period Resolver for AG-007 (v1.0)
// Frozen under Token: AG007-DETERMINISTIC-ENGINE-001
// Invariant: Exact ISO Year (YYYY), Month (YYYY-MM), Week (YYYY-Www) (§41-47 PRD)

import type { CostPeriod } from '../types/ag007.types.ts';

export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function resolveCostPeriod(dateInput: string | Date | null | undefined): { dateStr: string; period: CostPeriod; isValid: boolean } {
  if (!dateInput) {
    const fallback = new Date();
    const y = fallback.getFullYear();
    const m = String(fallback.getMonth() + 1).padStart(2, '0');
    const w = String(getISOWeek(fallback)).padStart(2, '0');
    return {
      dateStr: `${y}-${m}-01`,
      period: { year: y, month: `${y}-${m}`, week: `${y}-W${w}` },
      isValid: false
    };
  }

  let d: Date;
  if (dateInput instanceof Date) {
    d = dateInput;
  } else {
    const str = String(dateInput).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      d = new Date(str.substring(0, 10) + 'T00:00:00Z');
    } else {
      const parts = str.split(/[-/]/);
      if (parts.length === 3) {
        let p1 = parseInt(parts[0], 10);
        let p2 = parseInt(parts[1], 10);
        let y = parseInt(parts[2], 10);
        if (parts[0].length === 4) { // YYYY/MM/DD
          y = parseInt(parts[0], 10);
          p1 = parseInt(parts[1], 10);
          p2 = parseInt(parts[2], 10);
        }
        if (y < 100) y += 2000;
        let month = p1;
        let day = p2;
        if (p1 > 12 && p2 <= 12) {
          day = p1;
          month = p2;
        }
        d = new Date(Date.UTC(y, month - 1, day));
      } else {
        d = new Date();
      }
    }
  }

  if (isNaN(d.getTime())) {
    d = new Date();
  }

  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const w = String(getISOWeek(d)).padStart(2, '0');

  const dateStr = `${y}-${m}-${day}`;
  const period: CostPeriod = {
    year: y,
    month: `${y}-${m}`,
    week: `${y}-W${w}`
  };

  return { dateStr, period, isValid: true };
}
