# FocusFlow — Deployment Guide

## What you have
A full Next.js 14 app with:
- Google OAuth + magic link login (Supabase Auth)
- Real AI task classification using Claude
- AI schedule builder (respects your 9–12 deep work block)
- AI weekly insights that learn from your history
- Pomodoro timer with session logging
- Carry-over engine for unfinished tasks
- PWA — installs on iPhone/Android from the browser
- Offline support via service worker

---

## Step 1: Supabase (database + auth) — free

1. Go to https://supabase.com → New project (free tier)
2. Copy your **Project URL** and **anon public key** from Settings → API
3. Go to **SQL Editor** → paste the entire contents of `lib/schema.sql` → Run
4. To enable Google login: Authentication → Providers → Google → enable it
   - Create OAuth credentials at https://console.cloud.google.com
   - Add your Vercel URL to the allowed redirect URLs

---

## Step 2: Anthropic API key

1. Go to https://console.anthropic.com
2. Create an API key
3. Add billing (pay-as-you-go — classifying a day's tasks costs ~$0.01)

---

## Step 3: Deploy to Vercel — free

1. Push this folder to a GitHub repo
2. Go to https://vercel.com → Import repository
3. Add these environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ANTHROPIC_API_KEY=sk-ant-...
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```
4. Deploy — takes ~2 minutes

---

## Step 4: Install as PWA on your phone

**iPhone (Safari):**
1. Open your Vercel URL in Safari
2. Tap the Share button → "Add to Home Screen"
3. Done — it's now an app icon on your home screen

**Android (Chrome):**
1. Open your Vercel URL in Chrome
2. Tap the 3-dot menu → "Add to Home Screen"
3. Or wait for the install prompt to appear automatically

---

## Local development

```bash
cp .env.local.example .env.local
# Fill in your keys

npm install
npm run dev
# Open http://localhost:3000
```

---

## File structure

```
focusflow/
├── app/
│   ├── api/tasks/
│   │   ├── classify/route.js   ← AI task classification
│   │   ├── schedule/route.js   ← AI schedule builder
│   │   └── insights/route.js   ← AI weekly insights
│   ├── auth/callback/route.js  ← OAuth callback
│   ├── dashboard/page.js       ← Main app (server component)
│   ├── login/page.js           ← Login page
│   ├── layout.js               ← Root layout + PWA setup
│   └── globals.css
├── components/
│   ├── DashboardClient.js      ← Main interactive shell
│   ├── Nav.js                  ← Navigation bar
│   ├── MorningScreen.js        ← Task input + AI classify
│   ├── TodayScreen.js          ← Timeline + progress
│   ├── WeeklyScreen.js         ← Review + AI insights
│   ├── PomodoroModal.js        ← Focus timer
│   └── Toast.js
├── lib/
│   ├── supabase.js             ← Supabase clients
│   ├── tasks.js                ← Data helpers
│   └── schema.sql              ← Run this in Supabase SQL editor
├── public/
│   ├── manifest.json           ← PWA manifest
│   └── sw.js                   ← Service worker (offline)
└── README.md
```

---

## What the AI actually does

**classify:** Sends your brain-dump + your last 50 tasks to Claude. It reads your patterns (what you call "high", what you finish vs carry over) and classifies new tasks accordingly. Gets smarter the more you use it.

**schedule:** Sends your classified tasks + your preferences (9–12 deep work block) to Claude. It builds a realistic time-blocked day, protecting your deep work window and batching medium/low tasks.

**insights:** Every week, Claude reads your full task history, completion rates, carry-over patterns, and focus sessions. It gives you 3–4 specific, honest insights — no fluff.

---

## Next steps (Phase 2)
- Google Calendar integration (auto-import meetings, protect deep work)
- Notion sync (push completed tasks)
- Slack notifications (block-start reminders)
- Custom deep work window settings per user
- Mobile-native app (React Native) if needed
