# The Studio — an instructor's walkthrough, and what would make it delightful

**Date:** 2026-09-02
**Method:** Walked the Studio on production as a new instructor would — signed in, no prior modules — then traced every friction back to this repo. Built one module each way. Numbers below are measured, not estimated.

---

## The verdict in a paragraph

The Studio's *parts* are better than its *whole*. The editor is genuinely delightful — a live learner preview beside a storyboard, undo/redo, a copilot, an adversarial Critic, a Playtest. The guide is one of the best pieces of writing in the product. The individual start screens are clean.

Three things break it. First, **the moment of hand-off**: the AI writes roughly three thousand words of structure and drops the author into a twelve-tab editor with fifty-one fields and the instruction "Make a few edits, then Publish" — with no indication of which edits matter. That is the point where a new instructor decides this tool is not for them. Second, the Studio is organised around **module types** while an instructor works in **jobs** — make one, assign it, run it, see what happened, sharpen it. The guide describes exactly that loop and the UI embodies it nowhere. Third, two defects override any design discussion: **the main "describe it and build it" path currently fails**, and **a generated draft is lost if you click anything in the header.**

---

## What happened when I tried to build something

I went the way the Create page pushes hardest — "Describe your idea, and build it" — and described a role-play. Then:

- The screen said **"This takes a few seconds"** and cycled confident status lines: *Choosing the right mechanic… Writing the situation your learners will see… Building a rubric that grades the thinking… Setting the guardrails…*
- At ~90 seconds: **"AI request timed out. Try again."**
- I clicked Build again. Same messages, same wait, **same timeout**. Two for two.

Then I built the *same kind of thing* from the Upload page instead. That path showed me the real title being written — *Writing "The Hard Conversation"* — a real progress bar, and a live counter: **68 words drafted → 1,588 → 3,044**. Copy that told the truth: *"Writing it live, so this can take a moment."* At ~110 seconds it dropped me into the editor with a complete, good draft.

Same operation. Two implementations. One is the thing you want to show people; the other is the one the Create page points at.

Then I clicked "Dashboard" to check something, came back, and the draft was gone. **"Your modules — 0 total."**

---

# Priority 0 — Stop losing the author's work

Nothing about layout or vocabulary matters while these are true.

## P0.1 — The primary build path times out. Make it stream.

**The fix already exists in your codebase and isn't wired up.**

`app/api/mechanics/copilot/route.ts:79` supports streaming: `if (body?.stream) return streamSpecResponse(...)`. Five copilot routes do (`copilot`, `analytical-copilot`, `explainer-copilot`, `newsframe-copilot`, `negotiation-copilot`).

`components/AutoBuild.tsx:124` passes `stream: true` — which is why the upload path works, survives past 90 seconds, and shows real word counts.

**All seven `*IntentStart` components pass nothing**, so they block on one request and die at the 55-second AI timeout in `lib/ai.ts:86`:

| Flow | Streams? | Shows fake progress? |
|---|---|---|
| `IntentStart` (role-play) | no | yes |
| `InterviewIntentStart` | no | yes |
| `NegIntentStart` | no | yes |
| `BenchIntentStart` | no | yes |
| `AnalyticalIntentStart` | no | yes |
| `RedesignIntentStart` | no | yes |
| `NewsFrameIntentStart` | no | yes |
| `AutoBuild` (upload path) | **yes** | no — real word count |

**Do:** make the seven IntentStart flows use the streaming path AutoBuild already uses. This is the single highest-value change in the Studio: it converts the most prominent CTA from "fails after 90 seconds" to "watch your module get written."

## P0.2 — A generated draft is lost by navigating away

I waited ~110 seconds for a draft, landed in the editor, clicked a header link, and lost all of it. There is no warning, no autosave, no dirty-state marker.

**None of the eight authoring editors** — `SpecEditor`, `AnalyticalEditor`, `NegEditor`, `BenchEditor`, `ExplainerEditor`, `NewsFrameEditor`, `LiveEditor`, `RedesignEditor` — has autosave, a `beforeunload` guard, or an unsaved indicator.

The irony: the **learner** side protects work carefully. `SoloRoom` and `RedesignRoom` both debounce-autosave the workspace as the learner types. The author, who just spent two minutes generating something, gets nothing.

