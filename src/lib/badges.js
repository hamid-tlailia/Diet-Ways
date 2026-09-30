// Achievements, computed from the stored state. Each test returns true once the badge is earned.
import { computeStreak, todayKey } from './dates.js';
import { fastCompleted, fastHours, lastDays } from './progress.js';

const waterStreak = (s) => {
  let n = 0;
  for (const d of lastDays(new Date(), 60)) {
    if ((s.checkins?.[d]?.water ?? 0) >= 8) n++;
    else if (d !== todayKey()) break; // today may still be in progress
  }
  return n;
};

const lost = (s) => (s.weights.length >= 2 ? s.weights[0].kg - s.weights.at(-1).kg : 0);

export const BADGES = [
  { id: 'firstFast', emoji: '🌱', name: { ar: 'أول صيام', en: 'First fast' }, desc: { ar: 'أكملت أول صيام لك', en: 'Completed your first fast' }, test: (s) => s.history.some(fastCompleted) },
  { id: 'fast16', emoji: '🔥', name: { ar: 'صيام 16 ساعة', en: '16-hour fast' }, desc: { ar: 'أول صيام 16 ساعة أو أكثر', en: 'First fast of 16 hours or more' }, test: (s) => s.history.some((h) => fastHours(h) >= 16) },
  { id: 'fast18', emoji: '🧬', name: { ar: 'بوابة التجديد', en: 'Renewal gate' }, desc: { ar: 'وصلت مرحلة الالتهام الذاتي (18 ساعة)', en: 'Reached autophagy (18 hours)' }, test: (s) => s.history.some((h) => fastHours(h) >= 18) },
  { id: 'fasts5', emoji: '🏅', name: { ar: 'خمسة من خمسة', en: 'High five' }, desc: { ar: 'أكملت 5 صيامات', en: 'Completed 5 fasts' }, test: (s) => s.history.filter(fastCompleted).length >= 5 },
  { id: 'fasts20', emoji: '🏆', name: { ar: 'بطل الصيام', en: 'Fasting champion' }, desc: { ar: 'أكملت 20 صيامًا', en: 'Completed 20 fasts' }, test: (s) => s.history.filter(fastCompleted).length >= 20 },
  { id: 'water1', emoji: '💧', name: { ar: 'يوم مرتوٍ', en: 'Hydrated day' }, desc: { ar: 'أكملت 8 أكواب في يوم', en: 'Drank 8 cups in a day' }, test: (s) => Object.values(s.checkins ?? {}).some((c) => (c.water ?? 0) >= 8) },
  { id: 'water7', emoji: '🌊', name: { ar: 'أسبوع الماء', en: 'Water week' }, desc: { ar: '7 أيام متتالية بـ 8 أكواب', en: '7 days in a row with 8 cups' }, test: (s) => waterStreak(s) >= 7 },
  { id: 'streak7', emoji: '📆', name: { ar: 'أسبوع بلا انقطاع', en: 'Unbroken week' }, desc: { ar: 'فتحت التطبيق 7 أيام متتالية', en: 'Opened the app 7 days in a row' }, test: (s) => computeStreak(s.visits) >= 7 },
  { id: 'streak30', emoji: '👑', name: { ar: 'شهر من الالتزام', en: 'Month of commitment' }, desc: { ar: '30 يومًا متتاليًا', en: '30 days in a row' }, test: (s) => computeStreak(s.visits) >= 30 },
  { id: 'profile', emoji: '📝', name: { ar: 'أعرف نفسي', en: 'Know thyself' }, desc: { ar: 'أكملت استبيان الوجبات', en: 'Completed the meal questionnaire' }, test: (s) => !!s.mealProfile?.done },
  { id: 'scan1', emoji: '📸', name: { ar: 'عين الخبير', en: 'Expert eye' }, desc: { ar: 'حلّلت أول وجبة بالتصوير', en: 'Scanned your first meal' }, test: (s) => s.scans.length >= 1 },
  { id: 'weigh1', emoji: '⚖️', name: { ar: 'نقطة البداية', en: 'Starting point' }, desc: { ar: 'سجّلت وزنك لأول مرة', en: 'Logged your weight for the first time' }, test: (s) => s.weights.length >= 1 },
  { id: 'lost2', emoji: '🎯', name: { ar: 'أول 2 كغ', en: 'First 2 kg' }, desc: { ar: 'نقصت 2 كغ منذ البداية', en: 'Lost 2 kg since you started' }, test: (s) => lost(s) >= 2 },
  { id: 'lost5', emoji: '🚀', name: { ar: 'خمسة كيلو!', en: 'Five kilos!' }, desc: { ar: 'نقصت 5 كغ منذ البداية', en: 'Lost 5 kg since you started' }, test: (s) => lost(s) >= 5 },
];

export const earnedBadges = (s) => BADGES.filter((b) => b.test(s)).map((b) => b.id);
export const badgeById = (id) => BADGES.find((b) => b.id === id);
