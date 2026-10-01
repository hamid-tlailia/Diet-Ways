import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { todayKey } from '../lib/dates';
import { editMeal, mergeEaten, placeMeal, unlogMeal } from '../lib/meals';

export { todayKey, activeStreak } from '../lib/dates';



const initialState = {
  onboarded: false,
  lang: 'ar',
  themeMode: 'auto', // 'auto' | 'day' | 'night'
  dockStyle: 'notch', // 'notch' (floating circle) | 'classic' (the original glass pill)
  name: '',
  goal: 'lose',
  dietId: null,

  // Fasting
  protocolId: '16:8',
  fastStart: null, // epoch ms while a fast is running
  fastGoal: 16,
  history: [], // { start, end, goal, protocolId }

  // Engagement signals the coach learns from
  interests: {
    diets: {}, // dietId -> views
    sections: {}, // section key -> taps
    stages: {}, // stageId -> taps
    protocols: {}, // protocolId -> starts
  },
  visits: [], // unique day keys the app was opened
  checkins: {}, // dayKey -> { mood, water }

  // Notifications
  notifEnabled: false,
  notifMeta: {}, // delivery bookkeeping for in-app notifications (see lib/rules.js)
  pushId: null, // set when this device receives server push (works with the app closed)
  pushError: null, // last reason background push could not be set up (shown in Settings)
  messages: [], // { id, text, source, at, dietId, kind }

  // Meals
  mealProfile: null, // questionnaire answers; { done: true, ... } once completed
  mealPlans: {}, // dayKey -> AI plan
  scans: [], // { id, at, thumb, ...analysis }
  shopping: null, // { at, groups: [{ name, emoji, items: [{ name, qty, done }] }] }

  // Progress
  weights: [], // { date: dayKey, kg }
  weighDay: null, // 0–6: the weekly weigh-in day (reminded that morning)
  activity: null, // from the Android app: { app, perm, days: { dayKey: steps }, at, asked } (see lib/activity.js)
  badges: {}, // badgeId -> unlocked at (ms)
  badgeQueue: [], // unlocked but not yet celebrated
  badgesInit: false,
};