**Do, in order:** (1) persist the draft the moment generation finishes, before the editor renders — the author never had a chance to save it; (2) autosave on a debounce like the rooms do; (3) show "Saved · 2m ago" / "Unsaved changes" next to the Save button.

## P0.3 — Stop showing progress that isn't real

`IntentStart.tsx:31` rotates a hard-coded list every 1.8 seconds:

```
const t = setInterval(() => setLoadStep((s) => (s + 1) % LOADING.length), 1800);
```

So "Building a rubric that grades the thinking…" is theatre — nothing is being built when it says so. It's also a promise the failure then breaks. And "This takes a few seconds" precedes a 90-second wait.

Streaming (P0.1) fixes this by itself, because AutoBuild's counter is real. Until then, at minimum change the copy to "This usually takes a minute or two."

---

# Priority 1 — Make the hand-off a conversation, not a wall

## P1.0 — Walk the author through what the AI decided, biggest choice first

This is the change most likely to turn the Studio from impressive to delightful.

**What the hand-off looks like today.** My draft arrived as **3,044 words** across **4 scenarios and 5 probes**. `SpecEditor` renders **51 editable controls** (29 inputs, 20 textareas, 2 selects) across **12 tabs**. A role-play spec nests seven collections — roles, probes, scenarios, flow, rubric, report, guardrails — and each scenario alone carries a label, a hidden truth, a narrative, a tell, a foil, and its own dimensions. The guidance for all of it is one line: *"Drafted from your materials. Make a few edits, then Publish."*

Which edits? The editor treats every field as equal. But they are not remotely equal: the hidden truth **is** the module, and the emoji is not. An author with no way to tell those apart does the only rational thing — reads everything, trusts nothing, and gets tired. Reviewing three thousand words of someone else's structure is harder work than writing your own, which is the opposite of the promise.

**What it should be.** After generation, don't open the editor. Open a short review that presents the decisions the AI made, in descending order of how much they determine the module, one at a time:

> **The hidden truth** — 1 of 5
> Your learners will interrogate a faculty member about collapsing enrolment. What they don't know: **the chair reassigned the best TA.**
> *This is the thing the whole exercise turns on.*
> → Keep it · Try a different truth · Write my own

Each step shows **what was chosen**, **why it matters in one line**, and **two or three concrete alternatives** — with *Keep it* as the default so an author who likes the draft can press through in under a minute. Five or six steps, then "Open the editor" for anyone who wants the other forty-five fields.

**The order, for a role-play** — worth arguing about, but roughly:

| # | Decision | Why it leads |
|---|---|---|
| 1 | The learning goal and the aha | Everything else is downstream; wrong here means wrong everywhere |
| 2 | The hidden truth per scenario | The mechanic itself — what makes it a role-play and not a quiz |
| 3 | The character's behaviour | How hard they push is the difficulty dial |
| 4 | The rubric | Decides what counts as good, and what feedback learners get |
| 5 | The decision the learner makes | What they actually walk away having done |
| 6 | Length and format | Real, but recoverable — safe to leave last |

Everything not on that list is a default the author can ignore forever.

**Three things make this cheap to build.** The alternatives are one copilot call away — `/api/mechanics/copilot` already accepts `currentSpec` plus an instruction and returns a revised spec, which is exactly "try a different truth". The **Critic** already produces an adversarial read of a draft; its findings are a natural way to *order* the review — lead with what it flagged. And the **live preview** already in the editor is the perfect right-hand pane for each step: change the truth, watch what the learner sees change.

**Do it per format.** Every mechanic has its own three or four decisions that matter — for a negotiation, the payoff table and the walk-away; for a quiz, the distractors; for an instrument, the scale. The pattern is identical; only the list changes.

---

# Priority 1b — One way in, one vocabulary

## P1b.1 — Collapse the doors

An instructor who wants to make something can currently enter at:

1. `/studio` → "Create a module"
2. `/studio/create` → 9 build CTAs
3. `/studio/upload` → files, "talk it through", **6 more "start from an idea" cards**
4. `/build/start`
5. `/studio/{roleplay,negotiation,benchmark,analytical,redesign,news}/start`
6. `/studio/{live,explainer}/new`

`/studio/create` is 5.1 screens with **55 links** and **nine** build CTAs, eight of which read almost identically — "Describe your idea, and build it", "Describe your negotiation, and build it", "Describe your quiz, and build it"… They differ only by the section heading above them, so a newcomer cannot tell them apart, and the page assumes you already know which mechanic you want. The whole reason someone is on that page is that they don't.

