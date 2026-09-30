import webpush from 'web-push';
import { buildProfile, localMessage } from '../src/lib/coach.js';
import { zonedDate } from '../src/lib/dates.js';
import { planNotifications } from '../src/lib/rules.js';
import { MEAL_TYPES } from '../src/lib/meals.js';
import { aiText, makeMealPlan, send } from './_lib.js';
import { hasStore, listSubs, saveMeta, addInbox, markDead } from './_store.js';

// Called every ~10 minutes (GitHub Actions). Applies the shared notification rules per device.
export default async function handler(req, res) {
  // Secret via header (GitHub Actions) or ?key= (simple URL for external schedulers like cron-job.org).
  const secret = process.env.CRON_SECRET;
  const key = new URL(req.url, 'http://x').searchParams.get('key');
  if (!secret || (req.headers.authorization !== `Bearer ${secret}` && key !== secret)) return send(res, 401, { error: 'unauthorized' });
  if (!hasStore()) return send(res, 503, { error: 'push storage not configured' });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  const subs = await listSubs();
  const stats = { devices: subs.length, sent: 0, removed: 0 };

  for (const rec of subs) {
    const { id, state } = rec;
    if (!state.notifEnabled) continue;
    const lang = state.lang === 'en' ? 'en' : 'ar';
    const ref = zonedDate(state.tz);
    const { items, meta } = planNotifications(state, rec.meta ?? {}, ref);

    let gone = false;
    for (const item of items) {
      const payload = { id: crypto.randomUUID(), at: Date.now(), kind: item.kind, title: item.title, body: item.body };
      let inbox = null;
      try {
        if (item.ai === 'coach') {
          const profile = buildProfile(state, ref);
          try {
            payload.body = await aiText(profile, lang);
            payload.source = 'ai';
          } catch {
            payload.body = localMessage(profile, lang);
            payload.source = 'local';
          }
        } else if (item.ai === 'meals') {
          const plan = await makeMealPlan(state).catch((e) => (console.error('meal plan failed', e.message), null));
          if (!plan) continue;
          payload.body = plan.meals.map((m) => `${MEAL_TYPES[m.type].emoji} ${m.name}`).join(' · ');
          inbox = { id: payload.id, at: payload.at, kind: 'meals', plan };
        }
        if (item.kind === 'coach' || item.kind === 'insight') {
          inbox = { id: payload.id, at: payload.at, kind: item.kind, text: payload.body, source: payload.source ?? 'local', dietId: state.dietId };
        }

        await webpush.sendNotification(rec.subscription, JSON.stringify(payload), { TTL: 3600, urgency: item.kind === 'stage' || item.kind === 'goal' ? 'high' : 'normal' });
        stats.sent++;
        if (inbox) await addInbox(id, inbox);
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await markDead(id);
          stats.removed++;
          gone = true;
          break;
        }
        console.error('push failed', item.kind, e.statusCode ?? e.message);
      }
    }
    if (!gone) await saveMeta(id, meta);
  }
  return send(res, 200, stats);
}
