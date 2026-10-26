/** Shared helpers for Amazon tab/comma flat-file reports. */

export function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/_/g, '-');
}

export function splitLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t');
  return line.split(',');
}

export function parseNumber(raw: string | undefined): number | null {
  if (raw == null) return null;
  let s = raw.trim();
  if (!s || s === '--' || s.toLowerCase() === 'n/a') return null;
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function col(
  cells: string[],
  index: Map<string, number>,
  ...names: string[]
): string | undefined {
  for (const name of names) {
    const i = index.get(normalizeHeader(name));
    if (i != null && cells[i] != null) return cells[i];
  }
  return undefined;
}

export function headerIndex(text: string): {
  lines: string[];
  index: Map<string, number>;
} | null {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  if (lines.length < 1) return null;
  const headers = splitLine(lines[0]!).map(normalizeHeader);
  const index = new Map(headers.map((h, i) => [h, i]));
  return { lines, index };
}

export function hasCols(
  index: Map<string, number>,
  ...names: string[]
): boolean {
  return names.every((n) => index.has(normalizeHeader(n)));
}
