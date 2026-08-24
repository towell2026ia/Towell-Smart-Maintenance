// supabase/functions/agents-orchestrator/agents/ag007/resolvers/budget-period-resolver.ts
// Backend Budget Period Resolver for AG-007 (PRD-AG007-R1 §35-38, §104-120)
// Server-Side Authority: Browser does not decide period window.

export interface PreventiveBudgetPeriod {
  period_key: string;               // e.g. 'PILOT_2026' or 'ANNUAL_2027'
  period_label: string;             // e.g. 'AGO–DIC 2026' or 'ENE–DIC 2027'
  start_date: string;               // '2026-08-01'
  end_date: string;                 // '2026-12-31'
  year: number;                     // 2026
  current_month: string;            // e.g. '2026-08'
  current_month_index: number;      // 0-indexed position within months array
  months: string[];                 // ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12']
  month_labels: string[];           // ['Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  is_pilot: boolean;
  total_months_in_period: number;
}

export const PILOT_BUDGET_START = '2026-08-01';
export const PILOT_BUDGET_END = '2026-12-31';
export const FULL_YEAR_BUDGET_MODE_START = '2027-01-01';

const MONTH_NAMES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Resolves the official maintenance budget period deterministically on backend.
 * Zero LLM calls (budget_period_resolution_LLM_calls = 0).
 */
export function resolvePreventiveBudgetPeriod(referenceDateInput?: string | Date | null): PreventiveBudgetPeriod {
  let refDate: Date;
  if (!referenceDateInput) {
    refDate = new Date();
  } else if (referenceDateInput instanceof Date) {
    refDate = referenceDateInput;
  } else {
    const s = String(referenceDateInput).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      refDate = new Date(s.substring(0, 10) + 'T00:00:00Z');
    } else {
      refDate = new Date(s);
    }
  }

  if (isNaN(refDate.getTime())) {
    refDate = new Date();
  }

  const y = refDate.getUTCFullYear();
  const m = refDate.getUTCMonth() + 1; // 1-12
  const currentMonthStr = `${y}-${String(m).padStart(2, '0')}`;

  // PILOT 2026 RULE (§27-31, §118-119 PRD)
  // Pilot period is frozen as August 1, 2026 to December 31, 2026 (5 months).
  // Current month is dynamic within runtime, but period window remains AUG-DEC 2026.
  if (y === 2026) {
    const months = ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];
    const monthLabels = ['Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const idx = months.indexOf(currentMonthStr);

    return {
      period_key: 'PILOT_2026',
      period_label: 'AGO–DIC 2026',
      start_date: PILOT_BUDGET_START,
      end_date: PILOT_BUDGET_END,
      year: 2026,
      current_month: currentMonthStr,
      current_month_index: idx >= 0 ? idx : 0,
      months,
      month_labels: monthLabels,
      is_pilot: true,
      total_months_in_period: 5
    };
  }

  // 2027+ FULL YEAR MODE (§32-34, §117 PRD)
  // From 2027 onwards: January 1 to December 31 (12 months).
  const months: string[] = [];
  const monthLabels: string[] = [];
  for (let i = 1; i <= 12; i++) {
    months.push(`${y}-${String(i).padStart(2, '0')}`);
    monthLabels.push(MONTH_NAMES_ES[i - 1]);
  }
  const idx = months.indexOf(currentMonthStr);

  return {
    period_key: `ANNUAL_${y}`,
    period_label: `ENE–DIC ${y}`,
    start_date: `${y}-01-01`,
    end_date: `${y}-12-31`,
    year: y,
    current_month: currentMonthStr,
    current_month_index: idx >= 0 ? idx : 0,
    months,
    month_labels: monthLabels,
    is_pilot: false,
    total_months_in_period: 12
  };
}
