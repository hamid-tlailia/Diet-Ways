import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { House, LayoutGrid, Timer, Sparkles, Utensils, Settings as SettingsIcon, Sun, Moon, SunMoon, Languages } from 'lucide-react';
import { useStore, todayKey } from './store/useStore';
import { useT, tr } from './i18n';
import { useResolvedTheme } from './lib/hooks';
import { generateMessage } from './lib/coach';
import { registerSW, systemNotify, buzz } from './lib/notify';
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
import { useBadgeWatcher, BadgeCelebration } from './components/Badges';

const TABS = [
  { id: 'home', icon: House, label: 'navHome' },
  { id: 'diets', icon: LayoutGrid, label: 'navDiets' },
  { id: 'fasting', icon: Timer, label: 'navFasting' },
  { id: 'meals', icon: Utensils, label: 'navMeals' },
  { id: 'coach', icon: Sparkles, label: 'navCoach' },
];
// Settings is reached from the gear in the top bar, keeping the dock to five tabs.
const ROUTES = [...TABS.map((x) => x.id), 'settings'];

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
          } else if (item.kind === 'insight' || item.kind === 'weekly') {
            useStore.getState().addMessage({ text: body, source: 'local', kind: item.kind });
          }
          toast({ title: item.title, body });
          buzz();
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
      if (['coach', 'insight', 'weekly', 'meals'].includes(p.kind)) pullInbox();
      toast({ title: p.title, body: p.body });
      buzz();
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);

    // Re-register this device for background push whenever the app opens, so a phone that enabled
    // notifications before the server was ready (or lost its subscription) recovers on its own.
    const connect = async () => {
      const s = store();
      if (!s.notifEnabled) return;
      if (!pushSupported()) return useStore.setState({ pushId: null, pushError: 'support: push not supported by this browser' });
      if (Notification.permission !== 'granted') return useStore.setState({ pushId: null, pushError: `permission: ${Notification.permission}` });
      try {
        const pushId = await enablePush(s);
        useStore.setState({ pushId, pushError: null });
      } catch (e) {
        useStore.setState({ pushId: null, pushError: `${e.step}: ${e.message}` });
      }
      pullInbox();
    };
    connect();
    const onVisible = () => document.visibilityState === 'visible' && connect();
    document.addEventListener('visibilitychange', onVisible);
    pullInbox();
    ensureTodayPlan(store, store().setMealPlan)?.catch(() => null);

    const keys = ['lang', 'name', 'goal', 'dietId', 'fastStart', 'fastGoal', 'protocolId', 'history', 'interests', 'checkins', 'notifEnabled', 'mealProfile', 'mealPlans', 'weights', 'weighDay'];
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

// Dock background drawn as an SVG path with a real see-through notch around the active tab.
// (A path works in every mobile browser, unlike CSS masks.)
const DOCK_H = 64;
const DOCK_PAD = 14; // matches .bubble-dock inline padding
const CIRCLE_R = 27;
const LIFT = 4; // circle centre sits this far above the bar's top edge
const NOTCH_R = CIRCLE_R + 6; // notch shares the circle's centre, leaving an even 6px gap all round
const CORNER = 22;

function dockPath(w, x, open = true) {
  // A closed notch keeps the same path commands (so it animates smoothly) but has no depth.
  const R = open ? NOTCH_R : LIFT + 0.01;
  const f = open ? 5 : 0; // soft fillet where the notch meets the top edge
  const H = DOCK_H;
  const dx = Math.sqrt(R * R - LIFT * LIFT); // where the notch circle crosses the top edge
  const ey = Math.sqrt(R * R - (dx - 1) ** 2) - LIFT; // arc point just inside the edge, for the fillets
  // Top corners shrink when the notch sits near an edge, so the notch always centres on its tab.
  const rl = Math.max(0, Math.min(CORNER, x - dx - f));
  const rr = Math.max(0, Math.min(CORNER, w - x - dx - f));
  const r = CORNER;
  return [
    `M${rl},0`,
    `H${x - dx - f}`,
    `Q${x - dx},0 ${x - dx + 1},${ey}`,
    `A${R},${R} 0 0 0 ${x + dx - 1},${ey}`,
    `Q${x + dx},0 ${x + dx + f},0`,
    `H${w - rr}`,
    `A${rr},${rr} 0 0 1 ${w},${rr}`,
    `V${H - r}`,
    `A${r},${r} 0 0 1 ${w - r},${H}`,
    `H${r}`,
    `A${r},${r} 0 0 1 0,${H - r}`,
    `V${rl}`,
    `A${rl},${rl} 0 0 1 ${rl},0`,
    'Z',
  ].join(' ');
}

