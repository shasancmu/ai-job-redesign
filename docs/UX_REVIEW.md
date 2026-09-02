# Superadditive — navigation, explanation & bug review

**Date:** 2026-09-02
**Method:** Live walkthrough of `superadditive.app` — logged out (in-app browser) and logged in as Sharique Hasan (real Chrome session) — with every finding traced back to this repo. Deep pass on the path a real user actually walks: landing → library → pick an exercise → run it → report. Lighter sweep of reports, org switching, join flow.

Every bug below was reproduced in the live app **and** confirmed in source. Line numbers are from this working tree.

---

## The one-paragraph version

The exercises themselves are good, and the in-room experience (stepper, timer, progress, "how this works" cards, resume banner) is genuinely well designed. The problems are all *around* the exercises: **the flagship module's AI interview is silently broken in production**; the product has **no global navigation** and **no per-exercise pages**, so its 93-module library is one 77-screen unclickable wall on the landing page and a 4-card list once you're in a cohort; and the best explanatory content in the product is shown only *after* someone has already committed to an exercise, not while they're choosing one.

---

# Part 1 — Bugs

## B1. CRITICAL — "Redesign Your Job with AI" never gets an AI response

The namesake, flagship module's interview step is dead. No opening question, and every message you send disappears into silence — no reply, no error, no retry.

**Reproduced live:** started the module, reached "Step 2 of 4 · Talk to your AI partner", waited. Empty panel. Sent a message; it rendered, then nothing for 18+ seconds. `POST /api/interview` returned **200**. No console errors. Calling the endpoint by hand from the page returns a perfectly good question:

```json
{"reply":"I'd like to understand how your time actually breaks down. Walk me through what a typical week looks like..."}
```

**Root cause — a client/server contract mismatch.** `app/api/interview/route.ts` answers with plain JSON (`Response.json({ reply })`, line 54). But the caller uses the SSE reader:

- `components/SoloRoom.tsx:205` — `streamPost("/api/interview", ...)`
- `lib/streamClient.ts` parses the body as `data:` frames split on `\n\n`. A JSON body has neither, so the loop never matches and it returns `""`.
- `SoloRoom.tsx:206` — `return (reply || acc).trim() || null` → `null`
- `SoloRoom.tsx:225` and `:242` — `if (reply) update(...)` → the failure is swallowed. `setErr` only fires on a thrown exception, and nothing throws.

**Blast radius is exactly one call site.** Every other `streamPost` target is a real SSE route (`/api/consult`, `/api/vision`, `/api/superpower`, `/api/negotiation/reply`, …). `/api/interview` is the only JSON route being read as a stream.

**Fix:** either make the route stream like its siblings, or have `SoloRoom` call it with `fetch` + `res.json()`. Also worth hardening: `streamPost` should throw when it consumes a whole body and finds zero frames, so this class of mismatch can never fail silently again.

---

## B2. HIGH — The timer is frozen on step 1 of every solo exercise

The clock reads `2:00` and never moves. Verified live: unchanged over 8 seconds of polling, and visibly static across several minutes. It starts working on step 2 (`7:55`, `7:30`, `7:13`).

**Root cause:** `Timer.tsx:26` — `const started = startedAt ? new Date(startedAt).getTime() : now;`. When `startedAt` is null, `started` is recomputed as `now` on every 500ms tick, so `elapsed` is permanently 0.

It's null on step 1 because `Catalog.tsx` `startSolo()` inserts a session without `phase_started_at` (`{ code, host_id, status, cohort, exercise }`), and `supabase/schema.sql:51` declares `phase_started_at timestamptz` with no default.

**Every other room defends against this** — `session.phase_started_at || new Date().toISOString()` (CanvasRoom, CareerRoom, ConsultRoom, NegotiationRoom, +12 more). `SoloRoom.tsx:88` is the one that passes it raw.

**Fix:** apply the same fallback at `SoloRoom.tsx:88`. Belt and braces: make `Timer` treat a null `startedAt` as "start now" by capturing it once in a ref, so no future caller can reintroduce a dead clock.

---

## B3. HIGH — A mistyped join code silently dumps you on the marketing homepage

There is no 404 page anywhere in the app (no `app/not-found.tsx`). `app/[code]/page.tsx` is a **root-level catch-all**, so every unrecognized URL falls into the join-code route, which does `redirect("/")` on a bad code (line 38) or an unknown class (line 40).

Verified: `/this-page-does-not-exist` → 302 → marketing homepage, HTTP 200, no message.

