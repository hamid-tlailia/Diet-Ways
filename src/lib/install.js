import { useSyncExternalStore } from 'react';

// Captures the browser's install prompt as early as possible (it can fire before React mounts).
let deferred = null;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

const standalone = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);
const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own button instead of the mini-infobar
    deferred = e;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

// 'prompt': one tap installs · 'ios': Safari needs Share → Add to Home Screen · null: installed or not installable.
const snapshot = () => (standalone() ? null : deferred ? 'prompt' : isIOS() ? 'ios' : null);
const subscribe = (l) => (listeners.add(l), () => listeners.delete(l));

export function useInstall() {
  const mode = useSyncExternalStore(subscribe, snapshot, () => null);
  const install = async () => {
    if (!deferred) return false;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    emit();
    return outcome === 'accepted';
  };
  return { mode, install };
}
