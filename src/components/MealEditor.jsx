import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Sparkles, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';
import { MEAL_TYPES, guessMealType } from '../lib/meals';
import { estimateMeal } from '../lib/mealsApi';
import { toast } from './ui';

const MACROS = ['protein', 'carbs', 'fat', 'fiber'];
const n = (v) => Math.max(0, Math.round(Number(v) || 0));

// Keeps each item's calories-per-gram so changing a portion rescales its calories.
const withRates = (items = []) => items.map((x) => ({ ...x, kpg: x.grams > 0 ? x.calories / x.grams : null }));

function fromMeal(m = {}) {
  const items = withRates(m.items ?? (m.ingredients ?? []).map((name) => ({ name, grams: 0, calories: 0 })));
  return {
    type: MEAL_TYPES[m.type] ? m.type : guessMealType(),
    name: m.name ?? '',
    items: items.some((x) => x.calories > 0) ? items : [],
    calories: n(m.calories),
    base: { calories: n(m.calories), protein: n(m.protein), carbs: n(m.carbs), fat: n(m.fat), fiber: n(m.fiber) },
  };
}

// The meal as saved: macros follow the calories the user ended up with, proportionally to the analysis.
function toMeal(d, extra) {
  const k = d.base.calories > 0 ? d.calories / d.base.calories : 0;
  const macros = Object.fromEntries(MACROS.map((m) => [m, Math.round(d.base[m] * k)]));
  const items = d.items.filter((x) => x.name.trim()).map(({ kpg, ...x }) => x);
  return {
    ...extra,
    type: d.type,
    name: d.name.trim() || items.map((x) => x.name).join('، '),
    time: new Date().toTimeString().slice(0, 5),
    items,
    ingredients: items.length ? items.map((x) => x.name) : extra.ingredients ?? [],
    calories: d.calories,
    ...macros,
  };
}

/** Edit a scanned, suggested or brand-new meal, then save it as eaten. `extra` carries fields like thumb/source. */
export default function MealEditor({ meal, extra = {}, title, saveLabel, onSave, onCancel }) {
  const { t } = useT();
  const [d, setD] = useState(() => fromMeal(meal));
  const [busy, setBusy] = useState(false);

  const setItems = (items) => setD((x) => ({ ...x, items, calories: items.length ? items.reduce((a, i) => a + n(i.calories), 0) : x.calories }));
  const patchItem = (k, patch) =>
    setItems(
      d.items.map((x, j) => {
        if (j !== k) return x;
        const next = { ...x, ...patch };
        // A new portion rescales that item's calories; typing calories directly resets the rate.
        if ('grams' in patch && x.kpg != null) next.calories = n(next.grams * x.kpg);
        if ('calories' in patch) next.kpg = next.grams > 0 ? n(next.calories) / next.grams : null;
        return next;
      }),
    );

  const estimate = async () => {
    const text = [d.name, ...d.items.filter((x) => x.name.trim()).map((x) => `- ${x.name}${x.grams ? ` ${x.grams} g` : ''}`)].filter(Boolean).join('\n');
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await estimateMeal(text, useStore.getState(), () => toast({ title: '⏳', body: t('aiRetrying'), duration: 3000 }));
      setD((x) => ({ ...fromMeal({ ...r, type: x.type }), name: x.name.trim() || r.name }));
    } catch {
      toast({ title: '⚠️', body: t('estimateFailed') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card meal-editor">
      <div className="row-between">
        <h3>{title ?? t('editTitle')}</h3>
        <button className="icon-btn" onClick={onCancel} aria-label={t('cancel')}>
          <X size={18} />
        </button>
      </div>

      <span className="field-label">{t('mealTypeLbl')}</span>
      <div className="day-chips">
        {Object.entries(MEAL_TYPES).map(([id, m]) => (
          <button key={id} className={d.type === id ? 'chip on' : 'chip'} onClick={() => setD({ ...d, type: id })}>
            {m.emoji} {t(m)}
          </button>
        ))}
      </div>

      <label className="field-label" htmlFor="me-name">
        {t('mealNameLbl')}
      </label>
      <input id="me-name" value={d.name} placeholder={t('mealNamePh')} onChange={(e) => setD({ ...d, name: e.target.value })} />

      <span className="field-label">{t('itemsLbl')}</span>
      <div className="me-items">
        {d.items.map((x, k) => (
          <div key={k} className="me-item">
            <input className="grow" value={x.name} placeholder={t('itemPh')} onChange={(e) => patchItem(k, { name: e.target.value })} />
            <label className="me-num">
              <input type="number" inputMode="numeric" min="0" value={x.grams || ''} onChange={(e) => patchItem(k, { grams: n(e.target.value) })} />
              <small>{t('g')}</small>
            </label>
            <label className="me-num">
              <input type="number" inputMode="numeric" min="0" value={x.calories || ''} onChange={(e) => patchItem(k, { calories: n(e.target.value) })} />
              <small>{t('kcal')}</small>
            </label>
            <button className="icon-btn sm" onClick={() => setItems(d.items.filter((_, j) => j !== k))} aria-label={t('removeMeal')}>
              <X size={14} />
            </button>
          </div>
        ))}
        <button className="chip" onClick={() => setItems([...d.items, { name: '', grams: 0, calories: 0, kpg: null }])}>
          <Plus size={14} /> {t('addItem')}
        </button>
      </div>

      <div className="me-total">
        <label className="me-num big">
          <input type="number" inputMode="numeric" min="0" value={d.calories || ''} disabled={d.items.length > 0} onChange={(e) => setD({ ...d, calories: n(e.target.value) })} />
          <small>{t('kcal')}</small>
        </label>
        <button className="btn ghost" onClick={estimate} disabled={busy || !(d.name.trim() || d.items.some((x) => x.name.trim()))}>
          <Sparkles size={16} className={busy ? 'spin' : ''} /> {busy ? t('estimating') : t('aiEstimate')}
        </button>
      </div>

      <div className="row-gap">
        <button className="btn primary grow" disabled={busy || !(d.name.trim() || d.items.length) || !d.calories} onClick={() => onSave(toMeal(d, extra))}>
          {saveLabel ?? t('saveMeal')}
        </button>
        <button className="btn ghost" onClick={onCancel}>
          {t('cancel')}
        </button>
      </div>
    </motion.section>
  );
}
