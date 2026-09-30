import { snapshot } from './coach';
import { todayKey } from './dates';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// POSTs JSON; when the free AI is busy (503) it waits a moment and tries again once.
async function postAI(url, payload, onRetry) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) return res.json();
    if (res.status === 429) throw new Error('rate');
    if (attempt === 0 && res.status >= 500) {
      onRetry?.();
      await sleep(2500);
      continue;
    }
    throw new Error(res.status === 503 ? 'busy' : 'failed');
  }
}

export async function requestMealPlan(state, onRetry) {
  return (await postAI('/api/meals', { state: snapshot(state) }, onRetry)).plan;
}

export async function requestShoppingList(state, onRetry) {
  const plans = Object.values(state.mealPlans ?? {}).sort((a, b) => (a.date < b.date ? 1 : -1));
  return (await postAI('/api/shopping', { state: snapshot(state), plans: plans.slice(0, 7) }, onRetry)).list;
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
export async function scanMeal(file, state, onRetry) {
  const img = await loadImage(file);
  const full = draw(img, 896, 0.8); // plenty for food recognition, and uploads fast on mobile data
  const thumb = draw(img, 160, 0.7);
  URL.revokeObjectURL(img.src);
  const { scan } = await postAI('/api/scan', { image: full.split(',')[1], mime: 'image/jpeg', state: snapshot(state) }, onRetry);
  return { ...scan, thumb };
}
