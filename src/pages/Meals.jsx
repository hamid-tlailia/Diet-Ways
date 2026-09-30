import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, ImagePlus, RefreshCw, ChevronDown, Clock, ShieldAlert, Sparkles } from 'lucide-react';
import { useStore, todayKey } from '../store/useStore';
import { useT } from '../i18n';
import { Segmented, stagger, toast } from '../components/ui';
import { MEAL_TYPES } from '../lib/meals';
import Questionnaire from '../components/Questionnaire';
import { ensureTodayPlan, requestMealPlan, scanMeal } from '../lib/mealsApi';

function Macros({ p, c, f, fiber }) {
  const { t } = useT();
  const total = Math.max(1, p * 4 + c * 4 + f * 9);
  const rows = [
    ['protein', p, '#3b82f6', p * 4],
    ['carbs', c, '#f59e0b', c * 4],
    ['fat', f, '#ec4899', f * 9],
  ];
  return (
    <div className="macros">
      <div className="macro-bar">
        {rows.map(([k, , color, kcal]) => (
          <span key={k} style={{ width: `${(kcal / total) * 100}%`, background: color }} />
        ))}
      </div>
      <div className="macro-legend">
        {rows.map(([k, g, color]) => (
          <span key={k}>
            <i style={{ background: color }} /> {t(k)} <b className="num">{g} {t('g')}</b>
          </span>
        ))}
        {fiber > 0 && (
          <span>
            {t('fiber')} <b className="num">{fiber} {t('g')}</b>
          </span>
        )}
      </div>
    </div>
  );
}

