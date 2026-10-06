// Day/month boundaries in the shop's time zone (bills are stored in UTC).

function offsetMinutes(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** "YYYY-MM-DD" for `at` in the time zone. */
export function localDate(at: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** UTC instant of local midnight for a "YYYY-MM-DD" date. */
export function startOfLocalDay(date: string, timeZone: string) {
  const [y, m, d] = date.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d));
  return new Date(guess.getTime() - offsetMinutes(guess, timeZone) * 60000);
}

export function dayRange(date: string, timeZone: string) {
  const start = startOfLocalDay(date, timeZone);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

export function monthRange(at: Date, timeZone: string) {
  const [y, m] = localDate(at, timeZone).split("-").map(Number);
  const start = startOfLocalDay(`${y}-${String(m).padStart(2, "0")}-01`, timeZone);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { start, end: startOfLocalDay(next, timeZone) };
}

export function formatDateTime(at: Date, timeZone: string) {
  return at.toLocaleString("en-IN", { timeZone, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
