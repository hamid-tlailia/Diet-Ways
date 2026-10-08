import { useStore, todayKey } from '../store/useStore';

export const STEP_GOAL = 8000;

// Calories walked off: ~0.5 kcal per kg of body weight per 1,000 steps.
export const stepKcal = (steps, kg) => Math.round(steps * (kg || 70) * 0.0005);

// The Android app (android/…/DietWaysLauncher.kt) opens the site with today's step data in the
// URL: dw_app, dw_perm (granted|denied|unsupported), dw_hist ("2026-10-01:5321,…"), dw_at.
// Save it, then strip those params so they never end up in links or history.
export function captureLaunchParams() {
  const url = new URL(window.location.href);
  const p = url.searchParams;
  if (!p.has('dw_app')) return;

  const days = {};
  for (const pair of (p.get('dw_hist') || '').split(',')) {
    const [d, n] = pair.split(':');
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(+n)) days[d] = Math.max(0, Math.round(+n));
  }
  const prev = useStore.getState().activity;
  const merged = { ...(prev?.days ?? {}), ...days };
  const keep = Object.keys(merged).sort().slice(-14);
  useStore.setState({
    activity: {
      ...prev,
      app: true,
      perm: p.get('dw_perm') || 'unsupported',
      days: Object.fromEntries(keep.map((k) => [k, merged[k]])),
      at: Number(p.get('dw_at')) || Date.now(),
    },
  });

  for (const k of [...p.keys()]) if (k.startsWith('dw_')) p.delete(k);
  const qs = p.toString();
  window.history.replaceState(null, '', url.pathname + (qs ? `?${qs}` : '') + url.hash);
}

// Asks the Android app to enable counting (permission prompt), refresh, or open its settings.
// It reopens this page with fresh data.
export function stepsAction(action) {
  if (action === 'enable') useStore.setState((s) => ({ activity: { ...s.activity, asked: true } }));
  const back = encodeURIComponent(window.location.pathname + window.location.hash);
  window.location.href = `intent://steps?action=${action}&return=${back}#Intent;scheme=dietways;package=com.dietways.app;end`;
}

export const stepsToday = (activity) => activity?.days?.[todayKey()] ?? 0;