**Do:** make Create *one* question — "What do you want your learners to be able to do?" — with the three paths the guide already names (upload / talk it through / describe it). Let the mechanic be *chosen for you* and shown as a decision you can override. The upload path already does exactly this: it proposes "A difficult conversation · Role-play" and you accept or change it. That interaction should be the front door, not a branch of it.

Keep the per-mechanic start pages — but as destinations you land on, not doors you must choose between.

## P1b.2 — One library, one name

The Create page offers **nine** "Your X →" links: Your modules, role-play modules, negotiations, quizzes, instruments, redesigns, live activities, explainers, desks.

The good news — and this surprised me — is that `lib/studioIndex.ts` already unifies everything, including the `/build` interview modules from a different table. **`/studio/mine` genuinely is "all types in one place."** The fragmentation is purely navigational: the Create page routes people to eight per-type lists instead of the one real one.

**Do:** one "Your modules" everywhere, with a type filter. Delete the other eight links (keep the routes).

## P1b.3 — Cut the vocabulary in half

A newcomer meets all of these in one sitting: *module, shape, template, instrument, desk, redesign, role-play, negotiation, quiz, explainer, live activity, framework desk, probe, scenario, beat, storyboard.*

Several are the same idea wearing different clothes. "Shape" and "template" are used as near-synonyms on one page under three headings — "OR BUILD FROM A TEMPLATE", "OR START FROM A SHAPE", "OR START FROM A TEMPLATE". "Instrument" and "desk" are types that name themselves after nothing else in the product.

**Do:** settle on **module** (the thing) and **format** (its kind), and a **template** as a pre-filled starting module. Retire "shape", "instrument", "desk" from the UI; keep them in the guide as prose if they're useful teaching words.

## P1b.4 — Two authoring surfaces should look like one

`/build` is a separate surface with its own index page, its own list function (`listAuthoredBy`), and its own builder (`ModuleBuilder`), for guided-interview modules. `/studio/*` covers the other formats with `SpecEditor` and friends. From the Create page, one CTA sends you to `/build/start` and the eight others to `/studio/*/start`, with nothing signalling that you've crossed into a different part of the app.

**Do:** bring `/build` under `/studio` in the UI even if the routes stay. An instructor should never learn that distinction.

---

# Priority 2 — Make the loop visible

## P2.1 — Organise the hub by the job, not the artefact

The Studio hub is eleven equal-weight cards in a flat grid, mixing four different jobs with no ordering and no "start here":

> Your modules · Create a module · How to create a module · Author a live prompt · Cohorts · Ask your cohort · Classes · Promotion review · Presentations · Module overview · Guided tour

Your guide already states the right structure, and states it well:

> **Create → Run → Observe → Improve → Reuse**

That is an instructor's actual week. The hub should be those five stages, with the eleven cards placed inside them — Create and Author-a-live-prompt under Create; Cohorts and Classes under Run; Ask-your-cohort and Insights under Observe; Promotion review under Reuse.

The payoff is bigger than tidiness: an instructor who has made one module currently has **no idea what to do next**. Staging the hub answers that without a word of new copy.

## P2.2 — Promote the guide, or inline it

`/studio/guide` is the best explanation of the product I've read in this codebase — what a module is, the loop, the eight formats, where a module lives, the three paths, what makes one good. It's currently the third of eleven undifferentiated cards, and a small "Read the guide" link on Create.

**Do:** for an author with zero modules, make the guide the Studio's front page — or inline its "pick the right format" section directly into Create, where the choice is actually being made. (This is the same pattern as the exercise pages: the right words already exist, one screen too late.)

## P2.3 — Show a first-run path

`/studio/mine` with nothing in it says *"You haven't built anything yet. Create your first module →"*. That's a fine empty state but a wasted moment. A first-timer would be far better served by: build this 3-minute example, run it on yourself, look at the result. One completed loop teaches more than the whole Create page.

---

# Priority 3 — Polish worth doing

