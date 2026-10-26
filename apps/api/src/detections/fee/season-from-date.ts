import type { Season } from './constants';
import type { SeasonWindow } from './settings.types';

/**
 * Infer season from fee_date using rate-card season windows.
 * Falls back to US calendar heuristic (Oct 15 – Jan 14 = peak) when no window matches.
 */
export function seasonFromFeeDate(
  isoDate: string,
  windows?: SeasonWindow[],
): Season {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    throw new Error('feeDate must be YYYY-MM-DD');
  }

  if (windows?.length) {
    for (const w of windows) {
      if (isoDate >= w.startDate && isoDate <= w.endDate) {
        return w.season;
      }
    }
  }

  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month === 11 || month === 12) return 'peak';
  if (month === 10 && day >= 15) return 'peak';
  if (month === 1 && day <= 14) return 'peak';
  return 'non_peak';
}

/** Today as YYYY-MM-DD in local calendar (for defaults / docs). */
export function todayIsoDate(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