function DockShape({ index, count, rtl }) {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const slot = (w - 2 * DOCK_PAD) / count;
  const i = Math.max(0, index);
  const cx = DOCK_PAD + (rtl ? count - 1 - i : i) * slot + slot / 2;
  const x = Math.min(Math.max(cx, NOTCH_R + 5), w - NOTCH_R - 5);
  return (
    <svg ref={ref} className="dock-shape" width={w || '100%'} height={DOCK_H} viewBox={`0 0 ${w || 1} ${DOCK_H}`} aria-hidden="true">
      {w > 0 && <motion.path initial={false} animate={{ d: dockPath(w, x, index >= 0) }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
    </svg>
  );
}

function ThemeLangControls({ tab, go }) {
  const { t, lang } = useT();
  const mode = useStore((s) => s.themeMode);
  const set = useStore((s) => s.set);
  const nextMode = { auto: 'day', day: 'night', night: 'auto' }[mode];
  const ModeIcon = { auto: SunMoon, day: Sun, night: Moon }[mode];
  return (
    <div className="top-controls">
      <button className="chip glass" onClick={() => set({ lang: lang === 'ar' ? 'en' : 'ar' })} title={t('language')}>
        <Languages size={16} /> {lang === 'ar' ? 'EN' : 'ع'}
      </button>
      {/* Theme: icon only (auto / day / night), same size as the settings gear next to it. */}
      <button className="chip glass icon-chip" onClick={() => set({ themeMode: nextMode })} title={`${t('theme')}: ${t(mode)}`} aria-label={`${t('theme')}: ${t(mode)}`}>
        <ModeIcon size={17} />
      </button>
      <button className={tab === 'settings' ? 'chip glass icon-chip on' : 'chip glass icon-chip'} onClick={() => go('settings')} title={t('navSettings')} aria-label={t('navSettings')}>
        <SettingsIcon size={17} />
      </button>
    </div>
  );
}

export default function App() {
  const { t, lang } = useT();
  const theme = useResolvedTheme();
  const onboarded = useStore((s) => s.onboarded);
  const dockStyle = useStore((s) => s.dockStyle ?? 'notch');
  const registerVisit = useStore((s) => s.registerVisit);
  // The current page lives in the URL hash (#fasting, #diets/keto) so reloads and the back button keep your place.
  const parseHash = () => {
    const [id, diet] = window.location.hash.slice(1).split('/');
    return { tab: ROUTES.includes(id) ? id : 'home', diet: diet || null };
  };
  const [route, setRoute] = useState(parseHash);
  const { tab, diet: dietDetail } = route;
  useEffect(() => {
    const onPop = () => setRoute(parseHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const navigate = (id, diet = null) => {
    const hash = `#${id}${diet ? `/${diet}` : ''}`;
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    setRoute({ tab: id, diet });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const setDietDetail = (diet) => navigate('diets', diet);

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

  // Home-screen shortcuts (long-press the app icon) open /?do=water or /?do=fast; run the action once, then clean the URL.
  useEffect(() => {
    const action = new URLSearchParams(window.location.search).get('do');
    if (!action) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    const s = useStore.getState();
    if (action === 'water') {
      const cups = s.checkins[todayKey()]?.water ?? 0;
      if (cups < 8) s.checkin({ water: cups + 1 });
      toast({ title: '💧', body: `${Math.min(8, cups + 1)}/8 ${tr(s.lang, 'cups')}`, duration: 3000 });
    } else if (action === 'fast' && s.onboarded) {
      if (!s.fastStart) s.startFast();
      toast({ title: '⏳', body: tr(s.lang, s.fastStart ? 'fastRunning' : 'fastStarted'), duration: 3000 });
    }
  }, []);

  useLocalNotifications();
  usePushBridge();
  useBadgeWatcher();

  const go = (id, opts = {}) => navigate(id, opts.diet ?? null);

  const pages = {
    home: <Home go={go} theme={theme} />,
    diets: <Diets detail={dietDetail} setDetail={setDietDetail} go={go} />,
    fasting: <Fasting go={go} />,
    meals: <Meals key={dietDetail ?? ''} initialTab={dietDetail} />,
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
            <ThemeLangControls tab={tab} go={go} />
          </header>

          <main className="content">
            {/* New page appears immediately (no waiting for the old one to leave); its blocks reveal as you scroll. */}
            <motion.div key={tab + (dietDetail ?? '')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
              {pages[tab]}
            </motion.div>
          </main>

          {dockStyle === 'classic' ? (
            // The original dock: a glass capsule where the active tab becomes a gradient pill with its label.
            <nav className="dock classic-dock glass" aria-label="Main">
              {TABS.map(({ id, icon: Icon, label }) => (
                <button key={id} className={tab === id ? 'dock-item on' : 'dock-item'} onClick={() => go(id)} aria-current={tab === id ? 'page' : undefined} aria-label={t(label)}>
                  {tab === id && <motion.span layoutId="dock-pill" className="dock-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                  <Icon size={20} strokeWidth={tab === id ? 2.4 : 1.8} />
                  {tab === id && <span className="dock-label">{t(label)}</span>}
                </button>
              ))}
            </nav>
          ) : (
            <nav className="dock bubble-dock" aria-label="Main">
              <DockShape index={TABS.findIndex((x) => x.id === tab)} count={TABS.length} rtl={lang === 'ar'} />
              {TABS.map(({ id, icon: Icon, label }) => {
                const on = tab === id;
                return (
                  <button key={id} className={on ? 'dock-item on' : 'dock-item'} onClick={() => go(id)} aria-current={on ? 'page' : undefined} aria-label={t(label)}>
                    {/* The active tab's icon rises into a floating circle that slides between tabs. */}
                    {on && <motion.span layoutId="dock-bubble" className="dock-bubble" transition={{ type: 'spring', stiffness: 420, damping: 30 }} />}
                    <motion.span className="dock-ico" animate={{ y: on ? -36 : 0 }} transition={{ type: 'spring', stiffness: 420, damping: 26 }}>
                      <Icon size={22} strokeWidth={on ? 2.2 : 1.8} />
                    </motion.span>
                    <AnimatePresence>
                      {on && (
                        <motion.span className="dock-label" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                          {t(label)}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      )}
      <ToastHost />
      <BadgeCelebration />
    </>
  );
}
