import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Info, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';
import { useNow } from '../lib/hooks';
import { PROTOCOLS, STAGES, stageAt, nextStage } from '../data/fasting';
import StageIcon from '../components/StageIcon';
import { Sheet, Reveal, Confirm } from '../components/ui';
import { fmtDuration } from './Home';

const R = 132;
const C = 2 * Math.PI * R;

function Ring({ hours, goal, running, onStage }) {
  const { t } = useT();
  const pct = running ? Math.min(1, hours / goal) : 0;
  const stage = stageAt(hours);
  // Only the processes that happen within the chosen fasting hours (the goal's own stage sits at the top).
  const marks = STAGES.filter((s) => s.from > 0 && s.from <= goal);

  return (
    <div className="ring-wrap">
      <svg viewBox="0 0 320 320" className="ring">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent)" />
            <stop offset="1" stopColor={running ? stage.color : 'var(--accent-2)'} />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="160" cy="160" r={R} className="ring-track" />
        {Array.from({ length: 60 }, (_, k) => {
          const a = (k / 60) * 2 * Math.PI;
          const r1 = R - 18;
          const r2 = R - (k % 5 === 0 ? 26 : 22);
          return <line key={k} x1={160 + r1 * Math.sin(a)} y1={160 - r1 * Math.cos(a)} x2={160 + r2 * Math.sin(a)} y2={160 - r2 * Math.cos(a)} className="ring-tick" />;
        })}
        <motion.circle
          cx="160"
          cy="160"
          r={R}
          className="ring-progress"
          stroke="url(#ringGrad)"
          filter="url(#glow)"
          strokeDasharray={C}
          initial={false}
          animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          transform="rotate(-90 160 160)"
        />
      </svg>

      {marks.map((s) => {
        const a = (s.from / goal) * 2 * Math.PI;
        const x = 50 + (R / 320) * 100 * Math.sin(a);
        const y = 50 - (R / 320) * 100 * Math.cos(a);
        const reached = running && hours >= s.from;
        return (
          <button
            key={s.id}
            className={reached ? 'ring-mark reached' : 'ring-mark'}
            style={{ left: `${x}%`, top: `${y}%`, '--c': s.color }}
            onClick={() => onStage(s)}
            title={t(s.name)}
          >
            <StageIcon stage={s} size={22} />
          </button>
        );
      })}

      <div className="ring-center">
        <AnimatePresence mode="wait">
          <motion.button
            key={running ? stage.id : 'idle'}
            className="center-emblem"
            style={{ color: running ? stage.color : 'var(--muted)' }}
            initial={{ scale: 0.6, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            onClick={() => running && onStage(stage)}
          >
            <StageIcon stage={running ? stage : STAGES[0]} size={72} active={running} />
          </motion.button>
        </AnimatePresence>
        {running ? (
          <>
            <strong className="ring-time mono">{fmtDuration(hours * 3.6e6)}</strong>
            <span className="ring-stage" style={{ color: stage.color }}>
              {t(stage.name)}
            </span>
            <span className="muted small">{Math.round(pct * 100)}%</span>
          </>
        ) : (
          <>
            <strong className="ring-time">{t('notFasting')}</strong>
            <span className="muted small">{t('pickProtocol')}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function Fasting() {
  const { t, lang } = useT();
  const { protocolId, fastStart, fastGoal, history, setProtocol, startFast, endFast, track } = useStore();
  const now = useNow(1000);
  const [open, setOpen] = useState(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [stagesOpen, setStagesOpen] = useState(false);
  // Stages covered by the chosen protocol (or reached so far, if the fast runs past its goal).

  const running = !!fastStart;
  const hours = running ? (now - fastStart) / 3.6e6 : 0;
  const nxt = running ? nextStage(hours) : null;
  const visibleStages = STAGES.filter((s) => s.from <= Math.max(fastGoal, hours));
  const remainingMs = Math.max(0, fastGoal * 3.6e6 - (now - (fastStart ?? now)));

  const openStage = (s) => {
    track('stages', s.id);
    setOpen(s);
  };

  const onEnd = () => setConfirmEnd(true);

  const fmtDate = (ms) =>
    new Date(ms).toLocaleString(lang === 'ar' ? 'ar' : 'en', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fasting">
      <div className="page-head">
        <h2>{t('fastingTitle')}</h2>
        <p className="muted">{t('tapStage')}</p>
      </div>

      <div className="protocols" role="radiogroup" aria-label={t('protocol')}>
        {PROTOCOLS.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={protocolId === p.id}
            disabled={running}
            className={protocolId === p.id ? 'protocol on' : 'protocol'}
            onClick={() => setProtocol(p.id, p.fast)}
          >
            <strong>{p.id}</strong>
            <small>{t(p.level)}</small>
          </button>
        ))}
      </div>
      <p className="muted small center">
        {t(PROTOCOLS.find((p) => p.id === protocolId)?.desc)} · {fastGoal}
        {t('hoursShort')} {t('fast')}
      </p>

      <Reveal className="card ring-card">
        <Ring hours={hours} goal={fastGoal} running={running} onStage={openStage} />

        {running && (
          <div className="ring-meta">
            <div>
              <small>{t('started')}</small>
              <strong>{fmtDate(fastStart)}</strong>
            </div>
            <div>
              <small>{hours >= fastGoal ? t('goalReached') : t('remaining')}</small>
              <strong className="mono">{hours >= fastGoal ? '✓' : fmtDuration(remainingMs)}</strong>
            </div>
            {nxt && (
              <div>
                <small>{t('nextStageIn')}</small>
                <strong className="mono">{fmtDuration((nxt.from - hours) * 3.6e6)}</strong>
              </div>
            )}
          </div>
        )}

        <motion.button whileTap={{ scale: 0.96 }} className={running ? 'btn danger big' : 'btn primary big'} onClick={running ? onEnd : startFast}>
          {running ? <Square size={18} /> : <Play size={18} />} {running ? t('endFast') : t('startFast')}
        </motion.button>
      </Reveal>

      {/* Stages accordion: the current stage stays visible, the full list opens on demand. */}
      <Reveal className={stagesOpen ? 'card accordion open' : 'card accordion'}>
        <button className="accordion-head" onClick={() => setStagesOpen(!stagesOpen)} aria-expanded={stagesOpen}>
          <span className="accordion-title">
            <strong>{t('stages')}</strong>
            <small className="muted">
              {visibleStages.length} · {running ? `${t('current')}: ${t(stageAt(hours).name)}` : t('tapStage')}
            </small>
          </span>
          <ChevronDown size={20} className="chev" />
        </button>
        <AnimatePresence initial={false}>
          {stagesOpen && (
            <motion.div className="accordion-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
              <div className="stage-list">
                {visibleStages.map((s) => {
                  const status = !running ? '' : hours >= s.from ? (stageAt(hours).id === s.id ? 'current' : 'reached') : '';
                  return (
                    <button key={s.id} className={`stage-card ${status}`} style={{ '--c': s.color }} onClick={() => openStage(s)}>
                      <span className="stage-ico">
                        <StageIcon stage={s} size={38} active={status === 'current'} />
                      </span>
                      <span className="stage-txt">
                        <strong>{t(s.name)}</strong>
                        <small>
                          {s.from}
                          {t('hoursShort')}+ · {t(s.short)}
                        </small>
                      </span>
                      <span className="stage-status">{status === 'current' ? t('current') : status === 'reached' ? t('reached') : <Info size={16} />}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Reveal>

      <h3 className="section-title">{t('history')}</h3>
      <Reveal className="card">
        {history.length === 0 ? (
          <p className="muted center">{t('noHistory')}</p>
        ) : (
          <div className="history">
            {history.slice(0, 10).map((h) => {
              const hrs = (h.end - h.start) / 3.6e6;
              const ok = hrs >= h.goal * 0.95;
              return (
                <div key={h.start} className="hist-row">
                  <span className="muted small">{fmtDate(h.start)}</span>
                  <div className="hist-bar">
                    <span style={{ width: `${Math.min(100, (hrs / h.goal) * 100)}%` }} className={ok ? 'ok' : ''} />
                  </div>
                  <strong className="mono small">
                    {hrs.toFixed(1)}/{h.goal}
                    {t('hoursShort')} {ok ? '✓' : ''}
                  </strong>
                </div>
              );
            })}
          </div>
        )}
      </Reveal>

      <Confirm
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        onConfirm={endFast}
        danger
        title={t('confirmEnd')}
        body={t('endFastBody')}
        confirmLabel={t('endFast')}
      />

      <Sheet open={!!open} onClose={() => setOpen(null)} accent={open?.color}>
        {open && (
          <div className="stage-sheet">
            <div className="sheet-emblem" style={{ color: open.color }}>
              <StageIcon stage={open} size={96} active />
            </div>
            <span className="badge" style={{ background: open.color }}>
              {t('fromHour')} {open.from}
            </span>
            <h2>{t(open.name)}</h2>
            <p className="lead">{t(open.body)}</p>
            <div className="tip">
              <strong>💡 {t('tip')}</strong>
              <p>{t(open.tip)}</p>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
