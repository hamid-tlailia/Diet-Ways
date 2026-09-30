// Automatic notification rules, shared by the server cron (app closed) and the app itself (open, no push).
// Pure: takes the user's state, the delivery bookkeeping (`meta`) and their local clock; returns what to send.
import { stageAt } from '../data/fasting.js';
import { tr } from '../i18n/strings.js';
import { todayKey } from './dates.js';
import { buildProfile, buildInsights } from './coach.js';

export const isQuiet = (h) => h >= 23 || h < 7;

// [hour, cups expected by then]: nudge only when behind.
const WATER_CHECKS = [
  [11, 2],
  [15, 4],
  [19, 6],
];
// AI coach windows [start hour, key]; each fires once a day inside a 2-hour window.
const COACH_WINDOWS = [
  [9, 'morning'],
  [14, 'afternoon'],
  [20, 'evening'],
];

const fmtHours = (h, lang) => {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  if (lang === 'ar') return whole >= 1 ? `${whole} س${mins ? ` و${mins} د` : ''}` : `${mins} دقيقة`;
  return whole >= 1 ? `${whole}h${mins ? ` ${mins}m` : ''}` : `${mins} min`;
};

export function planNotifications(state, meta = {}, ref = new Date(), now = Date.now()) {
  const lang = state.lang === 'en' ? 'en' : 'ar';
  const t = (v) => tr(lang, v);
  const L = (ar, en) => (lang === 'ar' ? ar : en);
  const hour = ref.getHours();
  const day = todayKey(ref);
  const items = [];
  const next = { ...meta };

  if (next.day !== day) {
    next.day = day;
    next.sent = [];
  }
  next.sent = [...(next.sent ?? [])];
  next.insightsSent = [...(next.insightsSent ?? [])];

  // ── Fasting: stages, remaining time, goal. Sent at any hour: the user chose to fast now.
  const quiet = isQuiet(hour);

  if (state.fastStart) {
    const goal = state.fastGoal || 16;
    const hours = (now - state.fastStart) / 3.6e6;
    const left = goal - hours;
    const stage = stageAt(hours);
    const milestones = [
      goal >= 8 && { id: 'half', at: goal / 2 },
      goal >= 10 && { id: 'left3', at: goal - 3 },
      goal >= 4 && { id: 'left1', at: goal - 1 },
    ].filter(Boolean);

    if (next.fastStart !== state.fastStart) {
      // New fast (or first sight of it): record where we are without replaying the past.
      next.fastStart = state.fastStart;
      next.stageId = stage.id;
      next.goalDone = hours >= goal;
      next.milestones = milestones.filter((m) => hours >= m.at).map((m) => m.id);
    } else {
      const remaining = left > 0 ? L(`⏳ باقي ${fmtHours(left, lang)} على هدفك`, `⏳ ${fmtHours(left, lang)} to your goal`) : '';
      const done = new Set(next.milestones ?? []);
      const due = milestones.filter((m) => hours >= m.at && !done.has(m.id));

      if (!next.goalDone && hours >= goal) {
        // The goal waits for the morning rather than waking the user.
        if (!quiet) {
          items.push({ key: 'goal', kind: 'goal', title: t('goalReached'), body: L(`أتممت ${goal} ساعة صيام. اكسر صيامك بوجبة غنية بالبروتين والخضار 🥗`, `${goal} hours done. Break your fast with protein and veg 🥗`) });
          next.goalDone = true;
        }
        due.forEach((m) => done.add(m.id));
      } else if (next.stageId !== stage.id) {
        if (!quiet) items.push({ key: `stage:${stage.id}`, kind: 'stage', title: `${t(stage.name)} ✨`, body: `${t(stage.tip)} ${remaining}`.trim() });
      } else if (due.length) {
        // One milestone per run; while asleep they are skipped, not queued.
        const m = due[due.length - 1];
        if (!quiet) {
          const body = {
            half: L(`نصف الطريق! مضت ${fmtHours(hours, lang)} وأنت في «${t(stage.name)}». استمر 💪`, `Halfway there! ${fmtHours(hours, lang)} done and you're in “${t(stage.name)}”. Keep going 💪`),
            left3: L(`ثلاث ساعات فقط وتصل لهدفك. جسمك يحرق الدهون الآن 🔥`, `Just 3 hours to your goal. Your body is burning fat right now 🔥`),
            left1: L(`ساعة واحدة تفصلك عن الإنجاز! لا تستسلم الآن 🏁`, `One hour to go! Don't stop now 🏁`),
          }[m.id];
          items.push({ key: `fast:${m.id}`, kind: 'remaining', title: remaining || t('navFasting'), body });
        }
        due.forEach((x) => done.add(x.id));
      }
      next.stageId = stage.id;
      next.milestones = [...done];
    }
  } else {
    next.fastStart = null;
  }

  // Everything below is daytime-only and at most one per run (the rest waits ~10 minutes).
  if (quiet || items.length) return { items, meta: next };
  const once = (key) => (next.sent.includes(key) ? false : (next.sent.push(key), true));

  // ── Water: nudge when behind the day's pace.
  const water = state.checkins?.[day]?.water ?? 0;
  for (const [h, target] of WATER_CHECKS) {
    if (hour >= h && hour < h + 3 && water < target && once(`water:${h}`)) {
      items.push({
        key: `water:${h}`,
        kind: 'water',
        title: L('💧 وقت الماء', '💧 Water time'),
        body: L(`شربت ${water} من 8 أكواب اليوم. كوب الآن ينعش جسمك ويخفف الجوع.`, `${water} of 8 cups so far today. A glass now refreshes you and curbs hunger.`),
      });
      return { items, meta: next };
    }
  }

  // ── AI coach motivation, three times a day.
  for (const [h, key] of COACH_WINDOWS) {
    if (hour >= h && hour < h + 2 && once(`coach:${key}`)) {
      items.push({ key: `coach:${key}`, kind: 'coach', title: t('appName'), ai: 'coach' });
      return { items, meta: next };
    }
  }

  // ── New coach observations, at most one a day.
  if (hour >= 12 && hour < 22 && !next.sent.includes('insight')) {
    const fresh = buildInsights(buildProfile(state, ref), lang).find((x) => !x.daily && !next.insightsSent.includes(x.id));
    if (fresh) {
      next.sent.push('insight');
      next.insightsSent = [...next.insightsSent, fresh.id].slice(-40);
      items.push({ key: `insight:${fresh.id}`, kind: 'insight', title: `${fresh.icon} ${t('insightTitle')}`, body: fresh.text });
      return { items, meta: next };
    }
  }

  // ── Daily AI meal plan, once the questionnaire is done.
  // Skipped when the app already made today's plan (it syncs the dates it has).
  if (state.mealProfile?.done && hour >= 7 && once('meals') && !(state.mealDays ?? []).includes(day)) {
    items.push({ key: 'meals', kind: 'meals', title: L('🍽️ وجباتك لليوم جاهزة', '🍽️ Your meals for today are ready'), ai: 'meals' });
  }

  return { items, meta: next };
}
