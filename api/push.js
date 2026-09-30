import { readJson, send, subId, allow, clientIp } from './_lib.js';
import { hasStore, saveSub, deleteSub, takeInbox, isDead } from './_store.js';

// GET ?key       -> VAPID public key
// GET ?inbox=ID  -> messages delivered while the app was closed (then cleared)
// POST {subscription, state} -> create/update this device
// DELETE {endpoint}          -> unsubscribe
export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');

  if (req.method === 'GET' && url.searchParams.has('key')) {
    return send(res, 200, { publicKey: process.env.VAPID_PUBLIC_KEY ?? null, storage: hasStore() });
  }
  if (req.method === 'POST' && url.searchParams.has('diag')) {
    const { diag } = await readJson(req, 4000).catch(() => ({}));
    console.error('push client failure', JSON.stringify(diag));
    return send(res, 200, { ok: true });
  }
  if (!hasStore()) return send(res, 503, { error: 'push storage not configured' });

  try {
    if (req.method === 'GET' && url.searchParams.get('inbox')) {
      const id = url.searchParams.get('inbox').replace(/[^a-f0-9]/g, '');
      return send(res, 200, { messages: await takeInbox(id) });
    }

    if (req.method === 'POST') {
      if (!(await allow(`sync:${clientIp(req)}`, 120, 3600))) return send(res, 429, { error: 'slow down' });
      const { subscription, state } = await readJson(req);
      if (!subscription?.endpoint || !state) return send(res, 400, { error: 'missing subscription/state' });
      const id = await subId(subscription.endpoint);
      if (await isDead(id)) return send(res, 409, { error: 'subscription expired', dead: true });
      await saveSub(id, subscription, state);
      return send(res, 200, { id });
    }

    if (req.method === 'DELETE') {
      const { endpoint } = await readJson(req);
      if (!endpoint) return send(res, 400, { error: 'missing endpoint' });
      await deleteSub(await subId(endpoint));
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'method not allowed' });
  } catch (e) {
    console.error('push error', e.message);
    return send(res, e.status ?? 500, { error: e.message });
  }
}