**Why this matters more than a normal 404:** the failure mode lands on a student in a live classroom. They're told "go to superadditive.app/ABCDE", they typo it, and they get the *marketing page* — no "that code doesn't exist", no retry field, and no indication they're even in the right place. A signed-in user gets bounced to the signed-out sales pitch. This will read as "the app is broken" during exactly the moment a facilitator can least afford it.

**Fix:** show a real "We couldn't find that code" screen with a code input and a link to the dashboard, rather than redirecting. Add an `app/not-found.tsx`.

---

## B4. MEDIUM — 68 of 86 modules render the same blank circle

`components/ModuleIcon.tsx:178` has a `default:` case that returns a featureless `<circle r="8">`. Only 18 slugs have real icons. **79% of the library falls through to it** — every module in Research & scholarship, The PhD path, Negotiate, Deep-tech, and How AI works.

Visible in the live app: filter to "Negotiation" and "Close a Vendor Deal" / "Negotiate the Rent" are two identical empty rings. Same on the `/reports` cards.

This quietly defeats the card grid's main scanning affordance — the icon is what your eye uses to tell 90 cards apart, and it carries no information for four of the eight categories.

**Fix:** either author the missing icons, or make the fallback derive from the module's *category* (8 distinct glyphs, all already color-coded) so a card at least says what family it's in.

---

## B5. MEDIUM — The dashboard tells cohort members to use filters that aren't rendered

`messages/en.json:12` — *"Hands-on exercises, run by AI. **Filter to what you need**, then start one."* — is shown unconditionally.

But `Catalog.tsx:246` sets `grouped = !moduleSlugs`, and when `grouped` is false the `<ModuleFilters>` block never renders. Verified live: in the Duke CAIO cohort the blurb is on screen with no search box and no pills anywhere on the page.

