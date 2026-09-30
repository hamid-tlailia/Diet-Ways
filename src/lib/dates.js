export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// An active day: the water goal is met and every meal of that day's plan was logged as eaten
// (days without a plan only need the water).
export const WATER_GOAL = 8;
export function isActiveDay(c) {
  if (!c || (c.water ?? 0) < WATER_GOAL) return false;
  return !c.planned || (c.meals?.length ?? 0) >= c.planned;
}

// What's still missing for today to count: { water: cups left, meals: meal indexes not yet logged }.
export function missingToday(c, plannedMeals = []) {
  const eaten = new Set(c?.meals ?? []);
  return { water: Math.max(0, WATER_GOAL - (c?.water ?? 0)), meals: plannedMeals.map((_, i) => i).filter((i) => !eaten.has(i)) };
}

// Consecutive active days, ending today (if already active) or yesterday.
export function activeStreak(checkins = {}, ref = new Date()) {
  const d = new Date(ref);
  if (!isActiveDay(checkins[todayKey(d)])) d.setDate(d.getDate() - 1);
  let n = 0;
  while (isActiveDay(checkins[todayKey(d)])) {
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
