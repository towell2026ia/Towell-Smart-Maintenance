// supabase/functions/agents-orchestrator/agents/ag008/resolvers/failure-period-resolver.ts
// Period Resolver for ISO Day, Week, Month and Year for AG-008 (v1.0)
// Frozen under Token: AG008-SERIES-RULES-001

import type { TimeGranularity } from '../types/ag008.types.ts';

export interface ResolvedPeriod {
  day: string; // YYYY-MM-DD
  isoWeek: string; // YYYY-Www
  month: string; // YYYY-MM
  year: string; // YYYY
}

export function getISOWeekString(dateInput: Date | string): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'UNKNOWN_WEEK';

  // ISO week calculation (Thursday determines the year)
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = d.getFullYear();
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

export function resolvePeriodFromDate(dateStr: string): ResolvedPeriod {
  const cleanDate = dateStr.substring(0, 10);
  const parts = cleanDate.split('-');
  const year = parts[0] || 'UNKNOWN_YEAR';
  const month = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : 'UNKNOWN_MONTH';
  const isoWeek = getISOWeekString(cleanDate);

  return {
    day: cleanDate,
    isoWeek,
    month,
    year
  };
}

export function getPeriodKey(dateStr: string, granularity: TimeGranularity): string {
  const res = resolvePeriodFromDate(dateStr);
  switch (granularity) {
    case 'DAILY':
      return res.day;
    case 'WEEKLY':
      return res.isoWeek;
    case 'MONTHLY':
      return res.month;
    case 'ANNUAL':
      return res.year;
  }
}
