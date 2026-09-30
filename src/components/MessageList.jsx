import { AnimatePresence, motion } from 'framer-motion';
import { useT } from '../i18n';

// The coach's latest three messages; older ones stay in storage but aren't shown.
export default function MessageList({ messages }) {
  const { t, lang } = useT();
  const fmt = (ms) => new Date(ms).toLocaleString(lang === 'ar' ? 'ar' : 'en', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  if (!messages.length) return <p className="muted small">{t('noMessages')}</p>;
  return (
    <div className="feed">
      <AnimatePresence initial={false}>
        {messages.slice(0, 3).map((m) => (
          <motion.div key={m.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="message-bubble">
            <div className="row-between">
              <span className={`src-tag ${m.source}`}>{m.kind === 'insight' ? t('insightTitle') : m.source === 'ai' ? t('aiSource') : t('localSource')}</span>
              <small className="muted">{fmt(m.at)}</small>
            </div>
            <p>{m.text}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
