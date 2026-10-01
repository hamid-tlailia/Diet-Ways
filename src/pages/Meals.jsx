import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, ImagePlus, RefreshCw, ChevronDown, Clock, ShieldAlert, Sparkles, Pencil, Undo2, Trash2, Plus, Check } from 'lucide-react';
import { useStore, todayKey } from '../store/useStore';
import { useT } from '../i18n';
import { Segmented, Sheet, stagger, toast } from '../components/ui';
import { MEAL_TYPES } from '../lib/meals';
import Questionnaire from '../components/Questionnaire';
import MealEditor from '../components/MealEditor';
import { ensureTodayPlan, requestMealPlan, requestShoppingList, scanMeal } from '../lib/mealsApi';

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

function MealCard({ meal, i, eaten, onEaten, onEdit, onUndo }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const type = MEAL_TYPES[meal.type] ?? MEAL_TYPES.snack;
  return (
    <motion.article {...stagger(i)} className={`meal-card${open ? ' open' : ''}${eaten ? ' eaten' : ''}${meal.logged ? ' logged' : ''}`}>
      {/* Today's meals can be logged as eaten; logged meals count towards the active day. What the user
          actually ate (scanned or typed) stays eaten — it's removed or reverted from its body instead. */}
      {onEaten && (
        <motion.button whileTap={{ scale: 0.9 }} className={eaten ? 'eat-btn on' : 'eat-btn'} onClick={meal.logged ? () => setOpen(true) : onEaten} aria-pressed={!!eaten}>
          {eaten ? t('eaten') : t('ateIt')}
        </motion.button>
      )}
      <button className="meal-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        {meal.thumb ? <img className="meal-thumb" src={meal.thumb} alt="" /> : <span className="meal-emoji">{type.emoji}</span>}
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
          {meal.logged && (
            <small className="replaced">
              <span className="logged-tag">
                {meal.source === 'scan' ? t('loggedScan') : t('loggedByYou')}
                {meal.extra ? ` · ${t('extraMeal')}` : ''}
              </span>
              {meal.replaced && (
                <>
                  {' '}
                  {t('insteadOf')}: <s>{meal.replaced.name}</s>
                </>
              )}
            </small>
          )}
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
            {meal.description && <p>{meal.description}</p>}
            {meal.items?.length > 0 ? (
              <ul className="scan-items">
                {meal.items.map((x, k) => (
                  <li key={k}>
                    <span>{x.name}</span>
                    <span className="muted num">
                      {x.grams ? `${x.grams} ${t('g')} · ` : ''}
                      {x.calories} {t('kcal')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              meal.ingredients?.length > 0 && (
                <div className="pills">
                  {meal.ingredients.map((x, k) => (
                    <span key={k} className="pill ok">
                      {x}
                    </span>
                  ))}
                </div>
              )
            )}
            <Macros p={meal.protein} c={meal.carbs} f={meal.fat} />
            {meal.why && (
              <div className="tip">
                <strong>💡 {t('whyThis')}</strong>
                <p>{meal.why}</p>
              </div>
            )}
            {(onEdit || onUndo) && (
              <div className="row-gap wrap meal-actions">
                {onEdit && (
                  <button className="chip" onClick={onEdit}>
                    <Pencil size={14} /> {meal.logged ? t('editMeal') : t('logOther')}
                  </button>
                )}
                {onUndo && meal.logged && (
                  <button className="chip" onClick={onUndo}>
                    {meal.replaced ? <Undo2 size={14} /> : <Trash2 size={14} />} {meal.replaced ? t('restoreSuggested') : t('removeMeal')}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

// Toast after logging: tells the user which suggestion was cancelled automatically.
function announceLogged(out, t) {
  if (!out) return;
  toast({ title: out.cancelled ? `✓ ${t('mealReplaced')}` : `✓ ${t('mealExtra')}`, body: out.cancelled ? `${t('insteadOf')}: ${out.cancelled.name}` : undefined, duration: 4000 });
}

function PlanView({ plan, loggable = false }) {
  const { t } = useT();
  const eatenList = useStore((s) => (loggable ? s.checkins[plan.date]?.meals : null));
  const toggleMealEaten = useStore((s) => s.toggleMealEaten);
  const logMeal = useStore((s) => s.logMeal);
  const editTodayMeal = useStore((s) => s.editTodayMeal);
  const unlogTodayMeal = useStore((s) => s.unlogTodayMeal);
  const [editing, setEditing] = useState(null); // meal index, 'new' or null
  const eaten = new Set(eatenList ?? []);
  const eatenKcal = plan.meals.reduce((a, m, i) => a + (eaten.has(i) ? m.calories : 0), 0);
  const target = plan.target || plan.totals.calories;
  const diff = target - eatenKcal;

  const editor = (idx) => (
    <MealEditor
      key={`ed-${idx}`}
      inSheet
      meal={idx === 'new' ? {} : plan.meals[idx]}
      extra={idx === 'new' ? { source: 'manual' } : { source: plan.meals[idx].source ?? 'manual', thumb: plan.meals[idx].thumb, description: plan.meals[idx].logged ? plan.meals[idx].description : '', ingredients: plan.meals[idx].ingredients }}
      title={idx === 'new' || !plan.meals[idx].logged ? t('logTitle') : t('editTitle')}
      saveLabel={idx !== 'new' && plan.meals[idx].logged ? t('saveEdit') : t('saveMeal')}
      onCancel={() => setEditing(null)}
      onSave={(meal) => {
        if (idx === 'new') announceLogged(logMeal(meal), t);
        else editTodayMeal(idx, meal);
        setEditing(null);
      }}
    />
  );

  return (
    <>
      <section className="card plan-total">
        <span className="eyebrow">{t('dayTotal')}</span>
        <strong className="big-kcal num">
          {plan.totals.calories} <small>{t('kcal')}</small>
        </strong>
        {/* What was really eaten, against the day's planned calories. */}
        {loggable && eaten.size > 0 && (
          <div className={diff < 0 ? 'budget over' : 'budget'}>
            <span>
              {t('eatenOf')} <b className="num">{eatenKcal}</b>
            </span>
            <span>
              {diff < 0 ? t('overBudget') : t('leftBudget')} <b className="num">{Math.abs(diff)}</b> {t('kcal')}
            </span>
          </div>
        )}
        <Macros p={plan.totals.protein} c={plan.totals.carbs} f={plan.totals.fat} />
        {plan.tip && <p className="muted small">💡 {plan.tip}</p>}
      </section>
      <div className="meal-list">
        {plan.meals.map((m, i) => (
          <MealCard
            key={`${i}-${m.name}`}
            meal={m}
            i={i}
            eaten={eaten.has(i)}
            onEaten={loggable ? () => toggleMealEaten(i) : null}
            onEdit={loggable ? () => setEditing(i) : null}
            onUndo={loggable ? () => unlogTodayMeal(i) : null}
          />
        ))}
      </div>
      {loggable && (
        <button className="btn ghost" onClick={() => setEditing('new')}>
          <Plus size={16} /> {t('logOther')}
        </button>
      )}
      {/* Logging something else / editing a meal happens in a modal sheet. */}
      <Sheet open={editing !== null && (editing === 'new' || !!plan.meals[editing])} onClose={() => setEditing(null)}>
        {editing !== null && (editing === 'new' || plan.meals[editing]) && editor(editing)}
      </Sheet>
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
      <PlanView plan={plan} loggable={plan.date === todayKey()} />
      <button className="btn ghost" onClick={() => load(true)} disabled={state === 'loading'}>
        <RefreshCw size={16} className={state === 'loading' ? 'spin' : ''} /> {state === 'loading' ? t('planLoading') : t('anotherPlan')}
      </button>
    </>
  );
}

function ScanResult({ scan, children }) {
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
      {children}
    </motion.section>
  );
}

function Scan() {
  const { t } = useT();
  const addScan = useStore((s) => s.addScan);
  const logMeal = useStore((s) => s.logMeal);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(null); // null | 'edit' | 'added'
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const camera = useRef();
  const gallery = useRef();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setResult(null);
    setMode(null);
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
      {shown && !busy && (
        <ScanResult scan={shown}>
          {/* The scanned meal can be corrected, then logged as eaten — replacing today's matching suggestion. */}
          {mode === 'added' ? (
            <p className="added-note">
              <Check size={16} /> {t('addedToday')}
            </p>
          ) : (
            <div className="row-gap wrap">
              <button className="btn primary grow" onClick={() => setMode('edit')}>
                <Plus size={16} /> {t('addToToday')}
              </button>
            </div>
          )}
        </ScanResult>
      )}
      <Sheet open={!!shown && !busy && mode === 'edit'} onClose={() => setMode(null)}>
        {shown && (
          <MealEditor
            inSheet
            meal={shown}
            extra={{ source: 'scan', thumb: shown.thumb, description: shown.verdict }}
            onCancel={() => setMode(null)}
            onSave={(meal) => {
              announceLogged(logMeal(meal), t);
              setMode('added');
            }}
          />
        )}
      </Sheet>
    </>
  );
}

// Weekly grocery list built from the user's plans; refreshed automatically once a week.
function Shopping() {
  const { t } = useT();
  const list = useStore((s) => s.shopping);
  const set = useStore((s) => s.set);
  const toggle = useStore((s) => s.toggleShopping);
  const [busy, setBusy] = useState(false);
  const stale = !list || Date.now() - list.at > 7 * 864e5;

  const make = async () => {
    setBusy(true);
    try {
      set({ shopping: await requestShoppingList(useStore.getState(), () => toast({ title: '⏳', body: t('aiRetrying'), duration: 3000 })) });
    } catch (e) {
      toast({ title: '⚠️', body: t({ rate: 'rateLimited', busy: 'aiBusy' }[e.message] ?? 'shopFailed') });
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (stale) make();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const share = async () => {
    const text = list.groups.map((g) => `${g.emoji} ${g.name}\n${g.items.map((i) => `${i.done ? '✓' : '•'} ${i.name}${i.qty ? ` — ${i.qty}` : ''}`).join('\n')}`).join('\n\n');
    try {
      if (navigator.share) await navigator.share({ title: t('shopTitle'), text });
      else {
        await navigator.clipboard.writeText(text);
        toast({ title: '✓', body: t('copied') });
      }
    } catch {
      /* user closed the share sheet */
    }
  };

  if (busy && !list)
    return (
      <section className="card center loading-card">
        <div className="orb small-orb">🛒</div>
        <p>{t('shopLoading')}</p>
        <div className="skeleton" />
        <div className="skeleton" />
      </section>
    );
  if (!list)
    return (
      <section className="card center">
        <p>{t('shopFailed')}</p>
        <button className="btn primary" onClick={make}>
          <RefreshCw size={16} /> {t('retry')}
        </button>
      </section>
    );

  const all = list.groups.flatMap((g) => g.items);
  const done = all.filter((i) => i.done).length;
  return (
    <>
      <section className="card shop-head">
        <div className="row-between">
          <strong>
            🛒 {t('shopTitle')}
          </strong>
          <span className="num muted">
            {done}/{all.length}
          </span>
        </div>
        <div className="bar">
          <motion.span animate={{ width: `${(done / all.length) * 100}%` }} style={{ background: 'var(--accent)' }} />
        </div>
        {list.tip && <p className="muted small">💡 {list.tip}</p>}
        <div className="row-gap">
          <button className="btn ghost grow" onClick={share}>
            {t('shareList')}
          </button>
          <button className="btn ghost grow" onClick={make} disabled={busy}>
            <RefreshCw size={16} className={busy ? 'spin' : ''} /> {t('newList')}
          </button>
        </div>
      </section>
      {list.groups.map((g, gi) => (
        <section key={gi} className="card shop-group">
          <h3>
            <span>{g.emoji}</span> {g.name}
          </h3>
          <ul>
            {g.items.map((it, ii) => (
              <li key={ii}>
                <button className={it.done ? 'shop-item done' : 'shop-item'} onClick={() => toggle(gi, ii)} aria-pressed={it.done}>
                  <span className="shop-check">{it.done ? '✓' : ''}</span>
                  <span className="shop-name">{it.name}</span>
                  {it.qty && <small className="muted">{it.qty}</small>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
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

const MEAL_TABS = ['today', 'scan', 'shop', 'history'];

// `initialTab` comes from the URL (#meals/scan), e.g. the "scan a meal" home-screen shortcut.
export default function Meals({ initialTab }) {
  const { t } = useT();
  const profile = useStore((s) => s.mealProfile);
  const [tab, setTab] = useState(MEAL_TABS.includes(initialTab) ? initialTab : 'today');
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
              { value: 'shop', label: t('shopTab') },
              { value: 'history', label: t('history') },
            ]}
          />
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="meals-body">
            {tab === 'today' && <Today />}
            {tab === 'scan' && <Scan />}
            {tab === 'shop' && <Shopping />}
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