- **The idea cards on `/studio/upload` don't look clickable.** My first click just highlighted one and appeared to do nothing; the instruction "Pick one to build it now" sits below the fold in grey. Add a visible affordance per card.
- **"Use my materials exactly · Verbatim / Light touch" shows when no materials were uploaded**, where it controls nothing. Hide it unless files are attached.
- **"Drafted from your materials"** is the editor's banner even when there were no materials.
- **A 12-tab role-play editor** (`SpecEditor.tsx:14`) is a lot on first open. The Storyboard/Fields split plus a tools row is the right instinct — consider hiding Advanced and History until a module has been saved once.
- **The live learner preview should be shouted about.** It's the single most reassuring thing in the Studio and it's unlabelled except for a small "LIVE PREVIEW · what the learner sees".

---

# What's already excellent — don't lose it in a redesign

- **The editor.** Live learner preview beside a storyboard of numbered beats, undo/redo, Validate, and Open-full-run. This is the killer-app part.
- **Critic and Playtest.** An adversarial read of your design, and a simulated strong/weak learner run *before* a real student sees it. I know of no comparable tool in this category.
- **The streaming build** (upload path). Watching a module get written, with a live word count, is the product's best moment.
- **The guide.** Correct, well-written, and already the blueprint for the reorganisation above.
- **The individual start screens.** `/studio/roleplay/start` is one clean input, four examples, and an escape to templates. Nothing wrong with it.
- **The template library.** Nine role-play templates (Earnings Call, Reference Check, Diligence, Investigation…) each with Use / Remix / Preview. Genuinely strong.

---

# The order I'd do it in

| # | Change | Why now |
|---|---|---|
| 1 | Stream the seven IntentStart flows | The main create path fails today; the fix is already written |
| 2 | Persist the draft before the editor renders | A 110-second generation is lost by one click |
| 3 | Autosave + "Saved / Unsaved" in all eight editors | Same failure, slower |
| 4 | Honest progress copy (falls out of #1) | Stop promising "a few seconds" |
| **5** | **Guided review of the draft, biggest decision first** | **The hand-off is where a new instructor gives up. Biggest delight-per-unit-work in the list.** |
| 6 | Create becomes one question, format proposed | Removes eight near-identical CTAs |
| 7 | One "Your modules" everywhere | The unified index already exists |
| 8 | Restage the hub as Create → Run → Observe → Improve → Reuse | Answers "what do I do next" |
| 9 | Guide as the empty-state front page | Best content, currently buried |
| 10 | Vocabulary cut | Cheap, and compounds with 6–8 |
| 11 | The P3 polish list | After the structure is right |

Items 1–4 are engineering with no design decisions in them; I can do those whenever you want.

Item 5 is the one I'd build next after them, and it's mostly assembly rather than invention: the copilot already revises a spec from an instruction, the Critic already ranks what's weak, and the live preview already shows the learner's view. What it needs from you is the *list* — which four or five decisions actually matter per format. That's a judgement about teaching, not about software, and it's yours.

Items 6–9 change what the Studio *is*, and are also yours to call.

---

## Running the smoke test

Every failure in this flow surfaced only under a real two-minute generation, and
each one had to be caught by hand in a browser. `scripts/smoke-roleplay.mjs`
builds a role-play end to end against the live model and asserts on what comes
back, with no browser, auth, or deploy:

```
npm run smoke:roleplay          # ~2 minutes, reads AI_API_KEY from .env.local
npm run smoke:roleplay -- --json   # for CI
```

It reads the prompts out of `app/api/mechanics/copilot/route.ts` and
`lib/mechanics/specStages.ts` rather than copying them, so a prompt change is
exercised rather than missed — and it exits 2 if it can't find them, instead of
quietly checking a stale copy.

The twelve checks are the bugs this flow actually shipped: a spec that truncates,
scenarios that come back empty, a hidden truth with no narrative behind it, a
verdict with no options. Run it before changing generation, not after.

---

## Notes on coverage

Walked: `/studio`, `/studio/create`, `/studio/upload`, `/studio/guide`, `/studio/mine`, `/studio/roleplay/start`, the AutoBuild choose-and-build flow, and the role-play editor. Built one module by each path.

Not covered: Cohorts, Classes, Promotion review, Presentations, Ask-your-cohort, and the Insights/Critique/Playtest tools in depth — these are the "Run" and "Observe" halves of the loop and deserve their own pass. I also could not evaluate the returning-author experience, since the account has no saved modules.

One housekeeping note: I created a draft named **"The Hard Conversation"** while testing. It was discarded by the very bug described in P0.2, so there is nothing to clean up — but if a stray `TEST DRAFT (Claude UX review)` role-play ever surfaces, it's mine.
