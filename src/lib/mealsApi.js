import { snapshot } from './coach';
import { todayKey } from './dates';

export async function requestMealPlan(state) {
  const res = await fetch('/api/meals', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ state: snapshot(state) }),
  });
  if (!res.ok) throw new Error(res.status === 429 ? 'rate' : 'failed');
  return (await res.json()).plan;
}

let pending = null;
// Makes today's plan once (deduped across callers) when the questionnaire is done and none exists yet.
export function ensureTodayPlan(getState, save) {
  const s = getState();
  if (!s.mealProfile?.done || s.mealPlans[todayKey()] || pending) return pending;
  pending = requestMealPlan(s)
    .then((plan) => (save(plan), plan))
    .finally(() => (pending = null));
  return pending;
}

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('bad image'));
    img.src = url;
  });

const draw = (img, max, quality) => {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
};

// Downscales the photo (keeps uploads small and fast) and asks the server to analyse it.
export async function scanMeal(file, state) {
  const img = await loadImage(file);
  const full = draw(img, 1024, 0.82);
  const thumb = draw(img, 160, 0.7);
  URL.revokeObjectURL(img.src);
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image: full.split(',')[1], mime: 'image/jpeg', state: snapshot(state) }),
  });
  if (!res.ok) throw new Error(res.status === 429 ? 'rate' : 'failed');
  return { ...(await res.json()).scan, thumb };
}
