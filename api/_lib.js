import { buildAiPrompt } from '../src/lib/coach.js';

export { allow } from './_store.js';

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
let geminiModel = process.env.GEMINI_MODEL || null;

// Picks the newest stable "flash" model the key can use (free tier), unless GEMINI_MODEL is set.
async function pickModel(key) {
  if (geminiModel) return geminiModel;
  const res = await fetch(`${GEMINI}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
  if (!res.ok) throw new Error(`gemini models ${res.status}`);
  const { models = [] } = await res.json();
  const version = (n) => Number(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
  const usable = models
    .map((m) => ({ id: m.name.replace(/^models\//, ''), methods: m.supportedGenerationMethods ?? [] }))
    .filter((m) => m.methods.includes('generateContent') && /^gemini-[\d.]+-flash/.test(m.id) && !/lite|image|tts|audio|live|exp/.test(m.id));
  usable.sort(
    (a, b) =>
      version(b.id) - version(a.id) ||
      Number(a.id.includes('preview')) - Number(b.id.includes('preview')) ||
      a.id.length - b.id.length,
  );
  geminiModel = usable[0]?.id ?? 'gemini-2.5-flash';
  return geminiModel;
}

// Free AI text via Google Gemini. Throws when not configured so callers fall back to the local coach.
export async function aiText(profile, lang) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  const { system, user } = buildAiPrompt(profile, lang);
  const model = await pickModel(key);
  const res = await fetch(`${GEMINI}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.95, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) {
    if (res.status === 404) geminiModel = process.env.GEMINI_MODEL || null; // model retired: rediscover next time
    throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? '')
    .join('')
    .trim()
    .replace(/^["“«]|["”»]$/g, '');
  if (!text) throw new Error(`gemini empty (${data.candidates?.[0]?.finishReason ?? 'no candidate'})`);
  return text;
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
