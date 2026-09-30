import { snapshot } from './coach';

const b64ToBytes = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const sameKey = (a, b) => {
  if (!a || !b) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
};

const postSub = (subscription, state) =>
  fetch('/api/push', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subscription, state: snapshot(state) }),
  });

const withTimeout = (p, ms, step) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${step}: timeout`)), ms))]);

// Sends a short failure report to the server logs so push problems on real phones can be diagnosed.
const report = (step, err) =>
  fetch('/api/push?diag', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ diag: { step, error: `${err?.name ?? ''}: ${err?.message ?? err}`.slice(0, 300), ua: navigator.userAgent.slice(0, 200) } }),
  }).catch(() => {});

// Subscribes this device to server push. Returns the device id; throws { step } explaining what failed.
// Replaces the browser's subscription when it was made with an old key or the push service expired it.
export async function enablePush(state) {
  let step = 'support';
  try {
    if (!pushSupported()) throw new Error('push not supported by this browser');
    step = 'key';
    const info = await fetch('/api/push?key').then((r) => (r.ok ? r.json() : null));
    if (!info?.publicKey || !info.storage) throw new Error('server push not configured');
    const key = b64ToBytes(info.publicKey.trim());
    step = 'worker';
    const reg = await withTimeout(navigator.serviceWorker.ready, 10_000, 'worker');
    const fresh = () => reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });

    step = 'subscribe';
    let subscription = await reg.pushManager.getSubscription();
    if (subscription && !sameKey(subscription.options?.applicationServerKey, key)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    subscription ??= await withTimeout(fresh(), 20_000, 'subscribe');
    step = 'register';
    let res = await postSub(subscription, state);
    if (res.status === 409) {
      await subscription.unsubscribe();
      subscription = await withTimeout(fresh(), 20_000, 'subscribe');
      res = await postSub(subscription, state);
    }
    if (!res.ok) throw new Error(`server ${res.status}`);
    return (await res.json()).id;
  } catch (err) {
    report(step, err);
    throw Object.assign(new Error(err?.message ?? String(err)), { step, name: err?.name });
  }
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
