import { useState } from 'react';
import { motion } from 'framer-motion';
import { Scale, TrendingDown, TrendingUp, Minus as Flat } from 'lucide-react';
import { useStore, todayKey } from '../store/useStore';
import { useT } from '../i18n';
import { weeklyStats } from '../lib/progress';

const W = 320;
const H = 150;
const PAD = { l: 34, r: 12, t: 14, b: 24 };

// Single-series weight line: 2px line, 8px markers, recessive grid, tap a point for its value.
function WeightChart({ points, lang }) {
  const [sel, setSel] = useState(points.length - 1);
  const kgs = points.map((p) => p.kg);
  const lo = Math.floor(Math.min(...kgs) - 1);
  const hi = Math.ceil(Math.max(...kgs) + 1);
  const x = (i) => PAD.l + (points.length === 1 ? (W - PAD.l - PAD.r) / 2 : (i / (points.length - 1)) * (W - PAD.l - PAD.r));
  const y = (kg) => PAD.t + (1 - (kg - lo) / (hi - lo || 1)) * (H - PAD.t - PAD.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ');
  const ticks = [lo, (lo + hi) / 2, hi];
  const fmt = (d) => new Date(`${d}T12:00`).toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { day: 'numeric', month: 'short' });
  const s = points[sel];

  return (
    // Time runs left→right in both languages, as on any chart axis.
    <div className="weight-chart" dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="weight">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="wc-grid" />
            <text x={PAD.l - 6} y={y(v) + 4} className="wc-axis" textAnchor="end">
              {Number.isInteger(v) ? v : v.toFixed(1)}
            </text>
          </g>
        ))}
        <text x={PAD.l} y={H - 6} className="wc-axis">
          {fmt(points[0].date)}
        </text>
        {points.length > 1 && (
          <text x={W - PAD.r} y={H - 6} className="wc-axis" textAnchor="end">
            {fmt(points.at(-1).date)}
          </text>
        )}
        <motion.path d={path} className="wc-line" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
        {s && <line x1={x(sel)} x2={x(sel)} y1={PAD.t} y2={H - PAD.b} className="wc-cross" />}
        {points.map((p, i) => (
          <g key={p.date} onClick={() => setSel(i)} className="wc-hit">
            <circle cx={x(i)} cy={y(p.kg)} r="14" fill="transparent" />
            <circle cx={x(i)} cy={y(p.kg)} r={i === sel ? 5.5 : 4} className={i === sel ? 'wc-dot on' : 'wc-dot'} />
          </g>
        ))}
      </svg>
      {/* The value bubble is clamped so it never spills past the card edge at the first/last point. */}
      {s && (
        <div className="wc-tip" style={{ left: `${Math.min(80, Math.max(20, (x(sel) / W) * 100))}%` }}>
          <strong>{s.kg} kg</strong>
          <small>{fmt(s.date)}</small>
        </div>
      )}
    </div>
  );
}

export function WeightCard() {
  const { t, lang } = useT();
  const weights = useStore((s) => s.weights);
  const logWeight = useStore((s) => s.logWeight);
  const weighDay = useStore((s) => s.weighDay);
  const set = useStore((s) => s.set);
  const loggedToday = weights.at(-1)?.date === todayKey();
  const dayName = (d) => new Date(2026, 0, 4 + d).toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { weekday: 'long' }); // 2026-01-04 is a Sunday
  const nextWeigh = (() => {
    if (weighDay == null) return null;
    const n = new Date();
    const diff = (weighDay - n.getDay() + 7) % 7;
    if (diff === 0 && !loggedToday) return t('weighToday');
    const next = new Date(n.getTime() + (diff || 7) * 864e5);
    return `${dayName(weighDay)} ${next.toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { day: 'numeric', month: 'short' })}`;
  })();
  const [kg, setKg] = useState('');
  const current = weights.at(-1)?.kg;
  const change = weights.length >= 2 ? +(weights.at(-1).kg - weights[0].kg).toFixed(1) : null;
  const Trend = change == null || change === 0 ? Flat : change < 0 ? TrendingDown : TrendingUp;

  const save = () => {
    const v = parseFloat(String(kg).replace(',', '.'));
    if (!(v >= 30 && v <= 300)) return;
    logWeight(Math.round(v * 10) / 10);
    setKg('');
  };

  return (
    <>
      <h3>
        <Scale size={18} /> {t('weightTitle')}
      </h3>
      {current != null && (
        <div className="weight-hero">
          <strong className="num">
            {current} <small>{t('kg')}</small>
          </strong>
          {change != null && (
            <span className={change < 0 ? 'weight-delta down' : 'weight-delta'}>
              <Trend size={16} /> {change > 0 ? '+' : ''}
              {change} {t('kg')} {t('sinceStart')}
            </span>
          )}
        </div>
      )}
      {weights.length >= 2 ? <WeightChart points={weights.slice(-12)} lang={lang} /> : <p className="muted small">{t('weightHint')}</p>}
      {/* Weekly weigh-in: one fixed day, reminded that morning. */}
      <div className="weigh-plan">
        {nextWeigh && (
          <p className={nextWeigh === t('weighToday') ? 'weigh-next due' : 'weigh-next'}>
            📅 {loggedToday ? t('weighedToday') : `${t('nextWeigh')}: ${nextWeigh}`}
          </p>
        )}
        <span className="field-label">{t('weighDay')}</span>
        <div className="day-chips">
          {[6, 0, 1, 2, 3, 4, 5].map((d) => (
            <button key={d} className={weighDay === d ? 'chip on' : 'chip'} onClick={() => set({ weighDay: d })}>
              {new Date(2026, 0, 4 + d).toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { weekday: 'short' })}
            </button>
          ))}
        </div>
        <p className="muted small">{t('weighTip')}</p>
      </div>
      <div className="row-gap">
        <input type="number" inputMode="decimal" step="0.1" min="30" max="300" placeholder={t('weightPlaceholder')} value={kg} onChange={(e) => setKg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} className="grow" />
        <button className="btn primary" onClick={save} disabled={!kg}>
          {t('logWeight')}
        </button>
      </div>
    </>
  );
}

const MOOD_EMOJI = (v) => (v == null ? '—' : v >= 4.5 ? '🤩' : v >= 3.5 ? '😊' : v >= 2.5 ? '😐' : '😮‍💨');

export function WeeklySummary() {
  const { t } = useT();
  const state = useStore();
  const w = weeklyStats(state);
  const tiles = [
    { icon: '⏱️', value: w.fastHours, label: t('wkFastHours') },
    { icon: '✅', value: w.fastsDone, label: t('wkFasts') },
    { icon: '💧', value: `${w.waterDays}/7`, label: t('wkWater') },
    { icon: MOOD_EMOJI(w.moodAvg), value: w.moodAvg == null ? '—' : w.moodAvg.toFixed(1), label: t('wkMood') },
  ];
  return (
    <>
      <div className="row-between">
        <h3>📊 {t('weeklyTitle')}</h3>
        <span className="muted small">{t('last7')}</span>
      </div>
      <div className="wk-grid">
        {tiles.map((x) => (
          <div key={x.label} className="wk-tile">
            <span>{x.icon}</span>
            <strong className="num">{x.value}</strong>
            <small>{x.label}</small>
          </div>
        ))}
      </div>
      {w.weightChange != null && (
        <p className="muted small">
          ⚖️ {t('wkWeight')}: <b className="num">{w.weightChange > 0 ? '+' : ''}{w.weightChange} {t('kg')}</b>
        </p>
      )}
    </>
  );
}
