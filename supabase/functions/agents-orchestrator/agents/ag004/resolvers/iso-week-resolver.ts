// supabase/functions/agents-orchestrator/agents/ag004/resolvers/iso-week-resolver.ts
// Strict ISO 8601 & Next-Week Resolver for AG-004 (PRD-AG004-R1)

import { IsoWeekInfo } from '../types/ag004.types.ts';

/**
 * Resolves the next future operating week (Monday to Friday, 5 days).
 * Zero LLM calls (budget_period_resolution_LLM_calls = 0).
 */
export function resolveNextAutonomousWeek(referenceDateInput?: Date | string | null): IsoWeekInfo {
  let refDate: Date;
  if (!referenceDateInput) {
    refDate = new Date();
  } else if (referenceDateInput instanceof Date) {
    refDate = new Date(referenceDateInput.getTime());
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

  const refDateStr = refDate.toISOString().split('T')[0];

  // Calculate day of week (1 = Monday, ..., 7 = Sunday)
  const currentDow = (refDate.getUTCDay() + 6) % 7 + 1;

  // Next Monday is always strictly in the next week:
  // Mon (1) -> in 7 days
  // Tue (2) -> in 6 days
  // Wed (3) -> in 5 days
  // Thu (4) -> in 4 days
  // Fri (5) -> in 3 days
  // Sat (6) -> in 2 days
  // Sun (7) -> in 1 day
  const daysUntilNextMonday = 8 - currentDow;

  const nextMonday = new Date(refDate.getTime());
  nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilNextMonday);

  // ISO Year and ISO Week for Next Monday
  const dIso = new Date(nextMonday.getTime());
  const dowNextMonday = (dIso.getUTCDay() + 6) % 7 + 1; // 1
  dIso.setUTCDate(dIso.getUTCDate() - dowNextMonday + 4); // Nearest Thursday
  const isoYear = dIso.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNumber = Math.ceil((((dIso.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const weekKey = `${isoYear}-W${String(weekNumber).padStart(2, '0')}`;

  // Operating Days: Monday to Friday (5 days, Saturday & Sunday = 0)
  const operatingDays: string[] = [];
  for (let i = 0; i < 5; i++) {
    const day = new Date(nextMonday.getTime());
    day.setUTCDate(day.getUTCDate() + i);
    operatingDays.push(day.toISOString().split('T')[0]);
  }

  return {
    iso_year: isoYear,
    iso_week: weekNumber,
    week_key: weekKey,
    start_date: operatingDays[0],
    end_date: operatingDays[4],
    operating_days: operatingDays,
    reference_date: refDateStr,
    total_operating_days: 5
  };
}

export function resolveIsoWeekFromDate(dateInput: Date | string): IsoWeekInfo {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput.getTime());
  
  // ISO-8601 date handling: Thursday determines the year
  const dayOfWeek = (d.getUTCDay() + 6) % 7 + 1; // 1 = Monday, 7 = Sunday
  d.setUTCDate(d.getUTCDate() - dayOfWeek + 4);

  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  const weekKey = `${isoYear}-W${String(weekNumber).padStart(2, '0')}`;

  // Calculate Monday of this ISO week
  const simpleMonday = new Date(Date.UTC(isoYear, 0, 1 + (weekNumber - 1) * 7));
  const simpleDayOfWeek = (simpleMonday.getUTCDay() + 6) % 7 + 1;
  simpleMonday.setUTCDate(simpleMonday.getUTCDate() - simpleDayOfWeek + 1);

  // 5 operating days: Monday (0) to Friday (4) (PRD-AG004-R1 Mon-Fri rule)
  const operatingDays: string[] = [];
  for (let i = 0; i < 5; i++) {
    const day = new Date(simpleMonday.getTime());
    day.setUTCDate(day.getUTCDate() + i);
    operatingDays.push(day.toISOString().split('T')[0]);
  }

  return {
    iso_year: isoYear,
    iso_week: weekNumber,
    week_key: weekKey,
    start_date: operatingDays[0],
    end_date: operatingDays[4],
    operating_days: operatingDays,
    total_operating_days: 5
  };
}

export function resolveIsoWeekFromKey(weekKey: string): IsoWeekInfo {
  const match = weekKey.match(/^(\d{4})-W(\d{1,2})$/i);
  if (!match) {
    throw new Error(`INVALID_WEEK_KEY: Expected YYYY-Www, got '${weekKey}'`);
  }
  const isoYear = parseInt(match[1], 10);
  const isoWeek = parseInt(match[2], 10);

  if (isoWeek < 1 || isoWeek > 53) {
    throw new Error(`INVALID_ISO_WEEK_NUMBER: Week must be between 1 and 53, got ${isoWeek}`);
  }

  // Calculate Monday of target ISO week
  // 4th of January is always in week 1
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const dayOfWeekJan4 = (jan4.getUTCDay() + 6) % 7 + 1;
  const week1Monday = new Date(Date.UTC(isoYear, 0, 4 - dayOfWeekJan4 + 1));

  const targetMonday = new Date(week1Monday.getTime());
  targetMonday.setUTCDate(targetMonday.getUTCDate() + (isoWeek - 1) * 7);

  const operatingDays: string[] = [];
  for (let i = 0; i < 6; i++) {
    const day = new Date(targetMonday.getTime());
    day.setUTCDate(day.getUTCDate() + i);
    operatingDays.push(day.toISOString().split('T')[0]);
  }

  const canonWeekKey = `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;

  return {
    iso_year: isoYear,
    iso_week: isoWeek,
    week_key: canonWeekKey,
    start_date: operatingDays[0],
    end_date: operatingDays[5],
    operating_days: operatingDays
  };
}
