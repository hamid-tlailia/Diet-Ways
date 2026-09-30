import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { House, LayoutGrid, Timer, Sparkles, Utensils, Settings as SettingsIcon, Sun, Moon, SunMoon, Languages } from 'lucide-react';
import { useStore } from './store/useStore';
import { useT, tr } from './i18n';
import { useResolvedTheme } from './lib/hooks';
import { generateMessage } from './lib/coach';
import { registerSW, systemNotify } from './lib/notify';
import { syncPush, fetchInbox, enablePush, pushSupported } from './lib/push';
import { planNotifications } from './lib/rules';
import { ensureTodayPlan } from './lib/mealsApi';
import { ToastHost, toast } from './components/ui';
import Home from './pages/Home';
import Diets from './pages/Diets';
import Fasting from './pages/Fasting';
import Coach from './pages/Coach';
import Meals from './pages/Meals';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';

const TABS = [
  { id: 'home', icon: House, label: 'navHome' },
  { id: 'diets', icon: LayoutGrid, label: 'navDiets' },
  { id: 'fasting', icon: Timer, label: 'navFasting' },
  { id: 'meals', icon: Utensils, label: 'navMeals' },
  { id: 'coach', icon: Sparkles, label: 'navCoach' },
  { id: 'settings', icon: SettingsIcon, label: 'navSettings' },
];

// In-app notifications when this device has no server push: same rules as the cron (lib/rules.js).
function useLocalNotifications() {
  useEffect(() => {
    let busy = false;
    const tick = async () => {
      const s = useStore.getState();
      if (busy || s.pushId || !s.onboarded) return;
      const t = (v) => tr(s.lang, v);
      const { items, meta } = planNotifications(s, s.notifMeta);
      useStore.setState({ notifMeta: meta });
      busy = true;
      try {
        for (const item of items) {
          let body = item.body;
          if (item.ai === 'meals') {
            await ensureTodayPlan(useStore.getState, useStore.getState().setMealPlan)?.catch(() => null);
            const plan = useStore.getState().mealPlans[meta.day];
            if (!plan) continue;
            body = plan.meals.map((m) => m.name).join(' · ');
          } else if (item.ai === 'coach') {
            if (!s.notifEnabled) continue;
            const msg = await generateMessage(useStore.getState());
            useStore.getState().addMessage({ ...msg, kind: 'coach' });
            body = msg.text;
          } else if (item.kind === 'insight') {
            useStore.getState().addMessage({ text: body, source: 'local', kind: 'insight' });
          }
          toast({ title: item.title, body });
          if (s.notifEnabled) systemNotify(item.title, body);
        }
      } finally {
        busy = false;
      }
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
}

// Keeps the server's copy of this device's context fresh and pulls in pushes received while closed.
function usePushBridge() {
  useEffect(() => {
    const store = useStore.getState;
    const absorb = (m) => {
      if (m.kind === 'meals') {
        if (m.plan && !store().mealPlans[m.plan.date]) store().setMealPlan(m.plan);
      } else store().addMessage(m);
    };
    const pullInbox = () => {
      const { pushId } = store();
      if (pushId) fetchInbox(pushId).then((items) => items.forEach(absorb));
    };
    const onMessage = (e) => {
      const p = e.data?.payload;
      if (e.data?.type !== 'push' || !p) return;
      if (p.kind === 'coach' || p.kind === 'insight' || p.kind === 'meals') pullInbox();
      toast({ title: p.title, body: p.body });
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);

    // Re-register this device for background push whenever the app opens, so a phone that enabled
    // notifications before the server was ready (or lost its subscription) recovers on its own.
    const connect = async () => {
      const s = store();
      if (!s.notifEnabled || !pushSupported() || Notification.permission !== 'granted') return;
      const pushId = await enablePush(s).catch(() => null);
      if (pushId !== s.pushId) useStore.setState({ pushId });
      pullInbox();
    };
    connect();
    const onVisible = () => document.visibilityState === 'visible' && connect();
    document.addEventListener('visibilitychange', onVisible);
    pullInbox();
    ensureTodayPlan(store, store().setMealPlan)?.catch(() => null);

    const keys = ['lang', 'name', 'goal', 'dietId', 'fastStart', 'fastGoal', 'protocolId', 'history', 'interests', 'checkins', 'notifEnabled', 'mealProfile', 'mealPlans'];
    let timer;
    const unsub = useStore.subscribe((s, prev) => {
      if (!s.pushId || !keys.some((k) => s[k] !== prev[k])) return;
      clearTimeout(timer);
      timer = setTimeout(() => syncPush(store()), 3000);
    });
    return () => {
      navigator.serviceWorker?.removeEventListener('message', onMessage);
      document.removeEventListener('visibilitychange', onVisible);
      unsub();
      clearTimeout(timer);
    };
  }, []);
}

function ThemeLangControls() {
  const { t, lang } = useT();
  const mode = useStore((s) => s.themeMode);
  const set = useStore((s) => s.set);
  const nextMode = { auto: 'day', day: 'night', night: 'auto' }[mode];
  const ModeIcon = { auto: SunMoon, day: Sun, night: Moon }[mode];
  return (
    <div className="top-controls">
      <button className="chip glass" onClick={() => set({ themeMode: nextMode })} title={t('theme')}>
        <ModeIcon size={16} /> {t(mode)}
      </button>
      <button className="chip glass" onClick={() => set({ lang: lang === 'ar' ? 'en' : 'ar' })} title={t('language')}>
        <Languages size={16} /> {lang === 'ar' ? 'EN' : 'ع'}
      </button>
    </div>
  );
}

export default function App() {
  const { t, lang } = useT();
  const theme = useResolvedTheme();
  const onboarded = useStore((s) => s.onboarded);
  const registerVisit = useStore((s) => s.registerVisit);
  const [tab, setTab] = useState('home');
  const [dietDetail, setDietDetail] = useState(null);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'day' ? '#fff7ed' : '#070b16');
  }, [theme]);

  useEffect(() => {
    registerVisit();
    registerSW();
  }, [registerVisit]);

  useLocalNotifications();
  usePushBridge();

  const go = (id, opts = {}) => {
    setTab(id);
    setDietDetail(opts.diet ?? null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const pages = {
    home: <Home go={go} theme={theme} />,
    diets: <Diets detail={dietDetail} setDetail={setDietDetail} go={go} />,
    fasting: <Fasting />,
    meals: <Meals />,
    coach: <Coach />,
    settings: <Settings />,
  };

  return (
    <>
      <div className="bg-scene" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <span className="grain" />
      </div>

      {!onboarded ? (
        <Onboarding />
      ) : (
        <div className="shell">
          <header className="topbar">
            <div className="brand">
              <img src="/favicon.svg" alt="" width="34" height="34" />
              <span>{t('appName')}</span>
            </div>
            <ThemeLangControls />
          </header>

          <main className="content">
            {/* New page appears immediately (no waiting for the old one to leave); its blocks reveal as you scroll. */}
            <motion.div key={tab + (dietDetail ?? '')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
              {pages[tab]}
            </motion.div>
          </main>

          <nav className="dock glass" aria-label="Main">
            {TABS.map(({ id, icon: Icon, label }) => (
              <button key={id} className={tab === id ? 'dock-item on' : 'dock-item'} onClick={() => go(id)} aria-current={tab === id ? 'page' : undefined}>
                {tab === id && <motion.span layoutId="dock-pill" className="dock-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <Icon size={20} strokeWidth={tab === id ? 2.4 : 1.8} />
                <span className="dock-label">{t(label)}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
      <ToastHost />
    </>
  );
}
