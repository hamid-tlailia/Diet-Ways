import { db, readJson, send, subId, allow, clientIp } from './_lib.js';

// GET ?key       -> VAPID public key
// GET ?inbox=ID  -> messages delivered while the app was closed (then cleared)
// POST {subscription, state} -> create/update this device
// DELETE {endpoint}          -> unsubscribe
export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const r = db();

  if (req.method === 'GET' && url.searchParams.has('key')) {
    return send(res, 200, { publicKey: process.env.VAPID_PUBLIC_KEY ?? null, storage: !!r });
  }
  if (!r) return send(res, 503, { error: 'push storage not configured' });

  try {
    if (req.method === 'GET' && url.searchParams.get('inbox')) {
      const id = url.searchParams.get('inbox').replace(/[^a-f0-9]/g, '');
      const items = (await r.lrange(`inbox:${id}`, 0, 30)) ?? [];
      await r.del(`inbox:${id}`);
      return send(res, 200, { messages: items });
    }

    if (req.method === 'POST') {
      if (!(await allow(`sync:${clientIp(req)}`, 120, 3600))) return send(res, 429, { error: 'slow down' });
      const { subscription, state } = await readJson(req);
      if (!subscription?.endpoint || !state) return send(res, 400, { error: 'missing subscription/state' });
      const id = await subId(subscription.endpoint);
      await r.set(`sub:${id}`, { subscription, state, updatedAt: Date.now() });
      // Delivery bookkeeping lives in its own key, owned by the cron; create it once.
      await r.set(`meta:${id}`, { lastNotifAt: Date.now(), stageSeen: null }, { nx: true });
      await r.sadd('subs', id);
      return send(res, 200, { id });
    }

    if (req.method === 'DELETE') {
      const { endpoint } = await readJson(req);
      if (!endpoint) return send(res, 400, { error: 'missing endpoint' });
      const id = await subId(endpoint);
      await r.del(`sub:${id}`, `meta:${id}`, `inbox:${id}`);
      await r.srem('subs', id);
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'method not allowed' });
  } catch (e) {
    return send(res, e.status ?? 400, { error: e.message });
  }
}
