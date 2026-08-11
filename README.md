# Community Scheduler

Write a post once, let AI adapt it for each community's tone, and schedule
it to your own connected accounts (Reddit to start). No spam bots, no
posting to places you're not a real member of — everything runs through
your own OAuth token.

This is a **working MVP scaffold**, not a finished product. It's meant to
be a real foundation you build on, not a toy demo.

---

## What's included

- Email/password auth with sessions (JWT in an httpOnly cookie)
- SQLite database — zero setup, no external DB server needed
- Reddit OAuth connect flow (using your own Reddit "app" credentials)
- Discord posting via incoming webhooks (no bot approval needed)
- AI-assisted post adaptation per destination (Claude via Anthropic API)
- A basic self-promo rule risk-checker before you post
- A scheduler that submits due posts (triggered by an external cron hitting one endpoint)
- Stripe subscriptions: free tier (1 connection, 5 scheduled posts/month) vs. Pro (unlimited)
- Compose / Connect / Queue / Billing pages

## What's NOT included yet (you'll want to add these)

- Email verification / password reset
- Rate limiting on the API routes
- A real, comprehensive per-subreddit rule database (the current check is a simple keyword flag — not a substitute for reading each subreddit's actual rules)
- A Discord bot for reading channel context (webhooks are one-way — post only, can't read replies)
- Usage analytics / dashboards

---

## 1. Install dependencies

```bash
cd community-scheduler
npm install
```

## 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

### `JWT_SECRET` and `CRON_SECRET`
Generate random strings for both:
```bash
openssl rand -base64 32
```

### Reddit API credentials
1. Go to https://www.reddit.com/prefs/apps
2. Click "create another app..." at the bottom
3. Choose **"web app"** (not script, not installed app)
4. Set the redirect URI to exactly: `http://localhost:3000/api/auth/reddit/callback`
5. After creating it, copy the client ID (under the app name) and secret into `.env.local`

### Anthropic API key
1. Go to https://console.anthropic.com/settings/keys
2. Create a key, paste it into `ANTHROPIC_API_KEY`

### Stripe (billing)
1. Go to https://dashboard.stripe.com/apikeys — copy the **test mode** secret key into `STRIPE_SECRET_KEY` while developing
2. Go to https://dashboard.stripe.com/products, create a product ("Pro"), add a recurring monthly price, copy the **price ID** (starts `price_...`) into `STRIPE_PRICE_ID`
3. For local webhook testing, install the Stripe CLI and run:
   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```
   This prints a webhook signing secret starting `whsec_...` — put that in `STRIPE_WEBHOOK_SECRET`
4. In production, add a real webhook endpoint at `https://yourdomain.com/api/billing/webhook` in the Stripe dashboard, subscribed to `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted` — use the signing secret it gives you

### Discord
No setup needed in advance — users connect by pasting a webhook URL they
create themselves from within Discord (Channel Settings → Integrations →
Webhooks). Instructions are shown right on the `/connect` page.

## 3. Run it

```bash
npm run dev
```

Visit http://localhost:3000

## 4. Try the flow

1. Sign up at `/login`
2. Go to `/connect`, click "Connect Reddit" — you'll be sent to Reddit to approve access, then redirected back
3. Go to `/compose`, write something, set a destination like `r/test` (use r/test while you're testing so you don't spam a real community), click "AI-adapt for this destination"
4. Review the adapted draft and the self-promo risk warning
5. Pick your connection, set a schedule time (even a minute from now), click "Schedule post"
6. Trigger the scheduler manually to test it immediately:

```bash
curl -X POST http://localhost:3000/api/run-scheduler \
  -H "x-cron-secret: YOUR_CRON_SECRET_FROM_ENV"
```

7. Check `/queue` to see the status change to "posted" (or "failed" with an error message if something went wrong)

## 5. Running the scheduler automatically

The scheduler doesn't run itself — something external needs to call
`POST /api/run-scheduler` every few minutes. Options:

- **Local testing**: a cron job on your machine calling curl (see above)
- **Free external cron pinger** (e.g. cron-job.org) hitting your deployed URL
- **Vercel Cron** if you deploy on Vercel — add a `vercel.json` cron config pointing at `/api/run-scheduler`

Always send the `x-cron-secret` header matching your `CRON_SECRET` env var —
without it the endpoint returns 401.

---

## Important things to know before you use this for real

**This posts to real subreddits with your real Reddit account.** Test with
a throwaway subreddit like `r/test` first. Every subreddit has its own
self-promotion rules — the built-in risk checker is a basic keyword flag,
not a replacement for reading a subreddit's actual sidebar/wiki rules.
Getting your Reddit account banned for violating community rules is a real
risk if you skip this step.

**Reddit's API has rate limits and requires a registered User-Agent.**
The current code uses a generic user agent string in `lib/reddit.js` —
change `"community-scheduler/0.1 by yourusername"` to include your actual
Reddit username, which Reddit's API terms require.

**SQLite is fine for one user or early testing, but won't scale past a
handful of concurrent users.** If you get real signups, plan to migrate to
Postgres (the schema in `lib/db.js` translates directly).

**No payments are wired up yet.** Before you can charge people, you'll
need to add Stripe subscriptions and gate features (e.g. free tier = 1
connection + 5 scheduled posts/month; paid tier = more).

---

## Suggested next build steps, in order

1. Test the full loop end-to-end with a throwaway subreddit
2. Add a "suggest relevant communities" AI feature based on post content
3. Add email verification and password reset
4. Add rate limiting to public API routes

---

## Hosting: GitHub + Vercel

### 1. Push the code to GitHub

```bash
cd community-scheduler
git init
git add .
git commit -m "Initial commit"
```

Create a new empty repo at https://github.com/new (don't initialize it with
a README — you already have one), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

`.env.local` is already in `.gitignore` — your secrets won't be pushed.
Double check `git status` doesn't show `.env.local` before your first
commit, just to be safe.

### 2. Deploy on Vercel (easiest path for Next.js)

1. Go to https://vercel.com, sign up/log in with GitHub
2. Click "Add New... → Project", select your repo
3. Vercel auto-detects Next.js — no build config needed
4. Before deploying, add all your environment variables (Settings →
   Environment Variables): `JWT_SECRET`, `CRON_SECRET`,
   `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_REDIRECT_URI`,
   `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`,
   `STRIPE_WEBHOOK_SECRET`
5. Update `REDDIT_REDIRECT_URI` to your real deployed URL, e.g.
   `https://your-app.vercel.app/api/auth/reddit/callback` — and update
   this same redirect URI in your Reddit app settings at
   https://www.reddit.com/prefs/apps
6. Update your Stripe webhook endpoint (dashboard → Webhooks) to point at
   `https://your-app.vercel.app/api/billing/webhook`, and put the new
   signing secret it gives you into `STRIPE_WEBHOOK_SECRET` on Vercel
7. Click Deploy

### 3. Important: SQLite on Vercel

**This is the one real gotcha.** Vercel's serverless functions have an
ephemeral, read-only-ish filesystem — a SQLite file written during one
request isn't guaranteed to persist or be visible to the next request.
This scaffold's SQLite setup works great for local dev and single-server
hosting (e.g. a $5/mo VPS on Railway, Render, or Fly.io, or a DigitalOcean
droplet), but **will not reliably persist data on Vercel**.

Your two options once you're ready to actually launch:
- **Easiest**: deploy instead to Railway, Render, or Fly.io — all support
  persistent disk for a Node app, so the SQLite file just works, and their
  free/cheap tiers are fine for early traction
- **More scalable**: swap SQLite for a hosted Postgres (Vercel Postgres,
  Supabase, or Neon all have generous free tiers) — the schema in
  `lib/db.js` maps over almost directly, the main change is swapping
  `better-sqlite3` calls for a Postgres client (e.g. `pg` or an ORM like
  Prisma)

If you want to stay on Vercel, I'd recommend moving to Postgres before you
have real users depending on this — happy to do that migration next if
you want to go that route.

### 4. Set up the cron

Once deployed, the scheduler still needs something external calling
`POST /api/run-scheduler` every few minutes:
- **Vercel**: add a `vercel.json` with a Cron entry pointing at
  `/api/run-scheduler` (Vercel Cron is built in, free tier allows daily
  jobs, paid tier for more frequent)
- **Railway/Render/Fly.io**: use their built-in cron/scheduled job feature,
  or an external free pinger like cron-job.org hitting your endpoint with
  the `x-cron-secret` header
