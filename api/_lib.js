import { buildAiPrompt } from '../src/lib/coach.js';
import { mealPlanPrompt, normalizePlan } from '../src/lib/meals.js';
import { todayKey, zonedDate } from '../src/lib/dates.js';

export { allow } from './_store.js';

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
let candidates = null;

// Free-tier Flash models the key can use: newest stable first, then older stable, then the lighter
// "lite" models (less crowded when the big ones are overloaded). GEMINI_MODEL, if set, goes first.
async function modelList(key) {
  if (candidates) return candidates;
  const pinned = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : [];
  try {
    const res = await fetch(`${GEMINI}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
    if (!res.ok) throw new Error(`gemini models ${res.status}`);
    const { models = [] } = await res.json();
    const version = (n) => Number(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
    const flash = models
      .map((m) => ({ id: m.name.replace(/^models\//, ''), methods: m.supportedGenerationMethods ?? [] }))
      .filter((m) => m.methods.includes('generateContent') && /^gemini-[\d.]+-flash/.test(m.id) && !/image|tts|audio|live|exp|thinking/.test(m.id))
      .map((m) => m.id)
      .filter((id) => !/-\d{3}$/.test(id)) // pinned snapshots duplicate their alias
      .sort((a, b) => Number(a.includes('preview')) - Number(b.includes('preview')) || version(b) - version(a) || a.length - b.length);
    const full = flash.filter((id) => !id.includes('lite'));
    const lite = flash.filter((id) => id.includes('lite'));
    // Interleave so each parallel pair mixes a full and a lite model.
    const mixed = [];
    for (let i = 0; i < Math.max(full.length, lite.length); i++) mixed.push(full[i], lite[i]);
    candidates = [...new Set([...pinned, ...mixed.filter(Boolean)])].slice(0, 6);
    if (!candidates.length) throw new Error('no flash models');
  } catch (e) {
    console.error('gemini model discovery failed', e.message);
    candidates = [...new Set([...pinned, 'gemini-2.5-flash', 'gemini-2.5-flash-lite'])];
  }
  return candidates;
}

// Keep "thinking" short: these are quick tasks and long reasoning is what made scans slow.
const thinkingFor = (model) => (/^gemini-2\./.test(model) ? { thinkingBudget: 0 } : { thinkingLevel: 'low' });

async function generate(key, model, { system, user, image, json }, withThinking = true) {
  const parts = [{ text: user }];
  if (image) parts.push({ inlineData: { mimeType: image.mime, data: image.data } });
  const res = await fetch(`${GEMINI}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    signal: AbortSignal.timeout(image ? 30_000 : json ? 30_000 : 12_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: json ? 0.8 : 0.95,
        maxOutputTokens: json ? 8192 : 1024,
        ...(json && { responseMimeType: 'application/json' }),
        ...(withThinking && { thinkingConfig: thinkingFor(model) }),
      },
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    // Some models reject the thinking setting; retry once without it.
    if (res.status === 400 && withThinking && /thinking/i.test(detail)) return generate(key, model, { system, user, image, json }, false);
    throw Object.assign(new Error(`gemini ${model} ${res.status}: ${detail}`), { status: res.status });
  }
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  if (!text) throw new Error(`gemini ${model} empty (${data.candidates?.[0]?.finishReason ?? 'no candidate'})`);
  if (!json) return text.replace(/^["“«]|["”»]$/g, '');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`gemini ${model} returned no JSON`);
  return JSON.parse(match[0]);
}

// Tries models two at a time in parallel and takes the first good answer. The free tier is often
// "overloaded" (503) on one model while another answers fine, so racing pairs is both faster and
// far more reliable than walking the list one by one.
async function callGemini(request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  const models = await modelList(key);
  let lastErr;
  for (let i = 0; i < models.length; i += 2) {
    const pair = models.slice(i, i + 2);
    try {
      return await Promise.any(
        pair.map((m) =>
          generate(key, m, request).catch((e) => {
            console.error('ai attempt failed', e.message);
            throw e;
          }),
        ),
      );
    } catch (agg) {
      lastErr = agg.errors?.[0] ?? agg;
      if (agg.errors?.every((e) => [400, 401, 403].includes(e.status))) break; // bad key/request: other models won't help
    }
  }
  throw Object.assign(lastErr ?? new Error('no gemini model available'), { busy: true });
}

// Free AI text via Google Gemini (motivational notifications).
export async function aiText(profile, lang) {
  return callGemini(buildAiPrompt(profile, lang));
}

// Structured output (meal plans, meal scans); `image` is { mime, data: base64 }.
export async function aiJson(prompt, image) {
  return callGemini({ ...prompt, image, json: true });
}

// Today's plan in the user's time zone; used by /api/meals and the morning cron.
export async function makeMealPlan(state) {
  const lang = state.lang === 'en' ? 'en' : 'ar';
  const day = todayKey(zonedDate(state.tz));
  return normalizePlan(await aiJson(mealPlanPrompt(state, lang, day, state.recentMeals ?? [])), day);
}

export async function readJson(req, limit = 64_000) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > limit) throw Object.assign(new Error('payload too large'), { status: 413 });
  }
  return raw ? JSON.parse(raw) : {};
}

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

export const clientIp = (req) => String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown';

export async function subId(endpoint) {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(endpoint).digest('hex').slice(0, 24);
}
