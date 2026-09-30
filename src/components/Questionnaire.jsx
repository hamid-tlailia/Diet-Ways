import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';
import { GENDERS, ACTIVITY, WORK, CONDITIONS, ALLERGIES, FOODS } from '../lib/meals';

function Chips({ options, value = [], onChange, single = false }) {
  const { t } = useT();
  const toggle = (id) => onChange(single ? id : value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const isOn = (id) => (single ? value === id : value.includes(id));
  return (
    <div className="chips-wrap">
      {options.map((o) => (
        <button type="button" key={o.id} className={isOn(o.id) ? 'chip on' : 'chip'} onClick={() => toggle(o.id)}>
          {o.emoji && <span>{o.emoji}</span>}
          {t(o)}
        </button>
      ))}
    </div>
  );
}

// Nutrition questionnaire: shown during onboarding, on the Meals tab until done, and in Settings to edit.
export default function Questionnaire({ onSaved, onSkip }) {
  const { t } = useT();
  const saved = useStore((s) => s.mealProfile);
  const set = useStore((s) => s.set);
  const [f, setF] = useState(() => ({ conditions: [], allergies: [], likes: [], ...saved }));
  const [step, setStep] = useState(0);
  const up = (patch) => setF((x) => ({ ...x, ...patch }));
  const steps = ['qBody', 'qLife', 'qHealth', 'qTaste'];

  const finish = () => {
    set({ mealProfile: { ...f, done: true } });
    onSaved?.();
  };

  return (
    <section className="card questionnaire">
      <h2>{t('qTitle')}</h2>
      <p className="muted small">{t('qSub')}</p>
      <div className="ob-progress">
        {steps.map((k, i) => (
          <span key={k} className={i <= step ? 'on' : ''} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }} className="q-step">
          <h3>{t(steps[step])}</h3>
          {step === 0 && (
            <>
              <div className="grid-2">
                <label className="field">
                  <span>{t('age')}</span>
                  <input type="number" inputMode="numeric" min="10" max="100" value={f.age ?? ''} onChange={(e) => up({ age: e.target.value })} />
                </label>
                <div className="field">
                  <span>{t('gender')}</span>
                  <Chips single options={GENDERS} value={f.gender} onChange={(gender) => up({ gender })} />
                </div>
                <label className="field">
                  <span>{t('height')}</span>
                  <input type="number" inputMode="numeric" min="100" max="230" value={f.height ?? ''} onChange={(e) => up({ height: e.target.value })} />
                </label>
                <label className="field">
                  <span>{t('weight')}</span>
                  <input type="number" inputMode="decimal" min="30" max="250" value={f.weight ?? ''} onChange={(e) => up({ weight: e.target.value })} />
                </label>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <span className="field-label">{t('activity')}</span>
              <Chips single options={ACTIVITY} value={f.activity} onChange={(activity) => up({ activity })} />
              <span className="field-label">{t('work')}</span>
              <Chips single options={WORK} value={f.work} onChange={(work) => up({ work })} />
              <label className="field">
                <span>{t('sport')}</span>
                <input value={f.sport ?? ''} onChange={(e) => up({ sport: e.target.value })} maxLength={80} />
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <span className="field-label">{t('conditions')}</span>
              <Chips options={CONDITIONS} value={f.conditions} onChange={(conditions) => up({ conditions })} />
              <input placeholder={t('other')} value={f.conditionsOther ?? ''} onChange={(e) => up({ conditionsOther: e.target.value })} maxLength={120} />
              <span className="field-label">{t('allergies')}</span>
              <Chips options={ALLERGIES} value={f.allergies} onChange={(allergies) => up({ allergies })} />
              <input placeholder={t('other')} value={f.allergiesOther ?? ''} onChange={(e) => up({ allergiesOther: e.target.value })} maxLength={120} />
            </>
          )}
          {step === 3 && (
            <>
              <span className="field-label">{t('likes')}</span>
              <Chips options={FOODS} value={f.likes} onChange={(likes) => up({ likes })} />
              <input placeholder={t('other')} value={f.likesOther ?? ''} onChange={(e) => up({ likesOther: e.target.value })} maxLength={120} />
              <label className="field">
                <span>{t('dislikes')}</span>
                <input value={f.dislikes ?? ''} onChange={(e) => up({ dislikes: e.target.value })} maxLength={120} />
              </label>
            </>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="row-between">
        {step === 0 && onSkip ? (
          <button className="btn ghost" onClick={onSkip}>
            {t('skip')}
          </button>
        ) : (
          <button className="btn ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
            {t('back')}
          </button>
        )}
        {step < steps.length - 1 ? (
          <button className="btn primary" onClick={() => setStep(step + 1)}>
            {t('next')}
          </button>
        ) : (
          <button className="btn primary" onClick={finish}>
            <Sparkles size={16} /> {t('save')}
          </button>
        )}
      </div>
    </section>
  );
}
