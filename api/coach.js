import { buildProfile, localMessage } from '../src/lib/coach.js';
import { zonedDate } from '../src/lib/dates.js';
import { allow, claudeText, clientIp, readJson, send } from './_lib.js';

// POST { state } -> { text, source }. Keeps the Anthropic key on the server.
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
  try {
    const { state } = await readJson(req);
    if (!state || typeof state !== 'object') return send(res, 400, { error: 'missing state' });
    const lang = state.lang === 'en' ? 'en' : 'ar';
    const profile = buildProfile(state, zonedDate(state.tz));

    if (!(await allow(`coach:${clientIp(req)}`, 20, 3600))) {
      return send(res, 200, { text: localMessage(profile, lang), source: 'local', limited: true });
    }
    try {
      return send(res, 200, { text: await claudeText(profile, lang), source: 'ai' });
    } catch (e) {
      console.error('claude failed', e?.message);
      return send(res, 200, { text: localMessage(profile, lang), source: 'local' });
    }
  } catch (e) {
    return send(res, e.status ?? 400, { error: e.message });
  }
}
