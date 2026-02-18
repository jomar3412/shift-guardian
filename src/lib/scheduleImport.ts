export interface ParsedShiftRow {
  name: string;
  start?: string;
  end?: string;
  lunch?: string;
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function normalizeTimePart(part: string): string {
  return part.toLowerCase().replace(/\./g, "").replace(/\s+/g, "");
}

function to24h(timePart: string): string | null {
  const raw = normalizeTimePart(timePart);
  const match = raw.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm)?$/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const suffix = match[3];
  if (Number.isNaN(hour) || Number.isNaN(minute) || minute > 59) return null;

  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (!suffix && hour >= 24) return null;
  if (hour > 23) return null;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseRange(input: string): { start: string; end: string } | null {
  const clean = normalizeWhitespace(input.replace(/[–—]/g, "-"));
  const match = clean.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (!match) return null;
  const start = to24h(match[1]);
  const end = to24h(match[2]);
  if (!start || !end) return null;
  return { start, end };
}

function looksLikeRoleLine(line: string): boolean {
  const lower = normalizeWhitespace(line).toLowerCase();
  if (!lower) return false;
  return [
    "team lead",
    "team associate",
    "associate",
    "host",
    "services",
    "cashier",
    "do not disturb",
    "clock",
    "lunch",
    "break",
    "shift",
  ].some((token) => lower.includes(token));
}

function isLikelyName(line: string): boolean {
  const clean = normalizeWhitespace(line);
  if (!clean) return false;
  if (/\d/.test(clean)) return false;
  if (looksLikeRoleLine(clean)) return false;
  const tokens = clean.split(" ").filter(Boolean);
  if (tokens.length < 2) return false;
  return tokens.every((token) => /^[A-Za-z][A-Za-z'’-]*$/.test(token));
}

function findNameNearTime(lines: string[], timeLineIndex: number): string | null {
  const sameLine = lines[timeLineIndex];
  const inlineName = normalizeWhitespace(
    sameLine.replace(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?).*/i, "")
  );
  if (isLikelyName(inlineName)) return inlineName;

  for (let offset = 1; offset <= 3; offset += 1) {
    const idx = timeLineIndex - offset;
    if (idx < 0) break;
    const candidate = normalizeWhitespace(lines[idx]);
    if (isLikelyName(candidate)) return candidate;
  }

  return null;
}

export function parseScheduleText(input: string): ParsedShiftRow[] {
  const rows: ParsedShiftRow[] = [];
  const seen = new Set<string>();
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const range = parseRange(line);
    if (range) {
      const name = findNameNearTime(lines, i);
      if (!name) continue;
      const key = `${name.toLowerCase()}|${range.start}|${range.end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ name, start: range.start, end: range.end });
      continue;
    }

    // Fallback for "name line" followed by time line, possibly with a role line in between.
    if (isLikelyName(line)) {
      const next = lines[i + 1];
      const next2 = lines[i + 2];
      const nextRange = next ? parseRange(next) : null;
      const next2Range = next2 ? parseRange(next2) : null;

      if (nextRange) {
        const name = normalizeWhitespace(line);
        const key = `${name.toLowerCase()}|${nextRange.start}|${nextRange.end}`;
        if (!seen.has(key)) {
          seen.add(key);
          rows.push({ name, start: nextRange.start, end: nextRange.end });
        }
        i += 1;
      } else if (next2Range && next && looksLikeRoleLine(next)) {
        const name = normalizeWhitespace(line);
        const key = `${name.toLowerCase()}|${next2Range.start}|${next2Range.end}`;
        if (!seen.has(key)) {
          seen.add(key);
          rows.push({ name, start: next2Range.start, end: next2Range.end });
        }
        i += 2;
      }
    }
  }

  return rows;
}
