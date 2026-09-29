import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useT, GOALS } from '../i18n';
import { DIETS } from '../data/diets';

export default function Onboarding() {
  const { t, lang } = useT();
  const set = useStore((s) => s.set);
  const complete = useStore((s) => s.completeOnboarding);
  const track = useStore((s) => s.track);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('lose');
  const [dietId, setDietId] = useState('fasting');

  const finish = () => {
    track('diets', dietId, 3);
    complete({ name: name.trim(), goal, dietId });
  };

  const steps = [
    <div key="0" className="ob-step">
      <motion.img src="/favicon.svg" alt="" width="84" height="84" className="ob-logo" animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }} />
      <h1 className="grad-text">{t('welcome')}</h1>
      <p className="muted">{t('welcomeSub')}</p>
      <div className="row-gap center-row">
        <button className={lang === 'ar' ? 'chip on' : 'chip'} onClick={() => set({ lang: 'ar' })}>
          العربية
        </button>
        <button className={lang === 'en' ? 'chip on' : 'chip'} onClick={() => set({ lang: 'en' })}>
          English
        </button>
      </div>
      <label className="field">
        <span>{t('whatName')}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
    </div>,
    <div key="1" className="ob-step">
      <h2>{t('whatGoal')}</h2>
      <div className="goal-grid">
        {GOALS.map((g) => (
          <button key={g.id} className={goal === g.id ? 'goal-btn big on' : 'goal-btn big'} onClick={() => setGoal(g.id)}>
            <span className="goal-emoji">{g.emoji}</span>
            {t(g)}
          </button>
        ))}
      </div>
    </div>,
    <div key="2" className="ob-step">
      <h2>{t('pickDiet')}</h2>
      <div className="ob-diets">
        {DIETS.map((d) => (
          <button key={d.id} className={dietId === d.id ? 'ob-diet on' : 'ob-diet'} style={{ '--g1': d.gradient[0], '--g2': d.gradient[1] }} onClick={() => setDietId(d.id)}>
            <span className="diet-emoji">{d.emoji}</span>
            <span>
              <strong>{t(d.name)}</strong>
              <small>{t(d.tagline)}</small>
            </span>
          </button>
        ))}
      </div>
    </div>,
  ];

  return (
    <div className="onboarding">
      <div className="card glass ob-card">
        <div className="ob-progress">
          {steps.map((_, k) => (
            <span key={k} className={k <= step ? 'on' : ''} />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
            {steps[step]}
          </motion.div>
        </AnimatePresence>
        <div className="row-between">
          {step > 0 ? (
            <button className="btn ghost" onClick={() => setStep(step - 1)}>
              {t('back')}
            </button>
          ) : (
            <button className="btn ghost" onClick={finish}>
              {t('skip')}
            </button>
          )}
          <button className="btn primary" onClick={() => (step < steps.length - 1 ? setStep(step + 1) : finish())}>
            {step < steps.length - 1 ? t('next') : t('letsGo')}
          </button>
        </div>
      </div>
    </div>
  );
}
