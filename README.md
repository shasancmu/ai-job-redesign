# Reimagine Your Job

A ~30-minute paired exercise for two people in a Zoom breakout room. You and a
partner interview each other, then redesign each other's jobs around the
**2×4 AI × Human model** — what AI should do (Search / Structure / Think /
Translate) and what must stay human (Lead / Own / Judge / Integrate).

Based on the "Reimagine Your Job" exercise by Prof. Sharique Hasan, Duke Fuqua.

Stack: **Next.js 14** (App Router) · **Supabase** (accounts + Postgres +
Realtime) · deploy on **Vercel**.

---

## The 30-minute flow

| Step | Time | What happens |
|---|---|---|
| 1. Your job today | 2 min | Each person names their own job — their partner will redesign it. |
| 2. Interview | 8 min | Talk on Zoom, 4 min each way. Take notes on your partner. |
| 3. Their real job | 4 min | Capture what they're really trying to achieve. |
| 4. Redesign (2×4) | 8 min | Sort their work into AI vs. Human, write their new job description. |
| 5. Share & feedback | 6 min | **The reveal** — read the redesign your partner made of *your* job, and react. |
| 6. The reimagined job | 2 min | Fold in the feedback, write the final one-paragraph job. |

Both partners stay in sync automatically — one shared timer, one shared room.

---

## Deploy it (about 15 minutes, all free tier)

You need two free accounts: **Supabase** (database + accounts) and **Vercel**
(hosting). You create these yourself.

### 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick a name,
   a strong database password, and a region near your participants.
2. When it's ready, open **SQL Editor → New query**, paste the entire contents
   of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This
   creates the tables, security rules, and realtime.
3. Open **Project Settings → API** and copy two values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Recommended for workshops:** turn off email confirmation so participants can
sign up and start immediately. In Supabase go to **Authentication → Sign In /
Providers → Email** and disable **"Confirm email"**. (If you leave it on,
participants must click a link in their inbox before signing in.)

**For guest join (no account):** in Supabase → **Authentication → Sign In /
Providers**, enable **Anonymous sign-ins**. This powers the "Join as a guest"
flow so attendees can start with just their name.

### 2. Push the code to GitHub

From this folder:

```bash
git init && git add . && git commit -m "Reimagine Your Job app"
```

Then create an empty GitHub repo and push to it (GitHub shows you the exact
`git remote add` / `git push` commands after you create the repo).

### 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import your
   GitHub repo. Vercel auto-detects Next.js — no build settings to change.
2. Under **Environment Variables**, add the two values from Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Click **Deploy**. You'll get a live URL like
   `https://your-app.vercel.app`.

### 4. Point Supabase auth at your live URL

In Supabase → **Authentication → URL Configuration**, set **Site URL** to your
Vercel URL and add `https://your-app.vercel.app/**` to **Redirect URLs**. This
makes email confirmation / password reset links work.

Done. Share the URL with your cohort.

---

## Facilitator dashboard (keeping cohort data)

Run the exercise for a named event and see every pair's responses in one place.

### How sessions get grouped

Each room can carry a **cohort code** (e.g. `EXECED-XYZ-DATE`). Two ways to set it:

- **Share a pre-tagged link** with your group:
  `https://your-app.vercel.app/dashboard?cohort=EXECED-XYZ-DATE` — the code is
  pre-filled when they open a room.
- Or attendees type the code into the **"Cohort / event code"** field on the
  Open-a-room card.

### Turn on the facilitator view

1. Set `ADMIN_EMAILS` (comma-separated) to the emails allowed to see all data —
   e.g. `ADMIN_EMAILS=shasanx@gmail.com`.
2. Make sure `SUPABASE_SERVICE_ROLE_KEY` is set (Supabase → Project Settings →
   API → service_role). The facilitator view reads across all users, so it needs
   this. Keep it secret — server-side only.
3. Redeploy. A **Facilitator** button appears on your dashboard.

At `/facilitator` you'll see each cohort with pair/participant/completion counts.
Click a cohort to read every participant's full responses — their job, their
redesign of their partner (the 2×4 split, new job description, final version),
and the feedback they received — and **Export CSV** for the whole cohort (one
row per participant, opens cleanly in Excel).

