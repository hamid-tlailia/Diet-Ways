import { snapshot } from './coach';

const b64ToBytes = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// Subscribes this device to server push. Returns the device id, or null if the server can't do push.
export async function enablePush(state) {
  if (!pushSupported()) return null;
  const info = await fetch('/api/push?key').then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!info?.publicKey || !info.storage) return null;
  const reg = await navigator.serviceWorker.ready;
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(info.publicKey) }));
  const res = await fetch('/api/push', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subscription, state: snapshot(state) }),
  });
  if (!res.ok) return null;
  return (await res.json()).id;
}

export async function disablePush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await fetch('/api/push', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
  await sub.unsubscribe();
}

export async function syncPush(state) {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return;
  await fetch('/api/push', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subscription, state: snapshot(state) }),
  }).catch(() => {});
}

export async function fetchInbox(id) {
  const res = await fetch(`/api/push?inbox=${id}`).catch(() => null);
  if (!res?.ok) return [];
  return (await res.json()).messages ?? [];
}
