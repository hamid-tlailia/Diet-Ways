import { DIETS, dietById } from '../data/diets.js';
import { STAGES, stageAt, PROTOCOLS } from '../data/fasting.js';
import { computeStreak, todayKey } from './dates.js';
import { tr, GOALS, MOODS } from '../i18n/strings.js';

const topKey = (obj = {}) => {
  const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  return entries.length ? { key: entries[0][0], count: entries[0][1] } : null;
};

export function timeOfDay(h = new Date().getHours()) {
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

// A compact picture of the user built from everything the app has observed.
// `ref` is a Date whose local fields are the user's wall-clock time (see zonedDate for the server).
export function buildProfile(s, ref = new Date()) {
  const interests = s.interests ?? {};
  const favDiet = topKey(interests.diets);
  const favStage = topKey(interests.stages);
  const favSection = topKey(interests.sections);
  const favProtocol = topKey(interests.protocols);
  const history = s.history ?? [];
  const today = s.checkins?.[todayKey(ref)] ?? {};
  const fastingHours = s.fastStart ? (Date.now() - s.fastStart) / 3.6e6 : null;
  const completed = history.filter((h) => (h.end - h.start) / 3.6e6 >= h.goal * 0.95);
  return {
    name: s.name,
    goal: s.goal,
    dietId: s.dietId ?? favDiet?.key ?? 'fasting',
    favDiet,
    favStage,
    favSection,
    favProtocol,
    streak: computeStreak(s.visits ?? [], ref),
    fastsDone: completed.length,
    totalHours: Math.round(history.reduce((a, h) => a + (h.end - h.start) / 3.6e6, 0)),
    fastingHours,
    fastGoal: s.fastGoal,
    stage: fastingHours != null ? stageAt(fastingHours) : null,
    mood: today.mood ?? null,
    water: today.water ?? 0,
    tod: timeOfDay(ref.getHours()),
  };
}

// Observations the coach shows the user so they feel understood.
export function buildInsights(p, lang) {
  const t = (v) => tr(lang, v);
  const L = (ar, en) => (lang === 'ar' ? ar : en);
  const out = [];

  if (p.favDiet && p.favDiet.count >= 3 && p.favDiet.key !== p.dietId) {
    const d = dietById(p.favDiet.key);
    out.push({
      icon: '🧭',
      text: L(
        `لاحظت أنك تعود كثيرًا إلى ${t(d.name)} — ربما حان وقت تجربته؟`,
        `You keep coming back to ${t(d.name)} — maybe it's time to try it?`,
      ),
    });
  }
  if (p.favStage && p.favStage.count >= 2) {
    const st = STAGES.find((x) => x.id === p.favStage.key);
    if (st)
      out.push({
        icon: '🔬',
        text: L(
          `مرحلة «${t(st.name)}» تثير فضولك (${p.favStage.count} مرات). هدفك القادم الوصول إليها!`,
          `“${t(st.name)}” fascinates you (${p.favStage.count} taps). Let's make reaching it your next goal!`,
        ),
      });
  }
  if (p.favSection?.key === 'exercises')
    out.push({ icon: '🏃', text: L('أنت شخص حركي! سأقترح عليك تمارين أكثر.', "You're a mover! I'll suggest more workouts.") });
  if (p.favSection?.key === 'foods')
    out.push({ icon: '🥗', text: L('تحب استكشاف الأكلات — جرّب وصفة جديدة من قائمة المسموح.', 'You love exploring food — try a new recipe from the allowed list.') });

  if (p.streak >= 2)
    out.push({ icon: '🔥', text: L(`${p.streak} أيام متتالية! العادة تتشكل الآن.`, `${p.streak} days in a row! The habit is forming.`) });
  else out.push({ icon: '🌱', text: L('كل رحلة تبدأ بيوم واحد. عد غدًا لتبدأ سلسلتك.', 'Every journey starts with one day. Come back tomorrow to start your streak.') });

  if (p.fastsDone > 0)
    out.push({ icon: '🏆', text: L(`أكملت ${p.fastsDone} صيام بمجموع ${p.totalHours} ساعة. فخور بك!`, `${p.fastsDone} fasts completed, ${p.totalHours} hours total. Proud of you!`) });
  if (p.mood === 'tired')
    out.push({ icon: '💤', text: L('تشعر بالتعب اليوم؛ خفّف التمارين وركّز على النوم والماء.', 'Feeling tired today — go easy on training and focus on sleep and water.') });
  if (p.mood === 'hungry' && p.stage)
    out.push({ icon: '💧', text: L('الجوع يأتي كموجات ويختفي خلال 20 دقيقة. كوب ماء الآن؟', 'Hunger comes in waves and fades within 20 minutes. Glass of water?') });
  if (p.water < 4 && p.tod !== 'morning')
    out.push({ icon: '🚰', text: L(`شربت ${p.water} أكواب فقط اليوم. جسمك يحتاج 8.`, `Only ${p.water} cups of water today. Your body wants 8.`) });

  return out.slice(0, 4);
}

const LOCAL = {
  fasting: {
    ar: ['كل ساعة صيام استثمار في خلاياك ⏳', 'الجوع موجة، وأنت أقوى منها 🌊', 'جسمك يتعلّم حرق الدهون كوقود — استمر!', 'الانضباط اليوم حرية غدًا ✨'],
    en: ['Every fasting hour is an investment in your cells ⏳', "Hunger is a wave — you're stronger than it 🌊", 'Your body is learning to burn fat for fuel — keep going!', "Today's discipline is tomorrow's freedom ✨"],
  },
  mediterranean: {
    ar: ['رشة زيت زيتون وحفنة خضار = قلب سعيد 🫒', 'كُل ببطء واستمتع — هذا سر أهل المتوسط', 'طبق ملون اليوم؟ كلما زادت الألوان زادت الفائدة 🌈', 'السمك مرتين هذا الأسبوع؟ قلبك سيشكرك ❤️'],
    en: ['A drizzle of olive oil and a handful of greens = a happy heart 🫒', 'Eat slowly and savour — the Mediterranean secret', 'A colourful plate today? More colours, more benefits 🌈', 'Fish twice this week? Your heart will thank you ❤️'],
  },
  keto: {
    ar: ['أنت آلة حرق دهون الآن 🔥', 'قاوم الكربوهيدرات اليوم، واحصد الطاقة الثابتة غدًا', 'لا تنسَ الملح والماء — سر تجاوز إنفلونزا الكيتو 🧂', 'أفوكادو بدل الخبز؟ خيار ذكي 🥑'],
    en: ["You're a fat-burning machine now 🔥", 'Skip the carbs today, harvest steady energy tomorrow', "Don't forget salt and water — the secret to beating keto flu 🧂", 'Avocado instead of bread? Smart move 🥑'],
  },
  protein: {
    ar: ['بروتين في كل وجبة = عضلات تشكرك 💪', 'العضلات تُبنى في المطبخ قبل الصالة', 'تمرين قوة اليوم؟ جسمك جاهز! 🏋️', 'اشرب ماءك — البروتين يحتاج ترطيبًا 💧'],
    en: ['Protein at every meal = grateful muscles 💪', 'Muscles are built in the kitchen before the gym', "Strength session today? Your body is ready! 🏋️", 'Drink your water — protein needs hydration 💧'],
  },
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function localMessage(p, lang) {
  const t = (v) => tr(lang, v);
  const L = (ar, en) => (lang === 'ar' ? ar : en);
  const name = p.name ? (lang === 'ar' ? `${p.name}، ` : `${p.name}, `) : '';
  const pool = [...LOCAL[p.dietId][lang]];

  if (p.stage) {
    const h = Math.floor(p.fastingHours);
    pool.push(
      L(`${name}مضت ${h} ساعة — أنت في مرحلة «${t(p.stage.name)}». ${t(p.stage.tip)}`, `${name}${h}h in — you're in “${t(p.stage.name)}”. ${t(p.stage.tip)}`),
    );
  }
  if (p.streak >= 2) pool.push(L(`${name}${p.streak} أيام متتالية! لا تكسر السلسلة 🔥`, `${name}${p.streak}-day streak! Don't break the chain 🔥`));
  if (p.favSection?.key === 'exercises') {
    const ex = pick(dietById(p.dietId).exercises);
    pool.push(L(`${name}ما رأيك بـ${t(ex.name)} اليوم؟ ${t(ex.detail)}`, `${name}how about ${t(ex.name)} today? ${t(ex.detail)}`));
  }
  if (p.tod === 'morning') pool.push(L(`صباح الإنجاز ${name}ابدأ بكوب ماء ☀️`, `Good morning${p.name ? ` ${p.name}` : ''}! Start with a glass of water ☀️`));
  if (p.tod === 'night') pool.push(L(`${name}النوم الجيد نصف الحمية 🌙`, `${name}good sleep is half the diet 🌙`));
  return pick(pool);
}

const SYSTEM_PROMPT =
  'You write a single push notification for a diet & fasting app. It must feel personal, warm and specific to the user context ' +
  '(mention what they care about, their streak, fasting stage or mood when relevant). Max 25 words, at most one emoji, ' +
  'no hashtags, no quotes, no medical claims beyond general wellness. Write it in the requested language. Output only the notification text.';

// Request body shared by the browser (user key) and the server (/api/coach, cron).
export function buildAiRequest(p, lang) {
  const diet = dietById(p.dietId);
  const ctx = {
    language: lang === 'ar' ? 'Arabic' : 'English',
    name: p.name || null,
    goal: GOALS.find((g) => g.id === p.goal)?.en,
    diet: diet.name.en,
    timeOfDay: p.tod,
    dayStreak: p.streak,
    fastsCompleted: p.fastsDone,
    currentlyFasting: p.stage
      ? { hoursElapsed: Math.round(p.fastingHours * 10) / 10, goalHours: p.fastGoal, stage: p.stage.name.en }
      : null,
    moodToday: MOODS.find((m) => m.id === p.mood)?.en ?? null,
    waterCupsToday: p.water,
    mostInterestedIn: {
      diet: p.favDiet ? dietById(p.favDiet.key).name.en : null,
      fastingStage: p.favStage ? STAGES.find((s) => s.id === p.favStage.key)?.name.en : null,
      section: p.favSection?.key ?? null,
      protocol: p.favProtocol ? PROTOCOLS.find((x) => x.id === p.favProtocol.key)?.id : null,
    },
  };
  return {
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    output_config: { effort: 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `User context:\n${JSON.stringify(ctx, null, 2)}` }],
  };
}

export function readAiText(response) {
  if (response.stop_reason === 'refusal') throw new Error('refusal');
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  if (!text) throw new Error('empty');
  return text;
}

// Browser path: the user pasted their own key in Settings.
export async function aiMessage(p, lang, apiKey) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  return readAiText(await client.beta.messages.create(buildAiRequest(p, lang)));
}

