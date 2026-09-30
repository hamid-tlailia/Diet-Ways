import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { todayKey } from '../lib/dates';

export { todayKey, computeStreak } from '../lib/dates';



const initialState = {
  onboarded: false,
  lang: 'ar',
  themeMode: 'auto', // 'auto' | 'day' | 'night'
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

      setMealPlan: (plan) =>
        set((s) => {
          const plans = { ...s.mealPlans, [plan.date]: plan };
          const keep = Object.keys(plans).sort().slice(-30);
          return { mealPlans: Object.fromEntries(keep.map((k) => [k, plans[k]])) };
        }),

      addScan: (scan) => set((s) => ({ scans: [{ id: crypto.randomUUID(), at: Date.now(), ...scan }, ...s.scans].slice(0, 30) })),

      logWeight: (kg) =>
        set((s) => {
          const date = todayKey();
          const weights = [...s.weights.filter((w) => w.date !== date), { date, kg }].sort((a, b) => (a.date < b.date ? -1 : 1));
          return { weights: weights.slice(-60) };
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
