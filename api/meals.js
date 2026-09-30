import { allow, clientIp, makeMealPlan, readJson, send } from './_lib.js';

// POST { state } -> { plan }: today's AI meal plan for the user's diet and questionnaire.
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
  try {
    const { state } = await readJson(req);
    if (!state?.mealProfile) return send(res, 400, { error: 'missing meal profile' });
    if (!(await allow(`meals:${clientIp(req)}`, 8, 3600))) return send(res, 429, { error: 'rate limited' });
    return send(res, 200, { plan: await makeMealPlan(state) });
  } catch (e) {
    console.error('meals failed', e.message);
    return send(res, e.status === 413 ? 413 : 503, { error: 'meal plan unavailable', busy: !!e.busy });
  }
}