function MealCard({ meal, i }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const type = MEAL_TYPES[meal.type];
  return (
    <motion.article {...stagger(i)} className={open ? 'meal-card open' : 'meal-card'}>
      <button className="meal-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="meal-emoji">{type.emoji}</span>
        <span className="meal-title">
          <small>
            {t(type)}
            {meal.time && (
              <>
                {' · '}
                <Clock size={11} /> <span className="mono">{meal.time}</span>
              </>
            )}
          </small>
          <strong>{meal.name}</strong>
        </span>
        <span className="meal-kcal num">
          {meal.calories}
          <small> {t('kcal')}</small>
        </span>
        <ChevronDown size={18} className="chev" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="meal-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <p>{meal.description}</p>
            {meal.ingredients.length > 0 && (
              <div className="pills">
                {meal.ingredients.map((x, k) => (
                  <span key={k} className="pill ok">
                    {x}
                  </span>
                ))}
              </div>
            )}
            <Macros p={meal.protein} c={meal.carbs} f={meal.fat} />
            {meal.why && (
              <div className="tip">
                <strong>💡 {t('whyThis')}</strong>
                <p>{meal.why}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function PlanView({ plan }) {
  const { t } = useT();
  return (
    <>
      <section className="card plan-total">
        <span className="eyebrow">{t('dayTotal')}</span>
        <div className="row-between">
          <strong className="big-kcal num">
            {plan.totals.calories} <small>{t('kcal')}</small>
          </strong>
        </div>
        <Macros p={plan.totals.protein} c={plan.totals.carbs} f={plan.totals.fat} />
        {plan.tip && <p className="muted small">💡 {plan.tip}</p>}
      </section>
      <div className="meal-list">
        {plan.meals.map((m, i) => (
          <MealCard key={i} meal={m} i={i} />
        ))}
      </div>
    </>
  );
}

function Today() {
  const { t } = useT();
  const day = todayKey();
  const plan = useStore((s) => s.mealPlans[day]);
  const setMealPlan = useStore((s) => s.setMealPlan);
  const [state, setState] = useState(plan ? 'ready' : 'loading');

  const load = (force = false) => {
    setState('loading');
    const p = force ? requestMealPlan(useStore.getState(), () => toast({ title: '⏳', body: t('aiRetrying'), duration: 3000 })).then((pl) => (setMealPlan(pl), pl)) : ensureTodayPlan(useStore.getState, setMealPlan);
    Promise.resolve(p)
      .then(() => setState('ready'))
      .catch((e) => {
        setState(useStore.getState().mealPlans[day] ? 'ready' : 'error');
        toast({ title: '⚠️', body: t({ rate: 'rateLimited', busy: 'aiBusy' }[e.message] ?? 'planFailed') });
      });
  };
  useEffect(() => {
    if (!plan) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'loading' && !plan)
    return (
      <section className="card center loading-card">
        <div className="orb small-orb">
          <Sparkles size={22} />
        </div>
        <p>{t('planLoading')}</p>
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton short" />
      </section>
    );
  if (!plan)
    return (
      <section className="card center">
        <p>{t('planFailed')}</p>
        <button className="btn primary" onClick={() => load()}>
          <RefreshCw size={16} /> {t('retry')}
        </button>
      </section>
    );
  return (
    <>
      <PlanView plan={plan} />
      <button className="btn ghost" onClick={() => load(true)} disabled={state === 'loading'}>
        <RefreshCw size={16} className={state === 'loading' ? 'spin' : ''} /> {state === 'loading' ? t('planLoading') : t('anotherPlan')}
      </button>
    </>
  );
}

function ScanResult({ scan }) {
  const { t } = useT();
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={`card scan-result fit-${scan.suitable}`}>
      <div className="scan-head">
        {scan.thumb && <img src={scan.thumb} alt="" />}
        <div>
          <span className="fit-badge">{t(`suitable_${scan.suitable}`)}</span>
          <h3>{scan.name}</h3>
          <strong className="big-kcal num">
            {scan.calories} <small>{t('kcal')}</small>
          </strong>
        </div>
      </div>
      <Macros p={scan.protein} c={scan.carbs} f={scan.fat} fiber={scan.fiber} />
      {scan.items.length > 0 && (
        <ul className="scan-items">
          {scan.items.map((x, k) => (
            <li key={k}>
              <span>{x.name}</span>
              <span className="muted num">
                {x.grams} {t('g')} · {x.calories} {t('kcal')}
              </span>
            </li>
          ))}
        </ul>
      )}
      {scan.verdict && <p className="lead">{scan.verdict}</p>}
      {scan.tips.length > 0 && (
        <div className="tip">
          <strong>💡 {t('tip')}</strong>
          <ul className="plain-list">
            {scan.tips.map((x, k) => (
              <li key={k}>{x}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.section>
  );
}

function Scan() {
  const { t } = useT();
  const addScan = useStore((s) => s.addScan);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const camera = useRef();
  const gallery = useRef();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setResult(null);
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const scan = await scanMeal(file, useStore.getState(), () => toast({ title: '⏳', body: t('aiRetrying'), duration: 3000 }));
      addScan(scan);
      setResult(scan);
    } catch (err) {
      toast({ title: '⚠️', body: t({ rate: 'rateLimited', busy: 'aiBusy' }[err.message] ?? 'scanFailed') });
    } finally {
      // The frame returns to the camera prompt; the result card below shows what was analysed.
      setPreview(null);
      setBusy(false);
    }
  };

  const shown = result;
  return (
    <>
      <section className="card scan-card">
        <div className={busy ? 'scan-frame busy' : 'scan-frame'}>
          {preview ? <img src={preview} alt="" /> : <Camera size={44} />}
          {busy && <span className="scan-line" />}
        </div>
        <h3>{busy ? t('analyzing') : t('scanTitle')}</h3>
        <p className="muted small">{t('scanSub')}</p>
        <div className="row-gap wrap center-row">
          <button className="btn primary" disabled={busy} onClick={() => camera.current.click()}>
            <Camera size={18} /> {t('takePhoto')}
          </button>
          <button className="btn ghost" disabled={busy} onClick={() => gallery.current.click()}>
            <ImagePlus size={18} /> {t('fromGallery')}
          </button>
        </div>
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
        <input ref={gallery} type="file" accept="image/*" hidden onChange={onFile} />
      </section>
      {shown && !busy && <ScanResult scan={shown} />}
    </>
  );
}

function History() {
  const { t, lang } = useT();
  const mealPlans = useStore((s) => s.mealPlans);
  const plans = Object.values(mealPlans).sort((a, b) => (a.date < b.date ? 1 : -1));
  const scans = useStore((s) => s.scans);
  const [open, setOpen] = useState(null);
  const fmtDay = (d) => new Date(`${d}T12:00`).toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { weekday: 'long', day: 'numeric', month: 'short' });
  const fmt = (ms) => new Date(ms).toLocaleString(lang === 'ar' ? 'ar' : 'en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <>
      <h3 className="section-title">{t('plans')}</h3>
      {plans.length === 0 && <p className="muted">{t('noPlans')}</p>}
      <div className="history-list">
        {plans.map((p) => (
          <section key={p.date} className="card hist-plan">
            <button className="meal-head" onClick={() => setOpen(open === p.date ? null : p.date)}>
              <span className="meal-emoji">📅</span>
              <span className="meal-title">
                <strong>{fmtDay(p.date)}</strong>
                <small>{p.meals.map((m) => m.name).join(' · ')}</small>
              </span>
              <span className="meal-kcal num">
                {p.totals.calories}
                <small> {t('kcal')}</small>
              </span>
            </button>
            {open === p.date && <PlanView plan={p} />}
          </section>
        ))}
      </div>
      <h3 className="section-title">{t('scans')}</h3>
      {scans.length === 0 && <p className="muted">{t('noScans')}</p>}
      <div className="history-list">
        {scans.map((s) => (
          <section key={s.id} className={`card hist-scan fit-${s.suitable}`}>
            <button className="meal-head" onClick={() => setOpen(open === s.id ? null : s.id)}>
              {s.thumb ? <img src={s.thumb} alt="" className="thumb" /> : <span className="meal-emoji">📷</span>}
              <span className="meal-title">
                <strong>{s.name}</strong>
                <small>
                  {fmt(s.at)} · {t(`suitable_${s.suitable}`)}
                </small>
              </span>
              <span className="meal-kcal num">
                {s.calories}
                <small> {t('kcal')}</small>
              </span>
            </button>
            {open === s.id && <ScanResult scan={s} />}
          </section>
        ))}
      </div>
    </>
  );
}

export default function Meals() {
  const { t } = useT();
  const profile = useStore((s) => s.mealProfile);
  const [tab, setTab] = useState('today');
  return (
    <div className="meals">
      <div className="page-head">
        <h2>{t('mealsTitle')}</h2>
        <p className="muted">{t('mealsSub')}</p>
      </div>
      {!profile?.done ? (
        <Questionnaire onSaved={() => toast({ title: '🍽️', body: t('planLoading') })} />
      ) : (
        <>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'today', label: t('today') },
              { value: 'scan', label: t('scan') },
              { value: 'history', label: t('history') },
            ]}
          />
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="meals-body">
            {tab === 'today' && <Today />}
            {tab === 'scan' && <Scan />}
            {tab === 'history' && <History />}
          </motion.div>
        </>
      )}
      <p className="muted small center disclaimer">
        <ShieldAlert size={13} /> {t('medical')}
      </p>
    </div>
  );
}
