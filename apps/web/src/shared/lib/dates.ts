export function todayLocalIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Mirror of server rule for live UI hint (Oct 15 – Jan 14 = peak). */
export function seasonHint(isoDate: string): 'peak' | 'non_peak' {
  const parts = isoDate.split('-').map(Number);
  const month = parts[1] ?? 0;
  const day = parts[2] ?? 0;
  if (month === 11 || month === 12) return 'peak';
  if (month === 10 && day >= 15) return 'peak';
  if (month === 1 && day <= 14) return 'peak';
  return 'non_peak';
}
