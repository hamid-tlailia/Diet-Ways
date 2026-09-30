// Automatic notification rules, shared by the server cron (app closed) and the app itself (open, no push).
// Pure: takes the user's state, the delivery bookkeeping (`meta`) and their local clock; returns what to send.
import { stageAt } from '../data/fasting.js';
import { tr } from '../i18n/strings.js';
import { todayKey, isActiveDay, missingToday } from './dates.js';
import { buildProfile, buildInsights } from './coach.js';
import { weeklyStats } from './progress.js';

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

const MEAL_EMOJI = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍏' };
const MEAL_AR = { breakfast: 'الفطور', lunch: 'الغداء', dinner: 'العشاء', snack: 'الوجبة الخفيفة' };

// 30 minutes before the goal: suggest the first meal of today's plan to break the fast.
function breakFastBody(state, day, L) {
  const first = state.todayMeals?.date === day ? state.todayMeals.meals[0] : null;
  return first
    ? L(`بعد 30 دقيقة تكسر صيامك 🍽️ اقتراحنا: ${first.name}`, `30 minutes until you break your fast 🍽️ Suggestion: ${first.name}`)
    : L('بعد 30 دقيقة تكسر صيامك 🍽️ ابدأ بالماء ثم بروتين وخضار.', '30 minutes until you break your fast 🍽️ Start with water, then protein and veg.');
}

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
      goal >= 2 && { id: 'break', at: goal - 0.5 },
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
            break: breakFastBody(state, day, L),
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

  // ── Meal times from today's plan: a reminder in the 20 minutes after each meal's time.
  const plan = state.todayMeals?.date === day ? state.todayMeals.meals : [];
  const minutes = hour * 60 + ref.getMinutes();
  for (const [i, m] of plan.entries()) {
    const [mh, mm] = (m.time || '').split(':').map(Number);
    if (!Number.isFinite(mh) || state.fastStart) continue; // while fasting, the break-fast reminder covers it
    const diff = minutes - (mh * 60 + (mm || 0));
    if (diff >= 0 && diff <= 20 && once(`mealtime:${i}`)) {
      items.push({ key: `mealtime:${i}`, kind: 'mealtime', title: L(`${MEAL_EMOJI[m.type] ?? '🍽️'} حان وقت ${MEAL_AR[m.type] ?? 'الوجبة'}`, `${MEAL_EMOJI[m.type] ?? '🍽️'} Time for ${m.type ?? 'your meal'}`), body: L(`${m.name} — سجّلها بعد أن تأكلها ✓`, `${m.name} — log it once you've eaten ✓`) });
      return { items, meta: next };
    }
  }

  // ── Weigh-in day: one morning reminder, only if today's weight isn't logged yet.
  if (state.weighDay != null && ref.getDay() === state.weighDay && hour >= 7 && hour < 12 && !(state.weights ?? []).some((w) => w.date === day) && once('weigh')) {
    items.push({
      key: 'weigh',
      kind: 'weigh',
      title: L('⚖️ اليوم موعد قياس وزنك', "⚖️ It's weigh-in day"),
      body: L('قِس وزنك الآن قبل الأكل وبعد دخول الحمام، وسجّله في صفحة مدربك لمتابعة تقدّمك.', 'Weigh yourself now, before eating, and log it on the Coach page to track your progress.'),
    });
    return { items, meta: next };
  }

  // ── Active day: afternoon and evening nudges listing exactly what's missing (water + planned meals).
  const today = state.checkins?.[day];
  if (!isActiveDay(today)) {
    for (const [h, key] of [
      [17, 'complete:pm'],
      [20, 'complete:eve'],
    ]) {
      if (hour >= h && hour < h + 2 && once(key)) {
        const miss = missingToday(today, plan);
        const parts = [];
        if (miss.water) parts.push(L(`${miss.water} أكواب ماء`, `${miss.water} cups of water`));
        const meals = miss.meals.map((i) => plan[i]?.name).filter(Boolean);
        if (meals.length) parts.push(L(`تسجيل: ${meals.join('، ')}`, `logging: ${meals.join(', ')}`));
        if (!parts.length) break;
        items.push({
          key,
          kind: 'complete',
          title: L('🎯 أكمل يومك النشط', '🎯 Complete your active day'),
          body: L(`باقي لك ${parts.join(' و')} ليُحتسب اليوم يومًا نشطًا ولا تنقطع سلسلتك.`, `Still to go: ${parts.join(' and ')} so today counts as active and your streak continues.`),
        });
        return { items, meta: next };
      }
    }
  }

  // ── Friday evening: the week in numbers.
  if (ref.getDay() === 5 && hour >= 18 && hour < 22 && once('weekly')) {
    const w = weeklyStats(state, ref);
    const mood = w.moodAvg == null ? '' : w.moodAvg >= 4 ? L(' ومزاجك كان رائعًا 😊', ' and your mood was great 😊') : w.moodAvg >= 3 ? L(' ومزاجك مستقر', ' and your mood was steady') : L('، خذ قسطًا من الراحة 💤', '; take some rest 💤');
    const weight = w.weightChange == null ? '' : w.weightChange < 0 ? L(` ونقص وزنك ${-w.weightChange} كغ`, `, and you lost ${-w.weightChange} kg`) : '';
    items.push({
      key: 'weekly',
      kind: 'weekly',
      title: L('📊 ملخص أسبوعك', '📊 Your week'),
      body: L(
        `صُمت ${w.fastHours} ساعة (${w.fastsDone} صيام مكتمل)، وأكملت الماء ${w.waterDays} أيام${weight}${mood}. أسبوع جديد، إنجاز جديد!`,
        `${w.fastHours} fasting hours (${w.fastsDone} complete fasts), water goal on ${w.waterDays} days${weight}${mood}. New week, new wins!`,
      ),
    });
    return { items, meta: next };
  }

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
