import webpush from 'web-push';
import { buildProfile, localMessage } from '../src/lib/coach.js';
import { zonedDate } from '../src/lib/dates.js';
import { stageAt } from '../src/data/fasting.js';
import { tr } from '../src/i18n/strings.js';
import { db, claudeText, send } from './_lib.js';

const QUIET = (h) => h >= 23 || h < 7; // no motivational pings at night; stage alerts still go out

// Called every ~10 minutes (GitHub Actions). Sends stage, goal and motivational pushes.
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return send(res, 401, { error: 'unauthorized' });
  const r = db();
  if (!r) return send(res, 503, { error: 'push storage not configured' });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  const ids = (await r.smembers('subs')) ?? [];
  const stats = { devices: ids.length, sent: 0, removed: 0 };

  for (const id of ids) {
    const rec = await r.get(`sub:${id}`);
    if (!rec) {
      await r.del(`meta:${id}`, `inbox:${id}`);
      await r.srem('subs', id);
      continue;
    }
    const meta = (await r.get(`meta:${id}`)) ?? { lastNotifAt: 0, stageSeen: null };
    const { state } = rec;
    const lang = state.lang === 'en' ? 'en' : 'ar';
    const t = (v) => tr(lang, v);
    const ref = zonedDate(state.tz);
    const out = [];

    if (state.fastStart) {
      const hours = (Date.now() - state.fastStart) / 3.6e6;
      const stage = stageAt(hours);
      const seen = meta.stageSeen?.fastStart === state.fastStart ? meta.stageSeen : { fastStart: state.fastStart, stageId: stage.id, goalDone: hours >= state.fastGoal };
      if (seen.stageId !== stage.id) out.push({ title: `${t(stage.name)} ✨`, body: t(stage.body), kind: 'stage' });
      if (!seen.goalDone && hours >= state.fastGoal) {
        out.push({ title: t('goalReached'), body: `${state.fastGoal}${t('hoursShort')} ✓`, kind: 'goal' });
        seen.goalDone = true;
      }
      meta.stageSeen = { ...seen, stageId: stage.id };
    }

    const due = state.notifEnabled && Date.now() - (meta.lastNotifAt ?? 0) >= (state.notifEvery ?? 60) * 60_000;
    if (due && !QUIET(ref.getHours())) {
      const profile = buildProfile(state, ref);
      let text, source;
      try {
        text = await claudeText(profile, lang);
        source = 'ai';
      } catch {
        text = localMessage(profile, lang);
        source = 'local';
      }
      out.push({ title: t('appName'), body: text, kind: 'coach', source });
      meta.lastNotifAt = Date.now();
    }

    for (const msg of out) {
      const payload = { id: crypto.randomUUID(), at: Date.now(), ...msg };
      try {
        await webpush.sendNotification(rec.subscription, JSON.stringify(payload), { TTL: 3600 });
        stats.sent++;
        if (msg.kind === 'coach') {
          await r.lpush(`inbox:${id}`, { id: payload.id, at: payload.at, text: msg.body, source: msg.source, dietId: state.dietId });
          await r.ltrim(`inbox:${id}`, 0, 19);
        }
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await r.del(`sub:${id}`, `meta:${id}`, `inbox:${id}`);
          await r.srem('subs', id);
          stats.removed++;
          break;
        }
        console.error('push failed', e.statusCode, e.body);
      }
    }
    if (await r.exists(`sub:${id}`)) await r.set(`meta:${id}`, meta);
  }
  return send(res, 200, stats);
}
