import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Share, X } from 'lucide-react';
import { useT } from '../i18n';
import { useInstall } from '../lib/install';

const KEY = 'dw-install-dismissed';
const recentlyDismissed = () => {
  try {
    return Date.now() - Number(localStorage.getItem(KEY) || 0) < 3 * 864e5;
  } catch {
    return false;
  }
};

/** "Install as an app" card, shown only in the browser (never once installed). `compact` hides the close button. */
export default function InstallBanner({ compact = false }) {
  const { t } = useT();
  const { mode, install } = useInstall();
  const [hidden, setHidden] = useState(() => !compact && recentlyDismissed());
  if (!mode || hidden) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* private mode */
    }
    setHidden(true);
  };
  return (
    <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card install-card span-2">
      <img src="/icon-192.png" alt="" />
      <div className="grow">
        <strong>{t('installTitle')}</strong>
        <p className="muted small">{mode === 'ios' ? t('installIos') : t('installSub')}</p>
      </div>
      {mode === 'prompt' ? (
        <button className="btn primary" onClick={install}>
          <Download size={16} /> {t('installBtn')}
        </button>
      ) : (
        <Share size={20} className="install-ios" />
      )}
      {!compact && (
        <button className="install-x" onClick={dismiss} aria-label={t('close')}>
          <X size={14} />
        </button>
      )}
    </motion.section>
  );
}
