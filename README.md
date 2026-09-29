# Diet Ways · دايت وايز

A bilingual (Arabic / English) smart diet companion built with React + Vite.

## Features
- **4 science-backed plans**: Intermittent Fasting, Mediterranean, Keto, High-Protein. Each has an overview, benefits, method, sample day, allowed and avoided foods, exercises and cautions.
- **Fasting timer**: 7 protocols (12:12 → 36h) with start/stop and a live progress ring. 8 metabolic stages each have a hand-drawn emblem that draws itself when that stage begins. Tap any stage for an explanation and a tip.
- **Day / night motivational themes**: "Sunrise Energy" by day, "Aurora Calm" by night. They switch automatically at 6 AM and 6 PM, or you can pick one yourself.
- **Smart coach**: tracks which plans, stages and sections you explore, plus your streak, mood and water. It turns that into personal insights and motivation.
- **AI notifications (free)**: Google Gemini (free tier) writes motivational messages tailored to your plan and context. Without a key, a local coach generates them. Messages arrive as in-app toasts and system notifications, periodically and at every new fasting stage.
- **No backend**: all state lives in a persisted Zustand store (localStorage).

## Run locally
```bash
npm install
npm run dev      # UI only; the /api functions run on Vercel
npm run build
```

## Architecture
| Part | Where |
|---|---|
| UI, state (Zustand + localStorage), offline PWA | `src/`, `public/sw.js` |
| AI messages via Gemini, with the key kept on the server | `api/coach.js`, `api/_lib.js` |
| Push subscribe / sync / inbox | `api/push.js` |
| Stage, goal and motivation push delivery | `api/cron.js`, triggered every 10 min by `.github/workflows/notify.yml` |
| Device subscriptions (the only server-side data) | Postgres (Neon via Vercel Storage), tables `dw_*` created automatically |

## Deploy (Vercel)
1. Import this repo in Vercel (framework: Vite).
2. Storage → connect a **Neon Postgres** database (free). This sets `DATABASE_URL`.
3. Environment variables:
   - `GEMINI_API_KEY`: free key from https://aistudio.google.com/apikey (optional `GEMINI_MODEL` to pin a model; by default the newest stable Flash model is picked)
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`: generate with `npx web-push generate-vapid-keys`
   - `VAPID_SUBJECT`: `mailto:you@example.com`
   - `CRON_SECRET`: any long random string
4. GitHub repo → Settings → Secrets and variables → Actions:
   - secret `CRON_SECRET` (same value as above)
   - optional variable `APP_URL` (defaults to `https://diet-plans-latest.vercel.app`)

Without a database/VAPID the app still works: notifications then fire only while the app is open. Without `GEMINI_API_KEY` the built-in local coach writes the messages.

On iPhone, web push works only after **Share → Add to Home Screen** (iOS 16.4+).
