import { buildAiPrompt } from '../src/lib/coach.js';
import { mealPlanPrompt, normalizePlan } from '../src/lib/meals.js';
import { todayKey, zonedDate } from '../src/lib/dates.js';

export { allow } from './_store.js';

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
let candidates = null;

// Free-tier "flash" models the key can use, newest stable first; GEMINI_MODEL (if set) is tried first.
async function modelList(key) {
  if (candidates) return candidates;
  const pinned = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : [];
  try {
    const res = await fetch(`${GEMINI}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
    if (!res.ok) throw new Error(`gemini models ${res.status}`);
    const { models = [] } = await res.json();
    const version = (n) => Number(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
    const found = models
      .map((m) => ({ id: m.name.replace(/^models\//, ''), methods: m.supportedGenerationMethods ?? [] }))
      .filter((m) => m.methods.includes('generateContent') && /^gemini-[\d.]+-flash/.test(m.id) && !/image|tts|audio|live|exp/.test(m.id))
      .sort(
        (a, b) =>
          Number(a.id.includes('lite')) - Number(b.id.includes('lite')) || // full flash before lite
          Number(a.id.includes('preview')) - Number(b.id.includes('preview')) || // stable before preview
          version(b.id) - version(a.id) ||
          a.id.length - b.id.length,
      )
      .map((m) => m.id);
    candidates = [...new Set([...pinned, ...found])].slice(0, 4);
  } catch (e) {
    console.error('gemini model discovery failed', e.message);
    candidates = [...new Set([...pinned, 'gemini-2.5-flash', 'gemini-2.5-flash-lite'])];
  }
  return candidates;
}

async function generate(key, model, { system, user, image, json }) {
  const parts = [{ text: user }];
  if (image) parts.push({ inlineData: { mimeType: image.mime, data: image.data } });
  const res = await fetch(`${GEMINI}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    signal: AbortSignal.timeout(json ? 45_000 : 15_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: json ? 0.8 : 0.95, maxOutputTokens: json ? 8192 : 2048, ...(json && { responseMimeType: 'application/json' }) },
    }),
  });
  if (!res.ok) throw Object.assign(new Error(`gemini ${model} ${res.status}: ${(await res.text()).slice(0, 160)}`), { status: res.status });
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

// Calls Gemini, moving to the next model when one is busy (503/429), retired (404) or returns bad output.
// Throws when nothing works so callers can fall back.
async function callGemini(request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  let lastErr;
  for (const model of await modelList(key)) {
    try {
      return await generate(key, model, request);
    } catch (e) {
      lastErr = e;
      console.error('ai attempt failed', e.message);
      if (e.status === 400 || e.status === 401 || e.status === 403) break; // bad key/request: other models won't help
    }
  }
  throw lastErr ?? new Error('no gemini model available');
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
