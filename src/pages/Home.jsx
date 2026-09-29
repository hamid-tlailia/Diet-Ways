import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Trophy, Clock, Droplet, Plus, Minus, ChevronLeft, ChevronRight, Sparkles, RefreshCw } from 'lucide-react';
import { useStore, computeStreak, todayKey } from '../store/useStore';
import { useT, MOODS } from '../i18n';
import { dietById } from '../data/diets';
import { stageAt } from '../data/fasting';
import { quoteOfDay } from '../data/quotes';
import { useNow } from '../lib/hooks';
import { buildProfile, buildInsights, generateMessage, timeOfDay } from '../lib/coach';
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
  const [loading, setLoading] = useState(false);
  const Chevron = lang === 'ar' ? ChevronLeft : ChevronRight;

  const diet = state.dietId ? dietById(state.dietId) : null;
  const streak = computeStreak(state.visits);
  const today = state.checkins[todayKey()] ?? { mood: null, water: 0 };
  const done = state.history.filter((h) => (h.end - h.start) / 3.6e6 >= h.goal * 0.95).length;
  const hours = Math.round(state.history.reduce((a, h) => a + (h.end - h.start) / 3.6e6, 0));
  const insights = buildInsights(buildProfile(state), lang);
  const latest = state.messages[0];

  const greeting = { morning: 'goodMorning', afternoon: 'goodAfternoon', evening: 'goodEvening', night: 'goodNight' }[timeOfDay()];
  const quote = quoteOfDay(theme);

  const elapsed = state.fastStart ? now - state.fastStart : 0;
  const fastHours = elapsed / 3.6e6;
  const pct = state.fastStart ? Math.min(1, fastHours / state.fastGoal) : 0;
  const stage = stageAt(fastHours);

  const newMessage = async () => {
    setLoading(true);
    try {
      state.addMessage(await generateMessage(useStore.getState()));
    } finally {
      setLoading(false);
    }
  };

  let i = 0;
  return (
    <div className="bento">
      <motion.section {...stagger(i++)} className="card hero span-2">
        <span className="badge">{theme === 'day' ? '☀️ ' + t('dayTheme') : '🌙 ' + t('nightTheme')}</span>
        <h1>
          {t(greeting)}{lang === 'ar' ? '،' : ','} <span className="grad-text">{state.name || t('friend')}</span>
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

      <motion.section {...stagger(i++)} className="card water">
        <div className="row-between">
          <span className="eyebrow">
            <Droplet size={14} /> {t('water')}
          </span>
          <span className="muted">
            {today.water}/8 {t('cups')}
          </span>
        </div>
        <div className="cups">
          {Array.from({ length: 8 }, (_, k) => (
            <motion.span key={k} className={k < today.water ? 'cup full' : 'cup'} animate={{ scale: k === today.water - 1 ? [1, 1.25, 1] : 1 }} />
          ))}
        </div>
        <div className="row-gap">
          <button className="icon-btn" onClick={() => state.checkin({ water: Math.max(0, today.water - 1) })} aria-label="-">
            <Minus size={18} />
          </button>
          <button className="btn primary grow" onClick={() => state.checkin({ water: Math.min(12, today.water + 1) })}>
            <Plus size={18} /> 💧
          </button>
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
        {latest && (
          <div className="message-bubble">
            <span className={`src-tag ${latest.source}`}>{latest.source === 'ai' ? t('aiSource') : t('localSource')}</span>
            <p>{latest.text}</p>
          </div>
        )}
        <button className="btn ghost" onClick={newMessage} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> {loading ? t('generating') : t('generate')}
        </button>
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