// Fields the server needs to personalise messages; keeps payloads small and private.
export function snapshot(s) {
  return {
    lang: s.lang,
    name: s.name,
    goal: s.goal,
    dietId: s.dietId,
    fastStart: s.fastStart,
    fastGoal: s.fastGoal,
    protocolId: s.protocolId,
    history: s.history.slice(0, 30),
    interests: s.interests,
    visits: s.visits.slice(-40),
    checkins: Object.fromEntries(Object.entries(s.checkins).slice(-3)),
    notifEnabled: s.notifEnabled,
    notifEvery: s.notifEvery,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

// Server path: /api/coach holds the key, so users never need one.
async function serverMessage(state) {
  const res = await fetch('/api/coach', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ state: snapshot(state) }),
  });
  if (!res.ok) throw new Error(`coach ${res.status}`);
  const { text } = await res.json();
  if (!text) throw new Error('empty');
  return text;
}

export async function generateMessage(state) {
  const p = buildProfile(state);
  try {
    const text = state.apiKey ? await aiMessage(p, state.lang, state.apiKey) : await serverMessage(state);
    return { text, source: 'ai', dietId: p.dietId };
  } catch (e) {
    console.warn('AI generation failed, using local coach', e);
  }
  return { text: localMessage(p, state.lang), source: 'local', dietId: p.dietId };
}

export { DIETS };
