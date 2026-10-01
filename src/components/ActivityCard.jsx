import { motion } from 'framer-motion';
import { Footprints, Flame, Scale, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { useStore, todayKey } from '../store/useStore';
import { useT } from '../i18n';
import { STEP_GOAL, stepKcal, stepsAction, stepsToday } from '../lib/activity';

const fmt = (n) => n.toLocaleString('en');

// Home card: today's steps (from the Android app's step counter), calories walked off and weight.
export default function ActivityCard({ go, motionProps }) {
  const { t, lang } = useT();
  const activity = useStore((s) => s.activity);
  const weights = useStore((s) => s.weights);
  const profileKg = useStore((s) => parseFloat(s.mealProfile?.weight) || null);

  const kg = weights.at(-1)?.kg ?? profileKg;
  const weightDelta = weights.length >= 2 ? +(weights.at(-1).kg - weights.at(-2).kg).toFixed(1) : null;
  const granted = activity?.app && activity.perm === 'granted';
  const steps = granted ? stepsToday(activity) : null;
  const pct = steps == null ? 0 : Math.min(1, steps / STEP_GOAL);
  const updated = activity?.at ? new Date(activity.at).toLocaleTimeString(lang === 'ar' ? 'ar' : 'en', { hour: 'numeric', minute: '2-digit' }) : null;

  // Last 7 days, oldest first, for the mini chart.
  const week = Array.from({ length: 7 }, (_, k) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - k));
    const key = todayKey(d);
    return { key, steps: activity?.days?.[key] ?? 0, today: k === 6 };
  });
  const weekMax = Math.max(STEP_GOAL, ...week.map((d) => d.steps));
  const Trend = weightDelta == null || weightDelta === 0 ? null : weightDelta < 0 ? TrendingDown : TrendingUp;

  return (
    <motion.section {...motionProps} className={pct >= 1 ? 'card activity span-2 done' : 'card activity span-2'}>
      <div className="row-between">
        <span className="eyebrow">
          <Footprints size={14} /> {t('activityTitle')}
        </span>
        {granted && (
          <button className="chip" onClick={() => stepsAction('refresh')} aria-label={t('refresh')}>
            <RefreshCw size={13} /> {updated}
          </button>
        )}
      </div>

      <div className="act-tiles">
        <div className="act-tile">
          <Footprints className="act-ico" style={{ color: '#22c55e' }} />
          <strong className="num">{steps == null ? '—' : fmt(steps)}</strong>
          <span>{t('stepsUnit')}</span>
          {steps != null && (
            <div className="bar">
              <motion.span animate={{ width: `${pct * 100}%` }} style={{ background: '#22c55e' }} />
            </div>
          )}
        </div>
        <div className="act-tile">
          <Flame className="act-ico" style={{ color: '#f97316' }} />
          <strong className="num">{steps == null ? '—' : `${kg ? '' : '≈'}${fmt(stepKcal(steps, kg))}`}</strong>
          <span>{t('kcalBurned')}</span>
        </div>
        <button className="act-tile act-btn" onClick={() => go('coach')}>
          <Scale className="act-ico" style={{ color: '#8b5cf6' }} />
          <strong className="num">{kg ?? '—'}</strong>
          <span>
            {kg ? t('kg') : t('logWeight')}
            {Trend && (
              <em dir="ltr" className={weightDelta < 0 ? 'act-delta down' : 'act-delta'}>
                <Trend size={12} /> {weightDelta > 0 ? '+' : ''}
                {weightDelta}
              </em>
            )}
          </span>
        </button>
      </div>

      {granted && week.some((d) => d.steps > 0 && !d.today) && (
        <div className="act-week" dir="ltr">
          {week.map((d) => (
            <div key={d.key} className={d.today ? 'act-day today' : 'act-day'} title={`${d.key}: ${fmt(d.steps)}`}>
              <motion.span animate={{ height: `${Math.max(4, (d.steps / weekMax) * 80)}%` }} className={d.steps >= STEP_GOAL ? 'hit' : ''} />
              <small>{new Date(`${d.key}T12:00`).toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { weekday: 'narrow' })}</small>
            </div>
          ))}
        </div>
      )}

      {!activity?.app ? (
        <p className="muted small">{t('stepsAppOnly')}</p>
      ) : activity.perm === 'unsupported' ? (
        <p className="muted small">{t('stepsUnsupported')}</p>
      ) : activity.perm === 'denied' ? (
        <div className="row-gap">
          <button className="btn primary grow" onClick={() => stepsAction('enable')}>
            <Footprints size={18} /> {t('stepsEnable')}
          </button>
          {activity.asked && (
            <button className="chip" onClick={() => stepsAction('settings')}>
              {t('openSettings')}
            </button>
          )}
        </div>
      ) : steps === 0 ? (
        <p className="muted small">{t('stepsStarting')}</p>
      ) : (
        <p className="muted small">
          {pct >= 1 ? t('stepsGoalDone') : `${t('stepsGoal')} ${fmt(STEP_GOAL)} · ${fmt(Math.max(0, STEP_GOAL - steps))} ${t('stepsLeft')}`}
        </p>
      )}
    </motion.section>
  );
}
