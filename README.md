# Diet Ways · دايت وايز

A bilingual (Arabic / English) smart diet companion built with React + Vite.

## Features
- **4 science-backed plans**: Intermittent Fasting, Mediterranean, Keto, High-Protein. Each has an overview, benefits, method, sample day, allowed and avoided foods, exercises and cautions.
- **Fasting timer**: 7 protocols (12:12 → 36h) with start/stop and a live progress ring. 8 metabolic stages each have a hand-drawn emblem that draws itself when that stage begins. Tap any stage for an explanation and a tip.
- **Day / night motivational themes**: "Sunrise Energy" by day, "Aurora Calm" by night. They switch automatically at 6 AM and 6 PM, or you can pick one yourself.
- **Smart coach**: tracks which plans, stages and sections you explore, plus your streak, mood and water. It turns that into personal insights and motivation.
- **AI notifications**: with an Anthropic API key (Settings), Claude writes motivational messages tailored to your plan and context. Without a key, a local coach generates them. Messages arrive as in-app toasts and system notifications, periodically and at every new fasting stage.
- **No backend**: all state lives in a persisted Zustand store (localStorage).

## Run
```bash
npm install
npm run dev      # development
npm run build    # production build in dist/
```

> Note: the API key is stored in the browser and used for direct browser → Anthropic calls. This is fine for personal use. For a public deployment, move the call behind a small server endpoint.
