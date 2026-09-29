import { Redis } from '@upstash/redis';
import Anthropic from '@anthropic-ai/sdk';
import { buildAiRequest, readAiText } from '../src/lib/coach.js';

let redis;
export function db() {
  if (redis !== undefined) return redis;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

let anthropic;
export async function claudeText(profile, lang) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  anthropic ??= new Anthropic();
  return readAiText(await anthropic.beta.messages.create(buildAiRequest(profile, lang)));
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

// Fixed-window limiter; a no-op when no Redis is configured.
export async function allow(key, max, windowSec) {
  const r = db();
  if (!r) return true;
  const k = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const n = await r.incr(k);
  if (n === 1) await r.expire(k, windowSec);
  return n <= max;
}

export const clientIp = (req) => String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown';

export async function subId(endpoint) {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(endpoint).digest('hex').slice(0, 24);
}