From a cohort you also get:

- **● Live cockpit** (`/facilitator/live`) — every breakout room on one screen
  (which step, live timer, who's stuck/done). **Move everyone to a step** with one
  click, and **send a nudge** banner to all rooms ("2 minutes left"). Great to run
  from the front of the room.
- **Aggregate** — a live, projectable view of what the whole room handed to AI vs.
  kept human: a word cloud of "what humans are for" and top-verb bar charts. Use it
  as your Mentimeter moment.

Access is gated to the emails in `ADMIN_EMAILS`, checked on the server. Regular
participants can only ever see their own sessions.

---

## Charging a one-time fee (optional)

The app has a built-in **hard paywall**: sign up → pay once → get in. It stays
**completely dormant until you add Stripe keys**, so you can launch free and
turn on payments later without touching code.

### Turn it on

1. Create a free [Stripe](https://stripe.com) account and add your bank details
   (only you can do this — it's your money).
2. In Stripe → **Product catalog → Add product**, create your product with a
   **one-time** price (e.g. $20). Copy the **Price ID** (`price_...`).
3. In Stripe → **Developers → API keys**, copy your **Secret key** (`sk_...`).
4. In Stripe → **Developers → Webhooks → Add endpoint**:
   - URL: `https://your-app.vercel.app/api/stripe/webhook`
   - Event: `checkout.session.completed`
   - After creating it, copy the **Signing secret** (`whsec_...`).
5. In Supabase → **Project Settings → API**, copy the **service_role** key
   (this is secret — it's how the webhook records who paid).
6. Add all of these as environment variables in Vercel (**Settings → Environment
   Variables**), then redeploy:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_ID`
   - `STRIPE_WEBHOOK_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`

That's it — new users now hit the paywall before they can open or join a room.
Paid status lives in an `entitlements` table that only the server can write, so
users can't unlock access from the browser.

### Comping students / free codes

Checkout has promo codes enabled. In Stripe → **Product catalog → Coupons**,
create a **100%-off coupon** and a promo code (e.g. `FUQUA`). Hand it to your
class — they enter it at checkout and pay nothing; everyone else pays full price.

> Note: charging enrolled students for required coursework can run into
> university/bursar rules. A comp-everyone code (or leaving payments off for your
> class and charging only external attendees) is often the safer choice.

---

## Running it in a workshop

1. Everyone signs in (or creates an account) at your URL.
2. In each Zoom breakout room, **one** person clicks **Open a room**, picks the
   exercise (**Reimagine your job** or **Reimagine a workflow**), and reads the
   5-character code to their partner.
3. The partner clicks **Join a room** and enters the code.
4. They move through the steps together — either person can press **Next**, and
   both screens stay in sync. The shared timer keeps everyone on pace.

Every redesign is saved to both accounts and can be reopened from the dashboard.

---

## Running locally (optional)

Requires **Node.js 18.18+** (install from [nodejs.org](https://nodejs.org) if
you don't have it).

```bash
npm install
cp .env.local.example .env.local   # then fill in your Supabase values
npm run dev
```

Open <http://localhost:3000>. For local sign-in to work with email
confirmation, either disable confirmation (see above) or add
`http://localhost:3000/**` to Supabase Redirect URLs.

---

## Project map

```
app/
  page.tsx                 landing page
  login/                   sign in / sign up
  dashboard/               open or join a room; your saved sessions
  room/[code]/             the live exercise
  auth/                    callback + sign-out routes
components/
  Room.tsx                 realtime orchestrator (timer, sync, phase nav)
  Timer.tsx                shared countdown
  phases/                  one component per step of the exercise
lib/
  exercise.ts              the 30-min flow + the 2×4 model + verb banks
  supabase/                client/server helpers
supabase/schema.sql        run this once in the Supabase SQL editor
```

To change the timing or wording of the exercise, edit `lib/exercise.ts` — the
phases, the 2×4 cells, and the verb banks all live there.