**Fix:** make the framing copy conditional, or render the filters in class view too (they'd be useful the moment a class has more than a dozen modules).

---

## B6. MEDIUM — Every page in the app is titled "Superadditive"

`app/layout.tsx:34` defines a perfectly good `title: { default, template: "%s · Superadditive" }`, but only **16 of 177 pages** export `metadata` — and none of them are the pages people actually use. `/dashboard`, `/reports`, `/room/*` and every exercise runner all render as bare "Superadditive".

The template demonstrably works: `/for-teams` correctly shows *"Superadditive for L&D, exec ed & in-house academies · Superadditive"*.

**Consequence:** browser history, bookmarks, and a row of open tabs are all indistinguishable. For a product where people run several exercises and keep reports open, this is a real wayfinding cost, and it's close to free to fix.

**Fix:** add `export const metadata` to the app-shell pages; for dynamic rooms use `generateMetadata` to emit the module name.

---

## B7. MEDIUM (a11y) — The "What's this?" dialog traps keyboard users

`Catalog.tsx:317` renders `role="dialog" aria-modal` but:

- **Escape does not close it** (verified live — dialog still open after Escape)
- **focus is never moved into it** (`document.activeElement` stays `BODY`)
- there is no focus trap, so Tab walks the page *behind* the overlay
- no `aria-labelledby`, so a screen reader announces an unnamed dialog

**Fix:** on open, move focus to the close button; add a keydown handler for Escape; restore focus to the triggering card on close; point `aria-labelledby` at the `<h3>`.

## B8. MEDIUM (a11y) — Filter pills don't expose their state

`ModuleFilters.tsx:64` and `:72` render topic/format pills as plain `<button>`s whose selected state is conveyed **only** by `bg-ink text-white`. Verified live: `aria-pressed` is `null` on all of them. A screen-reader user cannot tell which filters are on, and cannot tell that pressing one did anything.

**Fix:** `aria-pressed={topics.has(p.key)}`. One attribute per pill.

## B9. MEDIUM — On mobile, returning users have no "Sign in"

At 375px the landing header's `Sign in` link is `display: none` (verified). Only "Get started" remains. A returning user on a phone — the most likely way someone re-enters after a workshop — has to guess that the signup CTA also contains sign-in.

**Fix:** keep `Sign in` visible at all widths; it's two words.

## B10. LOW — Filtering while scrolled strands you below the results

Filter deep in the library and the list collapses (86 cards → 5), the page shrinks under you, and you're left at the *bottom* of the new results with the filter bar 575px above the viewport. Verified live: `scrollY` 1048 on a now-1764px page — pinned to the footer, no results and no controls in sight.

**Fix:** scroll to the top of the results when the filter set changes. (Largely moot if you make the filter bar sticky — see N4.)

---

# Part 2 — Navigation burden

## N1. There is no global navigation

The only persistent chrome is the logo, an org switcher, and an avatar menu. The avatar menu is the de facto nav:

> Reports · Achievements · Profile · Take a tour · Studio · Cohorts · Organization · Data collection · Admin · Send feedback · Sign out

**It contains no link to the exercise library.** Once you're on `/reports` or `/profile`, the only route back to the thing the product is *for* is the logo or the browser Back button. 177 routes hang off a menu that doesn't mention the main one.

The menu also flattens three different audiences — personal (Reports, Profile), authoring (Studio), administrative (Cohorts, Organization, Admin) — into one ungrouped list.

**Recommendation:** a persistent header with **Exercises · Reports · Achievements**, and move Studio/Cohorts/Organization/Admin behind a labelled "Manage" group in the avatar menu. This is the single highest-leverage navigation change available.

## N2. Cohort members see 4 exercises out of 93, and can't tell that

In the Duke CAIO context the dashboard renders **4 cards**. Switch to "Personal" and it renders **86**. The switcher is the only control that does this, it's labelled with a truncated org name (`Duke CAIO - Rei...`), and nothing on the page suggests it governs which exercises exist.

A member who joins a cohort has no way to discover the other 89 exercises — including the ones the marketing site just advertised to them.

**Recommendation:** under the class list, add an explicit *"Your class assigned these 4. Browse all 93 exercises →"*. Give the switcher a label ("Viewing as") and a full-name tooltip.

## N3. Nothing about where you are is in the URL

Filter state, search text, and the active org context are all local React state (`Catalog.tsx:88-90`, `LandingLibrary.tsx:26-28`). Consequences:

- A filtered view can't be shared — a facilitator can't send "here are the negotiation exercises"
- Back doesn't undo a filter; it leaves the page
- Switching org context doesn't change the URL, so `/dashboard` means something different depending on invisible state, and can't be bookmarked

**Recommendation:** reflect filters and context in the query string (`/dashboard?topic=negotiation&ctx=personal`) and hydrate from it.

## N4. The landing library is one 77-screen wall of unclickable cards

Measured on the live homepage:

| | |
|---|---|
| Page height (desktop) | **68,979px ≈ 77 screens** |
| Page height (375px mobile) | **37,568px ≈ 46 screens** |
| Cards rendered | **96** |
| Links on the whole page | **13** |
| Filter bar | `position: static`, at y=14,011 |

So: a visitor scrolls 14,000px to reach the filters, and once they scroll past them the filters are gone for the remaining 55,000px. And **not one of the 96 cards is clickable** — they're plain `<div class="card">` (`LandingLibrary.tsx:41`). The only interactive elements are the tag chips.

**Recommendation:** make the filter bar sticky; add a category jump-nav (8 anchors); and cap the default view at a few cards per category behind "Show all 14 →".

## N5. There are no exercise pages at all

There is no public, addressable page for any of the 93 exercises. `/e/`, `/m/`, `/n/`, `/nf/`, `/b/` are all *run* routes gated behind `redirect('/login')`.

This costs three separate things:

1. **Nothing is shareable.** You cannot send anyone a link to "The Earnings Call".
2. **No organic acquisition.** 93 pieces of genuinely differentiated content, zero indexable pages. The homepage is the only surface search can see.
3. **No way to evaluate before signing up.** A visitor decides on a two-line tagline.

**Recommendation:** add `/exercise/[slug]` — public, indexable, one per module: what it is, the three intro cards (see E1), a sample artifact, the research it's built on, and "Start free". Link every card in `LandingLibrary` to it.

## N6. Two competing taxonomies on one page

The homepage groups exercises **twice**: `HomeStory` uses *"Rethinking your own role / Managing a team / Building something / On the move"*, then `LandingLibrary` regroups the same modules into eight different categories (*Work & AI, How AI works, Sharpen a decision, …*). Neither is cross-referenced. A reader who latches onto "Managing a team" finds no such heading in the library.

**Recommendation:** make the HomeStory buckets *link into* the library with the matching filter pre-applied, or drop one taxonomy.

## N7. There is nowhere to type a class code

`/join` asks only for your name — the cohort comes from `?cohort=` in the URL. There is no code field on the homepage, on `/join`, or on `/login`. The only way in is a URL handed to you.

This compounds directly with **B3**: the one path into a class is a URL that, when mistyped, silently redirects to the marketing homepage.

Worse, "code" means two unrelated things: a class join code, and the 6-digit email OTP on `/login` (`app/login/page.tsx:212`). A student told "enter your code" who lands on the login screen will enter the wrong one.

**Recommendation:** put a "Have a class code?" field on the homepage and on `/login`, and rename the OTP to "verification code" everywhere.

---

# Part 3 — Explaining things along the way

## E1. The best explainer in the product is shown too late

Inside the room there's a three-card intro — **"What you'll do" / "Where it comes from" / "What you'll leave with"** — that is genuinely excellent. It names the research lineage and the concrete artifact.

But it appears *after* the user has already picked the exercise and entered the room, and it's reachable only through a low-contrast `💡 How this works` link in the bottom-left corner. The moment that content is worth the most is **while someone is choosing**, and at that moment it's nowhere to be seen.

Meanwhile the "What's this?" modal on the catalog card — the thing people actually consult when choosing — shows the name, partner type, minutes, a two-sentence description, and the same pills already on the card. It adds almost nothing.

**Recommendation:** put the three intro cards into the "What's this?" modal. It's existing content, already written per-module, moved to where the decision happens.

## E2. Nothing tells you what to bring

Several modules need material — a résumé, a job description, a workflow, a paper. Nothing says so until you're inside and facing an empty box. "Analyze Your Career's AI Exposure" wants a pasted résumé; you find that out at step 1.

**Recommendation:** a "What you'll need" line on the card and in the modal.

## E3. No one can see what they get

Every module promises "something you keep" — a plan, a map, a redesigned role. No sample is ever shown, anywhere, logged in or out. For an 18–30 minute commitment, the artifact is the entire value proposition and it's invisible until you've earned it.

**Recommendation:** one anonymized example artifact per module on the exercise page (N5) and in the modal. This is probably the single strongest conversion asset the product isn't using.

## E4. The timer arrives unexplained

A prominent monospace countdown appears at the top of every room with no explanation of what happens at zero. (In `WorkflowRoom` it offers a gentle "Time's up · Next →"; `SoloRoom` doesn't pass `onAdvance` at all, so nothing happens.) Users reasonably read a countdown as a hard limit and rush.

**Recommendation:** one line on first entry — *"A pacing guide, not a limit. Nothing happens at zero."*

---

# Part 4 — What's already working

Worth protecting while changing the rest:

- **The room stepper** — "Step 2 of 4 · 8 min", segmented progress bar, Back/Next. Clear and calm.
- **"Pick up where you left off"** with a progress bar and certificate context, plus a "Jump back in" row. Genuinely good re-entry.
- **Interview scaffolding** — "Not sure what to say?" suggestion chips and a "Why we ask" affordance directly answer the two things people get stuck on.
- **Filter semantics are correct** — OR within a group, AND across groups (`lib/modules.ts:1768`). Many products get this wrong.
- **Empty and result states** — live result counts and a helpful "No exercises match" message.
- **Category blurbs** are well written and do real explanatory work.
- **`/reports`** has a proper "Dashboard" link — the one page in the app with a breadcrumb.

---

# Suggested order of work

**Ship first — broken in production:**
1. **B1** — restore the interview in `SoloRoom` (flagship module is non-functional)
2. **B2** — one-line timer fallback
3. **B3** — real "code not found" screen instead of a silent redirect home

**High leverage, low cost:**
4. **N1** — a persistent header with an Exercises link
5. **E1** — move the three intro cards into the catalog modal
6. **B5**, **B6**, **B8**, **B9** — conditional copy, page titles, `aria-pressed`, mobile sign-in
7. **N4** — sticky filter bar + category jump-nav

**Structural:**
8. **N5** — public `/exercise/[slug]` pages (sharing, SEO, pre-signup evaluation)
9. **N2** — "browse all exercises" escape hatch from cohort view
10. **N3** — filters and context in the URL
11. **B4** — category-derived fallback icons
12. **E3** — sample artifacts
13. **N7** — a place to type a class code

---

## Notes on coverage

Reviewed in depth: landing page (logged out, desktop + 375px), login, `/join`, `/for-teams`, dashboard (both cohort and personal context), the catalog and its filters, the "What's this?" modal, a full run of "Redesign Your Job with AI" through step 2, `/reports`, the account menu, and the org switcher.

Not covered — worth a second pass: the facilitator suite (`/facilitator/*`, ~30 routes), the Studio / module builder (`/build`, `/studio`), live in-class activities (`/live`, `/forum`, `/photo`, `/showcase`), paired exercises (`/pair/[slug]`), the paywall, and the admin area. The report/artifact views were seen only as cards, not opened end-to-end — B1 blocked reaching a freshly generated one.

Also worth knowing: the test password for this account was sent in plaintext through a chat transcript. It wasn't needed for this review (the existing browser session was used instead), but it should be rotated.
