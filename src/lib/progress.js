// Weekly progress numbers shared by the Coach page, the Friday summary notification and the badges.
import { todayKey } from './dates.js';

const DAY = 864e5;
export const fastHours = (h) => (h.end - h.start) / 3.6e6;
export const fastCompleted = (h) => fastHours(h) >= h.goal * 0.95;

export function lastDays(ref, n) {
  return Array.from({ length: n }, (_, i) => todayKey(new Date(ref.getTime() - i * DAY)));
}

const MOOD_SCORE = { great: 5, good: 4, meh: 3, hungry: 3, tired: 2 };

export function weeklyStats(state, ref = new Date()) {
  const days = new Set(lastDays(ref, 7));
  const since = ref.getTime() - 7 * DAY;
  const fasts = (state.history ?? []).filter((h) => h.end >= since);
  const checkins = Object.entries(state.checkins ?? {})
    .filter(([d]) => days.has(d))
    .map(([, c]) => c);
  const moods = checkins.map((c) => MOOD_SCORE[c.mood]).filter(Boolean);
  const all = state.weights ?? [];
  const week = all.filter((w) => w.date >= todayKey(new Date(since)));
  return {
    fastHours: Math.round(fasts.reduce((a, h) => a + fastHours(h), 0)),
    fastsDone: fasts.filter(fastCompleted).length,
    waterDays: checkins.filter((c) => (c.water ?? 0) >= 8).length,
    moodAvg: moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null,
    weightChange: week.length >= 2 ? +(week.at(-1).kg - week[0].kg).toFixed(1) : null,
    totalWeightChange: all.length >= 2 ? +(all.at(-1).kg - all[0].kg).toFixed(1) : null,
    currentWeight: all.at(-1)?.kg ?? null,
  };
}
