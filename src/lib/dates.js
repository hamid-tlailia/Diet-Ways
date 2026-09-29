export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Consecutive days (ending today or yesterday) the user opened the app.
export function computeStreak(visits, ref = new Date()) {
  const set = new Set(visits);
  const d = new Date(ref);
  if (!set.has(todayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(todayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// A Date whose *local* getters return the wall-clock time in `tz` (for server-side use).
export function zonedDate(tz, at = Date.now()) {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
        .formatToParts(at)
        .map((p) => [p.type, Number(p.value)]),
    );
    return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  } catch {
    return new Date(at);
  }
}
