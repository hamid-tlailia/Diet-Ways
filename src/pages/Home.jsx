import { motion } from 'framer-motion';
import { Flame, Trophy, Clock, Droplet, Plus, Minus, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useStore, todayKey } from '../store/useStore';
import { activeStreak, isActiveDay } from '../lib/dates';
import { useT, MOODS } from '../i18n';
import { dietById } from '../data/diets';
import { stageAt } from '../data/fasting';
import { quoteOfDay } from '../data/quotes';
import { useNow } from '../lib/hooks';
import { buildProfile, buildInsights, timeOfDay } from '../lib/coach';
import MessageList from '../components/MessageList';
import StageIcon from '../components/StageIcon';
import { stagger } from '../components/ui';

export const fmtDuration = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export default function Home({ go, theme }) {
  const { t, lang } = useT();
  const state = useStore();
  const now = useNow(1000);
  const Chevron = lang === 'ar' ? ChevronLeft : ChevronRight;

  const diet = state.dietId ? dietById(state.dietId) : null;
  const streak = activeStreak(state.checkins);
  const today = state.checkins[todayKey()] ?? { mood: null, water: 0 };
  const planned = state.mealPlans[todayKey()]?.meals.length ?? 0;
  const eatenCount = Math.min(planned, today.meals?.length ?? 0);
  const activeNow = isActiveDay({ ...today, planned });
  const done = state.history.filter((h) => (h.end - h.start) / 3.6e6 >= h.goal * 0.95).length;
  const hours = Math.round(state.history.reduce((a, h) => a + (h.end - h.start) / 3.6e6, 0));
  const insights = buildInsights(buildProfile(state), lang);

  const greeting = { morning: 'goodMorning', afternoon: 'goodAfternoon', evening: 'goodEvening', night: 'goodNight' }[timeOfDay()];
  const quote = quoteOfDay(theme);

  const elapsed = state.fastStart ? now - state.fastStart : 0;
  const fastHours = elapsed / 3.6e6;
  const pct = state.fastStart ? Math.min(1, fastHours / state.fastGoal) : 0;
  const stage = stageAt(fastHours);


  let i = 0;
  return (
    <div className="bento">
      <motion.section {...stagger(i++)} className="card hero span-2">
        <span className="badge">{theme === 'day' ? '☀️ ' + t('dayTheme') : '🌙 ' + t('nightTheme')}</span>
        <h1>
          {t(greeting)}{lang === 'ar' ? '،' : ','} <span className="grad-text">{state.name || t('friend')}</span>
          {today.mood && (
            <motion.span key={today.mood} className="hero-mood" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }} title={t(MOODS.find((m) => m.id === today.mood))}>
              {MOODS.find((m) => m.id === today.mood)?.emoji}
            </motion.span>
          )}
        </h1>
        <p className="quote">“{t(quote)}”</p>
      </motion.section>

      <motion.section {...stagger(i++)} className="card plan-card" style={diet ? { '--g1': diet.gradient[0], '--g2': diet.gradient[1] } : undefined}>
        <button className="card-btn" onClick={() => go('diets', { diet: diet?.id })}>
          <span className="eyebrow">{diet ? t('yourPlan') : t('choosePlan')}</span>
          <span className="plan-emoji">{diet?.emoji ?? '🧭'}</span>
          <h3>{diet ? t(diet.name) : t('navDiets')}</h3>
          <p className="muted">{diet ? t(diet.tagline) : t('welcomeSub')}</p>
          <span className="link">
            {t('explore')} <Chevron size={16} />
          </span>
        </button>
      </motion.section>

      <motion.section {...stagger(i++)} className="card fast-mini">
        <button className="card-btn" onClick={() => go('fasting')}>
          <span className="eyebrow">{t('navFasting')} · {state.protocolId}</span>
          <div className="mini-ring" style={{ '--p': pct, '--c': stage.color }}>
            <div className="mini-ring-inner">{state.fastStart ? <StageIcon stage={stage} size={40} active /> : <Clock size={30} />}</div>
          </div>
          {state.fastStart ? (
            <>
              <strong className="mono">{fmtDuration(elapsed)}</strong>
              <span className="muted">{t(stage.name)}</span>
            </>
          ) : (
            <span className="muted">{t('notFasting')}</span>
          )}
        </button>
      </motion.section>

      <motion.section {...stagger(i++)} className="card stats span-2">
        <div className="stat">
          <Flame className="stat-ico" style={{ color: '#f97316' }} />
          <strong>{streak}</strong>
          <span>{t('streak')}</span>
        </div>
        <div className="stat">
          <Trophy className="stat-ico" style={{ color: '#eab308' }} />
          <strong>{done}</strong>
          <span>{t('fastsDone')}</span>
        </div>
        <div className="stat">
          <Clock className="stat-ico" style={{ color: '#8b5cf6' }} />
          <strong>{hours}</strong>
          <span>{t('totalHours')}</span>
        </div>
      </motion.section>

      <motion.section {...stagger(i++)} className={activeNow ? 'card active-day done' : 'card active-day'}>
        <div className="row-between">
          <span className="eyebrow">🎯 {t('activeToday')}</span>
          {activeNow && <span className="active-ok">{t('activeDone')}</span>}
        </div>
        <div className="active-rows">
          <div className="active-row">
            <span>💧 {t('water')}</span>
            <div className="bar">
              <motion.span animate={{ width: `${(Math.min(8, today.water) / 8) * 100}%` }} style={{ background: '#0ea5e9' }} />
            </div>
            <b className="num">{Math.min(8, today.water)}/8</b>
          </div>
          <div className="active-row">
            <span>🍽️ {t('mealsLogged')}</span>
            {planned ? (
              <>
                <div className="bar">
                  <motion.span animate={{ width: `${(eatenCount / planned) * 100}%` }} style={{ background: 'var(--accent)' }} />
                </div>
                <button className="chip" onClick={() => go('meals')}>
                  <b className="num">
                    {eatenCount}/{planned}
                  </b>
                </button>
              </>
            ) : (
              <small className="muted">{t('noPlanToday')}</small>
            )}
          </div>
        </div>
        {!activeNow && <p className="muted small">{t('activeHow')}</p>}
      </motion.section>

      <motion.section {...stagger(i++)} className={today.water >= 8 ? 'card water done' : 'card water'}>
        <div className="row-between">
          <span className="eyebrow">
            <Droplet size={14} /> {t('water')}
          </span>
          <span className={today.water >= 8 ? 'water-count ok' : 'muted'}>
            {Math.min(8, today.water)}/8 {t('cups')}
          </span>
        </div>
        <div className="cups">
          {Array.from({ length: 8 }, (_, k) => (
            <motion.span key={k} className={k < today.water ? 'cup full' : 'cup'} animate={{ scale: k === today.water - 1 ? [1, 1.25, 1] : 1 }} />
          ))}
        </div>
        <div className="row-gap">
          <button className="icon-btn" onClick={() => state.checkin({ water: Math.max(0, Math.min(8, today.water) - 1) })} aria-label="-">
            <Minus size={18} />
          </button>
          {/* The daily goal is 8 cups: counting stops there and the card shows it's complete. */}
          {today.water >= 8 ? (
            <span className="water-done grow">✓ {t('waterDone')}</span>
          ) : (
            <button className="btn primary grow" onClick={() => state.checkin({ water: Math.min(8, today.water + 1) })}>
              <Plus size={18} /> 💧
            </button>
          )}
        </div>
      </motion.section>

      <motion.section {...stagger(i++)} className="card coach-card span-2 tall">
        <div className="row-between">
          <span className="eyebrow">
            <Sparkles size={14} /> {t('insightTitle')}
          </span>
          <button className="chip" onClick={() => go('coach')}>
            {t('navCoach')} <Chevron size={14} />
          </button>
        </div>
        <ul className="insights">
          {insights.slice(0, 2).map((x, k) => (
            <li key={k}>
              <span>{x.icon}</span>
              {x.text}
            </li>
          ))}
        </ul>
        <MessageList messages={state.messages} />
      </motion.section>
      <motion.section {...stagger(i++)} className="card mood">
        <span className="eyebrow">{today.mood ? t('checkedIn') : t('dailyCheckin')}</span>
        <div className="moods">
          {MOODS.map((m) => (
            <button key={m.id} className={today.mood === m.id ? 'mood-btn on' : 'mood-btn'} onClick={() => state.checkin({ mood: m.id })} title={t(m)}>
              <span>{m.emoji}</span>
              <small>{t(m)}</small>
            </button>
          ))}
        </div>
      </motion.section>

    </div>
  );
}
