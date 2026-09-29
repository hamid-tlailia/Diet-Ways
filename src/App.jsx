import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { House, LayoutGrid, Timer, Sparkles, Settings as SettingsIcon, Sun, Moon, SunMoon, Languages } from 'lucide-react';
import { useStore } from './store/useStore';
import { useT, tr } from './i18n';
import { useResolvedTheme } from './lib/hooks';
import { generateMessage } from './lib/coach';
import { registerSW, systemNotify } from './lib/notify';
import { stageAt } from './data/fasting';
import { ToastHost, toast } from './components/ui';
import Home from './pages/Home';
import Diets from './pages/Diets';
import Fasting from './pages/Fasting';
import Coach from './pages/Coach';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';

const TABS = [
  { id: 'home', icon: House, label: 'navHome' },
  { id: 'diets', icon: LayoutGrid, label: 'navDiets' },
  { id: 'fasting', icon: Timer, label: 'navFasting' },
  { id: 'coach', icon: Sparkles, label: 'navCoach' },
  { id: 'settings', icon: SettingsIcon, label: 'navSettings' },
];

// Background loop: periodic AI/local motivation + a notification at every new fasting stage.
function useCoachScheduler() {
  useEffect(() => {
    let busy = false;
    const tick = async () => {
      const s = useStore.getState();
      const t = (v) => tr(s.lang, v);

      if (s.fastStart) {
        const hours = (Date.now() - s.fastStart) / 3.6e6;
        const stage = stageAt(hours);
        const seen = s.stageSeen.fastStart === s.fastStart ? s.stageSeen : { fastStart: s.fastStart, stageId: stage.id, goalDone: false };
        if (seen.stageId !== stage.id) {
          const title = `${t(stage.name)} ✨`;
          toast({ title, body: t(stage.tip) });
          systemNotify(title, t(stage.body));
        }
        let goalDone = seen.goalDone;
        if (!goalDone && hours >= s.fastGoal) {
          goalDone = true;
          toast({ title: t('goalReached'), body: `${s.fastGoal}${t('hoursShort')} ✓`, icon: '🏆' });
          systemNotify(t('goalReached'), `${s.fastGoal}${t('hoursShort')} ✓`);
        }
        useStore.setState({ stageSeen: { fastStart: s.fastStart, stageId: stage.id, goalDone } });
      }

      if (!busy && s.notifEnabled && Date.now() - s.lastNotifAt >= s.notifEvery * 60_000) {
        busy = true;
        try {
          const msg = await generateMessage(s);
          useStore.getState().addMessage(msg);
          toast({ title: t('aiNotif'), body: msg.text });
          systemNotify(t('appName'), msg.text);
        } finally {
          busy = false;
        }
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
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

  useCoachScheduler();

  const go = (id, opts = {}) => {
    setTab(id);
    setDietDetail(opts.diet ?? null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pages = {
    home: <Home go={go} theme={theme} />,
    diets: <Diets detail={dietDetail} setDetail={setDietDetail} go={go} />,
    fasting: <Fasting />,
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
            <AnimatePresence mode="wait">
              <motion.div
                key={tab + (dietDetail ?? '')}
                initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                {pages[tab]}
              </motion.div>
            </AnimatePresence>
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
