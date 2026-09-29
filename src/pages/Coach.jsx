import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Bot, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useT, GOALS } from '../i18n';
import { dietById, DIETS } from '../data/diets';
import { STAGES } from '../data/fasting';
import { buildProfile, buildInsights, generateMessage } from '../lib/coach';
import { stagger } from '../components/ui';

const SECTION_LABEL = { overview: 'overview', method: 'method', foods: 'foods', exercises: 'exercises' };

export default function Coach() {
  const { t, lang } = useT();
  const state = useStore();
  const [loading, setLoading] = useState(false);
  const profile = buildProfile(state);
  const insights = buildInsights(profile, lang);

  // Normalised interest bars across diets, stages and sections.
  const bars = [
    ...Object.entries(state.interests.diets).map(([k, v]) => ({ label: t(dietById(k).name), v, color: dietById(k).gradient[0] })),
    ...Object.entries(state.interests.stages).map(([k, v]) => {
      const s = STAGES.find((x) => x.id === k);
      return { label: t(s?.name), v, color: s?.color };
    }),
    ...Object.entries(state.interests.sections).map(([k, v]) => ({ label: t(SECTION_LABEL[k] ?? k), v, color: 'var(--accent)' })),
  ]
    .sort((a, b) => b.v - a.v)
    .slice(0, 6);
  const max = Math.max(1, ...bars.map((b) => b.v));

  const generate = async () => {
    setLoading(true);
    try {
      state.addMessage(await generateMessage(useStore.getState()));
    } finally {
      setLoading(false);
    }
  };

  const fmt = (ms) => new Date(ms).toLocaleString(lang === 'ar' ? 'ar' : 'en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const goal = GOALS.find((g) => g.id === state.goal);
  const diet = DIETS.find((d) => d.id === profile.dietId);

  return (
    <div className="coach">
      <motion.section {...stagger(0)} className="card coach-hero">
        <div className="orb" aria-hidden="true">
          <Bot size={30} />
        </div>
        <div>
          <h2>{t('coachTitle')}</h2>
          <p className="muted">{t('coachSub')}</p>
          <div className="row-gap wrap">
            <span className="chip">
              {goal?.emoji} {t(goal)}
            </span>
            {diet && (
              <span className="chip">
                {diet.emoji} {t(diet.name)}
              </span>
            )}
            <span className="chip">🔥 {profile.streak}</span>
          </div>
        </div>
      </motion.section>

      <motion.section {...stagger(1)} className="card">
        <h3>
          <Sparkles size={18} /> {t('insightTitle')}
        </h3>
        <ul className="insights">
          {insights.map((x, k) => (
            <li key={k}>
              <span>{x.icon}</span>
              {x.text}
            </li>
          ))}
        </ul>
      </motion.section>

      <motion.section {...stagger(2)} className="card">
        <h3>{t('yourInterests')}</h3>
        {bars.length === 0 ? (
          <p className="muted">{t('noInterests')}</p>
        ) : (
          <div className="bars">
            {bars.map((b, k) => (
              <div key={k} className="bar-row">
                <span className="bar-label">{b.label}</span>
                <div className="bar">
                  <motion.span initial={{ width: 0 }} animate={{ width: `${(b.v / max) * 100}%` }} transition={{ duration: 0.8, delay: k * 0.05 }} style={{ background: b.color }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      <motion.section {...stagger(3)} className="card">
        <div className="row-between">
          <h3>{t('messages')}</h3>
          <button className="btn primary" onClick={generate} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> {loading ? t('generating') : t('generate')}
          </button>
        </div>
        {state.messages.length === 0 ? (
          <p className="muted">{t('noMessages')}</p>
        ) : (
          <div className="feed">
            {state.messages.slice(0, 20).map((m) => (
              <motion.div key={m.id} layout initial={{ opacity: 0, x: lang === 'ar' ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} className="message-bubble">
                <div className="row-between">
                  <span className={`src-tag ${m.source}`}>{m.source === 'ai' ? t('aiSource') : t('localSource')}</span>
                  <small className="muted">{fmt(m.at)}</small>
                </div>
                <p>{m.text}</p>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>
    </div>
  );
}
