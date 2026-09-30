import { aiJson, allow, clientIp, readJson, send } from './_lib.js';
import { normalizeScan, scanPrompt } from '../src/lib/meals.js';

const MIMES = ['image/jpeg', 'image/png', 'image/webp'];

// POST { image: base64, mime, state } -> { scan }: calories, macros and fit with the user's diet.
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
  try {
    const { image, mime, state } = await readJson(req, 3_500_000);
    if (typeof image !== 'string' || !MIMES.includes(mime) || !state) return send(res, 400, { error: 'missing image' });
    if (!(await allow(`scan:${clientIp(req)}`, 20, 3600))) return send(res, 429, { error: 'rate limited' });
    const lang = state.lang === 'en' ? 'en' : 'ar';
    const raw = await aiJson(scanPrompt(state, lang), { mime, data: image });
    return send(res, 200, { scan: normalizeScan(raw) });
  } catch (e) {
    console.error('scan failed', e.message);
    return send(res, e.status === 413 ? 413 : 503, { error: 'scan unavailable', busy: !!e.busy });
  }
}
