// supabase/functions/agents-orchestrator/agents/ag007/resolvers/budget-period-resolver.ts
// Official Budget Period & Canonical Date Resolver for AG-007 (PRD-AG007-R1.3.4)
// Server-Side Authority: Browser does not decide period window or clock.

export type BudgetScope = 'ANNUAL_MONTHLY' | 'CURRENT_PERIOD';

export interface PreventiveBudgetPeriod {
  period_key: string;               // e.g. 'PILOT_2026' or 'ANNUAL_2026'
  period_label: string;             // e.g. 'AGO–DIC 2026' or 'ENE–DIC 2026'
  start_date: string;               // '2026-01-01' or '2026-08-01'
  end_date: string;                 // '2026-12-31'
  year: number;                     // 2026
  current_month: string;            // e.g. '2026-08'
  current_month_index: number;      // 0-indexed position within months array (-1 if outside)
  months: string[];                 // ['2026-01', ..., '2026-12'] or ['2026-08', ..., '2026-12']
  month_labels: string[];           // ['Ene', ..., 'Dic'] or ['Ago', ..., 'Dic']
  is_pilot: boolean;
  total_months_in_period: number;
  budget_scope: BudgetScope;
  canonical_reference_date: string; // YYYY-MM-DD
  canonical_timezone: string;       // e.g. 'America/Mexico_City'
}

export const PILOT_BUDGET_START = '2026-08-01';
export const PILOT_BUDGET_END = '2026-12-31';
export const FULL_YEAR_BUDGET_MODE_START = '2027-01-01';
export const CANONICAL_PLANT_TIMEZONE = 'America/Mexico_City';

const MONTH_NAMES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Resolves the canonical reference date strictly enforcing Server-Side authority (FH-001 & FH-005).
 * - Production: uses server clock converted to canonical plant timezone (America/Mexico_City).
 * - Test mode (AGENT_TEST_MODE=true AND TSM_ENV != production): allows deterministic referenceDateInput.
 */
export function resolveCanonicalReferenceDate(referenceDateInput?: string | Date | null): {
  canonicalDateStr: string;
  canonicalDate: Date;
  timezone: string;
  isTestOverride: boolean;
} {
  const env = (typeof Deno !== 'undefined' ? Deno.env.get('TSM_ENV') : '') || 'development';
  const testMode = (typeof Deno !== 'undefined' ? Deno.env.get('AGENT_TEST_MODE') : '') === 'true';
  const configuredTz = (typeof Deno !== 'undefined' ? Deno.env.get('PLANT_TIMEZONE') : '') || CANONICAL_PLANT_TIMEZONE;

  const isTestAllowed = (env !== 'production') || testMode;

  if (isTestAllowed && referenceDateInput) {
    let d: Date;
    if (referenceDateInput instanceof Date) {
      d = referenceDateInput;
    } else {
      const s = String(referenceDateInput).trim();
      d = /^\d{4}-\d{2}-\d{2}/.test(s) ? new Date(s.substring(0, 10) + 'T00:00:00Z') : new Date(s);
    }
    if (!isNaN(d.getTime())) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return {
        canonicalDateStr: `${y}-${m}-${day}`,
        canonicalDate: d,
        timezone: configuredTz,
        isTestOverride: true
      };
    }
  }

  // Server clock authority converted to configured plant timezone (FH-005)
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: configuredTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const dateStr = formatter.format(now); // YYYY-MM-DD
    const d = new Date(dateStr + 'T00:00:00Z');
    return {
      canonicalDateStr: dateStr,
      canonicalDate: d,
      timezone: configuredTz,
      isTestOverride: false
    };
  } catch (_e) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return {
      canonicalDateStr: `${y}-${m}-${day}`,
      canonicalDate: now,
      timezone: configuredTz,
      isTestOverride: false
    };
  }
}

/**
 * Resolves the official maintenance budget period deterministically on backend (PRD-AG007-R1.3.4).
 * - FC-001: Default scope is strictly 'CURRENT_PERIOD' for backward compatibility.
 * - 'ANNUAL_MONTHLY': Explicitly resolves 12 months (JAN..DEC) for the target year.
 */
export function resolvePreventiveBudgetPeriod(
  referenceDateInput?: string | Date | null,
  budgetScopeInput?: BudgetScope | null,
  targetYearInput?: number | null
): PreventiveBudgetPeriod {
  const { canonicalDateStr, canonicalDate, timezone } = resolveCanonicalReferenceDate(referenceDateInput);

  const scope: BudgetScope = budgetScopeInput === 'ANNUAL_MONTHLY' ? 'ANNUAL_MONTHLY' : 'CURRENT_PERIOD';

  const refYear = canonicalDate.getUTCFullYear();
  const refMonth = canonicalDate.getUTCMonth() + 1; // 1-12
  const currentMonthStr = `${refYear}-${String(refMonth).padStart(2, '0')}`;

  const targetYear = targetYearInput || refYear;

  // 1. ANNUAL_MONTHLY MODE: Always 12 months (Jan 01 to Dec 31) (PRD §14-16, §52-54)
  if (scope === 'ANNUAL_MONTHLY') {
    const months: string[] = [];
    const monthLabels: string[] = [];
    for (let i = 1; i <= 12; i++) {
      months.push(`${targetYear}-${String(i).padStart(2, '0')}`);
      monthLabels.push(MONTH_NAMES_ES[i - 1]);
    }

    const isCurrentYear = targetYear === refYear;
    const currentMonthIdx = isCurrentYear ? months.indexOf(currentMonthStr) : -1;

    return {
      period_key: `ANNUAL_${targetYear}`,
      period_label: `ENE–DIC ${targetYear}`,
      start_date: `${targetYear}-01-01`,
      end_date: `${targetYear}-12-31`,
      year: targetYear,
      current_month: currentMonthStr,
      current_month_index: currentMonthIdx,
      months,
      month_labels: monthLabels,
      is_pilot: false,
      total_months_in_period: 12,
      budget_scope: 'ANNUAL_MONTHLY',
      canonical_reference_date: canonicalDateStr,
      canonical_timezone: timezone
    };
  }

  // 2. LEGACY CURRENT_PERIOD MODE (FC-001)
  // Pilot 2026: Aug 01 to Dec 31 (5 months)
  if (targetYear === 2026) {
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
      total_months_in_period: 5,
      budget_scope: 'CURRENT_PERIOD',
      canonical_reference_date: canonicalDateStr,
      canonical_timezone: timezone
    };
  }

  // 2027+ full year in CURRENT_PERIOD
  const months: string[] = [];
  const monthLabels: string[] = [];
  for (let i = 1; i <= 12; i++) {
    months.push(`${targetYear}-${String(i).padStart(2, '0')}`);
    monthLabels.push(MONTH_NAMES_ES[i - 1]);
  }
  const idx = targetYear === refYear ? months.indexOf(currentMonthStr) : -1;

  return {
    period_key: `ANNUAL_${targetYear}`,
    period_label: `ENE–DIC ${targetYear}`,
    start_date: `${targetYear}-01-01`,
    end_date: `${targetYear}-12-31`,
    year: targetYear,
    current_month: currentMonthStr,
    current_month_index: idx >= 0 ? idx : 0,
    months,
    month_labels: monthLabels,
    is_pilot: false,
    total_months_in_period: 12,
    budget_scope: 'CURRENT_PERIOD',
    canonical_reference_date: canonicalDateStr,
    canonical_timezone: timezone
  };
}
