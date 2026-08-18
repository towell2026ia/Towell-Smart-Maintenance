// supabase/functions/agents-orchestrator/agents/ag004/resolvers/iso-week-resolver.ts
// Strict ISO 8601 Week Resolver for AG-004

import { IsoWeekInfo } from '../types/ag004.types.ts';

export function resolveIsoWeekFromDate(dateInput: Date | string): IsoWeekInfo {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput.getTime());
  
  // ISO-8601 date handling: Thursday determines the year
  // Set to nearest Thursday: current date + 4 - current day number (with Monday=1, Sunday=7)
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

  const operatingDays: string[] = [];
  for (let i = 0; i < 6; i++) { // Monday (0) to Saturday (5)
    const day = new Date(simpleMonday.getTime());
    day.setUTCDate(day.getUTCDate() + i);
    operatingDays.push(day.toISOString().split('T')[0]);
  }

  return {
    iso_year: isoYear,
    iso_week: weekNumber,
    week_key: weekKey,
    start_date: operatingDays[0],
    end_date: operatingDays[5],
    operating_days: operatingDays
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
