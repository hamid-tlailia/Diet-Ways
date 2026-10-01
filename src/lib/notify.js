let registration = null;

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    registration = await navigator.serviceWorker.register('/sw.js');
  } catch {
    registration = null;
  }
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

// System notification when permitted; the in-app toast is handled by the caller.
export function systemNotify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body, icon: '/icon-192.png', badge: '/badge-96.png', tag: 'diet-ways', renotify: true };
  if (registration?.showNotification) registration.showNotification(title, opts);
  else {
    try {
      new Notification(title, opts);
    } catch {
      /* some mobile browsers only allow SW notifications */
    }
  }
}
