import { aiJson, allow, clientIp, readJson, send } from './_lib.js';
import { normalizeShopping, shoppingPrompt } from '../src/lib/meals.js';

// POST { state, plans } -> { list }: a week of groceries grouped by store section.
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
  try {
    const { state, plans = [] } = await readJson(req, 200_000);
    if (!state?.mealProfile) return send(res, 400, { error: 'missing meal profile' });
    if (!(await allow(`shop:${clientIp(req)}`, 6, 3600))) return send(res, 429, { error: 'rate limited' });
    const lang = state.lang === 'en' ? 'en' : 'ar';
    const raw = await aiJson(shoppingPrompt(state, lang, plans.slice(0, 7)));
    return send(res, 200, { list: normalizeShopping(raw) });
  } catch (e) {
    console.error('shopping failed', e.message);
    return send(res, e.status === 413 ? 413 : 503, { error: 'shopping list unavailable', busy: !!e.busy });
  }
}