export const useStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      set: (patch) => set(patch),

      completeOnboarding: ({ name, goal, dietId }) =>
        set({ onboarded: true, name, goal, dietId }),

      chooseDiet: (dietId) => {
        get().track('diets', dietId, 3);
        set({ dietId });
      },

      track: (bucket, key, weight = 1) =>
        set((s) => ({
          interests: {
            ...s.interests,
            [bucket]: { ...s.interests[bucket], [key]: (s.interests[bucket]?.[key] ?? 0) + weight },
          },
        })),

      registerVisit: () =>
        set((s) => {
          const k = todayKey();
          return s.visits.includes(k) ? {} : { visits: [...s.visits, k].slice(-120) };
        }),

      startFast: () => {
        const { protocolId, track } = get();
        track('protocols', protocolId);
        set({ fastStart: Date.now() });
      },

      endFast: () =>
        set((s) => {
          if (!s.fastStart) return {};
          const entry = { start: s.fastStart, end: Date.now(), goal: s.fastGoal, protocolId: s.protocolId };
          return { fastStart: null, history: [entry, ...s.history].slice(0, 100) };
        }),

      setProtocol: (protocolId, fastGoal) => set({ protocolId, fastGoal }),

      checkin: (patch) =>
        set((s) => {
          const k = todayKey();
          const cur = s.checkins[k] ?? { mood: null, water: 0 };
          return { checkins: { ...s.checkins, [k]: { ...cur, ...patch } } };
        }),

      addMessage: (msg) =>
        set((s) => {
          if (msg.id && s.messages.some((m) => m.id === msg.id)) return {};
          const messages = [{ id: crypto.randomUUID(), at: Date.now(), ...msg }, ...s.messages].sort((a, b) => b.at - a.at);
          return { messages: messages.slice(0, 20) };
        }),

      // Marks a planned meal of today as eaten (or not). Logged meals count towards an active day.
      toggleMealEaten: (i) =>
        set((s) => {
          const k = todayKey();
          const cur = s.checkins[k] ?? { mood: null, water: 0 };
          const eaten = new Set(cur.meals ?? []);
          eaten.has(i) ? eaten.delete(i) : eaten.add(i);
          const planned = s.mealPlans[k]?.meals.length ?? cur.planned ?? 0;
          return { checkins: { ...s.checkins, [k]: { ...cur, meals: [...eaten].sort(), planned } } };
        }),

      setMealPlan: (plan) =>
        set((s) => {
          // A new plan for a day keeps what was already eaten, re-placed over the new suggestions.
          const cur = s.checkins[plan.date] ?? { mood: null, water: 0 };
          const merged = mergeEaten(s.mealPlans[plan.date], s.mealPlans[plan.date] ? cur.meals ?? [] : [], plan);
          const checkins = { ...s.checkins, [plan.date]: { ...cur, planned: merged.plan.meals.length, meals: merged.eaten } };
          const plans = { ...s.mealPlans, [plan.date]: merged.plan };
          const keep = Object.keys(plans).sort().slice(-30);
          return { mealPlans: Object.fromEntries(keep.map((k) => [k, plans[k]])), checkins };
        }),

      // Today's eaten meals (from a scan, a manual entry or an edited suggestion). `op` is a pure helper from lib/meals.
      changeToday: (op) => {
        let out = null;
        set((s) => {
          const k = todayKey();
          const cur = s.checkins[k] ?? { mood: null, water: 0 };
          // No plan yet: start an empty one (custom) that a later AI plan merges into.
          const plan = s.mealPlans[k] ?? { date: k, meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 }, tip: '', at: Date.now(), custom: true };
          out = op(plan, cur.meals ?? []);
          return {
            mealPlans: { ...s.mealPlans, [k]: out.plan },
            checkins: { ...s.checkins, [k]: { ...cur, meals: out.eaten, planned: out.plan.meals.length } },
          };
        });
        return out;
      },
      logMeal: (meal) => get().changeToday((p, e) => placeMeal(p, e, meal)),
      editTodayMeal: (i, meal) => get().changeToday((p, e) => editMeal(p, e, i, meal)),
      unlogTodayMeal: (i) => get().changeToday((p, e) => unlogMeal(p, e, i)),

      addScan: (scan) => set((s) => ({ scans: [{ id: crypto.randomUUID(), at: Date.now(), ...scan }, ...s.scans].slice(0, 30) })),

      logWeight: (kg) =>
        set((s) => {
          const date = todayKey();
          const weights = [...s.weights.filter((w) => w.date !== date), { date, kg }].sort((a, b) => (a.date < b.date ? -1 : 1));
          // The first weigh-in sets the weekly weigh day (changeable in the weight card).
          return { weights: weights.slice(-60), weighDay: s.weighDay ?? new Date().getDay() };
        }),

      // `silent` records badges without celebrating (first run, so past progress doesn't flood the screen).
      unlockBadges: (ids, silent = false) =>
        set((s) => {
          const fresh = ids.filter((id) => !s.badges[id]);
          if (!fresh.length) return silent ? { badgesInit: true } : {};
          const now = Date.now();
          return {
            badges: { ...s.badges, ...Object.fromEntries(fresh.map((id) => [id, now])) },
            badgeQueue: silent ? s.badgeQueue : [...s.badgeQueue, ...fresh],
            badgesInit: true,
          };
        }),

      celebrated: () => set((s) => ({ badgeQueue: s.badgeQueue.slice(1) })),

      toggleShopping: (g, i) =>
        set((s) => {
          if (!s.shopping) return {};
          const groups = s.shopping.groups.map((grp, gi) => (gi !== g ? grp : { ...grp, items: grp.items.map((it, ii) => (ii !== i ? it : { ...it, done: !it.done })) }));
          return { shopping: { ...s.shopping, groups } };
        }),

      reset: () => set({ ...initialState }),
    }),
    {
      name: 'diet-ways-store',
      version: 2,
      migrate: (persisted) => {
        const { notifEvery, lastNotifAt, apiKey, stageSeen, ...rest } = persisted ?? {};
        return rest;
      },
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
