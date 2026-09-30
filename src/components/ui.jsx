import { AnimatePresence, motion } from 'framer-motion';
import { create } from 'zustand';
import { X, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n';

export function Sheet({ open, onClose, children, accent }) {
  const { t } = useT();
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  // Portal keeps the fixed overlay out of transformed/filtered page containers.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="sheet glass"
            style={accent ? { '--accent-local': accent } : undefined}
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button className="icon-btn sheet-close" onClick={onClose} aria-label={t('close')}>
              <X size={18} />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

const useToasts = create((set) => ({
  items: [],
  push: (toast) => {
    const id = crypto.randomUUID();
    set((s) => ({ items: [...s.items, { id, ...toast }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((x) => x.id !== id) })), toast.duration ?? 6000);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

export const toast = (t) => useToasts.getState().push(t);

export function ToastHost() {
  const { items, dismiss } = useToasts();
  return (
    <div className="toast-host">
      <AnimatePresence>
        {items.map((x) => (
          <motion.button
            key={x.id}
            layout
            className="toast glass"
            initial={{ y: -30, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            onClick={() => dismiss(x.id)}
          >
            <span className="toast-icon">{x.icon ?? <Sparkles size={18} />}</span>
            <span>
              {x.title && <strong>{x.title}</strong>}
              <span className="toast-body">{x.body}</span>
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Segmented({ value, options, onChange }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {value === o.value && <motion.span layoutId={`seg-${options.map((x) => x.value).join()}`} className="segmented-pill" />}
          <span className="segmented-label">
            {o.icon}
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

// Reveal-on-scroll: each block fades up the first time it enters the viewport.
export const stagger = (i = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.12 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: Math.min(i, 4) * 0.04 },
});

export function Reveal({ i = 0, ...props }) {
  return <motion.section {...stagger(i)} {...props} />;
}

// In-app confirmation (replaces the browser's alert/confirm dialogs).
export function Confirm({ open, title, body, confirmLabel, danger, onConfirm, onClose }) {
  const { t } = useT();
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="confirm">
        <span className={danger ? 'confirm-ico danger' : 'confirm-ico'}>{danger ? '⚠️' : '❓'}</span>
        <h3>{title}</h3>
        {body && <p className="muted">{body}</p>}
        <div className="confirm-actions">
          <button className="btn ghost" onClick={onClose}>
            {t('cancel')}
          </button>
          <button
            className={danger ? 'btn danger' : 'btn primary'}
            onClick={() => {
              onClose();
              onConfirm();
            }}
          >
            {confirmLabel ?? t('confirm')}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
