import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';
import { BADGES, badgeById, earnedBadges } from '../lib/badges';
import { systemNotify } from '../lib/notify';

// Watches progress and unlocks badges; the first run records existing achievements silently.
export function useBadgeWatcher() {
  useEffect(() => {
    const check = () => {
      const s = useStore.getState();
      if (!s.onboarded) return;
      s.unlockBadges(earnedBadges(s), !s.badgesInit);
    };
    check();
    const keys = ['history', 'checkins', 'visits', 'mealProfile', 'scans', 'weights', 'onboarded'];
    return useStore.subscribe((s, prev) => keys.some((k) => s[k] !== prev[k]) && check());
  }, []);
}

const COLORS = ['#f97316', '#22d3ee', '#a855f7', '#facc15', '#34d399', '#f43f5e'];

export function BadgeCelebration() {
  const { t } = useT();
  const id = useStore((s) => s.badgeQueue[0]);
  const celebrated = useStore((s) => s.celebrated);
  const badge = id ? badgeById(id) : null;
  const confetti = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({ x: (Math.random() - 0.5) * 340, y: -(120 + Math.random() * 260), r: Math.random() * 540 - 270, c: COLORS[i % COLORS.length], d: Math.random() * 0.25 })),
    // new burst per badge
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  useEffect(() => {
    if (badge) systemNotify(`${badge.emoji} ${t('badgeUnlocked')}`, t(badge.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return createPortal(
    <AnimatePresence>
      {badge && (
        <motion.div key={id} className="celebrate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={celebrated}>
          <div className="confetti" aria-hidden="true">
            {confetti.map((p, i) => (
              <motion.i
                key={i}
                style={{ background: p.c }}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                animate={{ x: p.x, y: [0, p.y, p.y + 420], opacity: [1, 1, 0], rotate: p.r }}
                transition={{ duration: 2.2, delay: p.d, ease: 'easeOut' }}
              />
            ))}
          </div>
          <motion.div
            className="celebrate-card"
            initial={{ scale: 0.6, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.span className="celebrate-emoji" animate={{ rotate: [0, -12, 12, 0], scale: [1, 1.2, 1] }} transition={{ duration: 0.9, delay: 0.3 }}>
              {badge.emoji}
            </motion.span>
            <small>{t('badgeUnlocked')}</small>
            <h2>{t(badge.name)}</h2>
            <p className="muted">{t(badge.desc)}</p>
            <button className="btn primary" onClick={celebrated}>
              {t('awesome')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function BadgeGrid({ bare = false }) {
  const { t } = useT();
  const badges = useStore((s) => s.badges);
  const count = Object.keys(badges).length;
  return (
    <>
      {/* `bare` drops the heading when an outer accordion already shows it. */}
      {!bare && (
        <div className="row-between">
          <h3>🏅 {t('badges')}</h3>
          <span className="muted small">
            {count}/{BADGES.length}
          </span>
        </div>
      )}
      <div className="badge-grid">
        {BADGES.map((b) => {
          const on = !!badges[b.id];
          return (
            <div key={b.id} className={on ? 'badge-item on' : 'badge-item'} title={t(b.desc)}>
              <span className="badge-emoji">{on ? b.emoji : '🔒'}</span>
              <strong>{t(b.name)}</strong>
              <small>{t(b.desc)}</small>
            </div>
          );
        })}
      </div>
    </>
  );
}
