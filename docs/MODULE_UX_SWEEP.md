# Module UX sweep

A pass across the module families, in the browser and then in the source, looking
for problems that repeat rather than one-off bugs in one room.

**How this was done.** 85 modules resolve to 44 room components plus 24 canvas
definitions plus a 10-module lesson family, so this samples one live module per
mechanic — canvas, negotiation, role-play, superpower, consult, paper study,
résumé, board, PhD explainer, lesson — and then checks each finding against all
44 rooms in the source, because the browser can only show one room at a time and
the interesting claim in every case is "how many rooms do this."

Everything below is measured. Where I could not verify something, it says so.

---

## What the sweep found

The modules are individually good and collectively inconsistent. Nothing here is
a broken feature; it is all the same shape of problem — a shared component exists
and most rooms don't use it, or each room re-implements the same small piece of
chrome its own way. The learner feels this as "every exercise is a slightly
different app."

Two findings are defects rather than inconsistencies, and they lead.

---

## P0 — defects

### 1. Most rooms are English-only, and the app ships nine languages

`messages/` carries `ar, de, en, es, fr, hi, it, pt-BR, zh`. Locale comes from
`profiles.language`, so an org can set it and get a translated shell.

Inside that shell:

| | rooms |
|---|---|
| never call `t()` at all | **21 of 44** |
| call it four times or fewer | 13 more |
| genuinely localised | ~10 |

The 21 with no `t()` call: `DefenseImpact, DiligenceScience, DomainBrief,
DomainScan, Experiment, Explain, FindCofounder, FindCollaborators,
ImpactOptimizer, Interaction, LicensingBrief, Myopia, PaperStudy,
PositionResearch, Quiz, RankDisclosures, Resume, ScoreInvention, VoiceConsult,
VoiceResume, VoiceVision`.

Thirteen rooms also print the step counter as a hard-coded English literal —
`Step {phase + 1} of {STEPS.length}` — bypassing the `t("room.step")` the other
eight use.

A Spanish-speaking learner therefore gets Spanish navigation wrapped around an
English exercise. That reads worse than an all-English product, because it looks
like the translation broke.

*Verified from source, not the browser: switching locale means changing the
user's own profile language, which is an account setting I did not want to touch.
The source evidence is conclusive — a file with zero `t()` calls cannot render
Spanish.*

### 2. The countdown timer has no way out

`components/Timer.tsx` is carefully built — calm amber instead of red, a halfway
tick, `prefers-reduced-motion` respected — and it takes an optional `onAdvance`
that renders a **"Time's up · Next →"** button when the step runs over.

**17 of the 19 rooms that use the Timer never pass `onAdvance`.** Only `Room` and
`WorkflowRoom` do.

So in every other room the clock counts to `0:00`, turns amber, and sits there
for the rest of the module. The step budgets are tight — canvas step 1 is two
minutes to name a workflow — so any learner who actually thinks will hit zero and
then stare at a pulsing amber zero with nothing to do about it. The affordance
that resolves this is already written; it just isn't wired.

The fix is one prop in 17 files.

---

## P1 — consistency the learner notices

### 3. Progress is expressed four different ways

| dialect | example | where |
|---|---|---|
| localised, with a per-step budget | `STEP 1 OF 4 · 2 MIN` | 8 rooms |
| hard-coded, with a budget | `Step 1 of 4 · 4 min` | Earnings and others |
| hard-coded, no budget | `Step 1 of 3` | Superpower, Consult, PaperStudy |
| bare fraction | `1 / 5` | the 10 lesson modules |
| nothing at all | — | Board, Résumé, PhD explainer |

A learner who does two modules back to back sees two different products. Worse,
the "nothing at all" rooms give no sense of length: `ai-board` and
`refresh-resume` open with no stepper, no timer, and no indication of whether
this is a three-minute task or a thirty-minute one.

One shared `<StepHeader n total minutes />` replaces all of it and fixes finding
1's stepper half at the same time.

### 4. The interview turn counter exists in exactly one room

Twelve rooms run an AI interview: `Canvas, CareerRoadmap, Consult, Earnings,
HardConvo, HotSeat, Negotiation, PersonalNetwork, RoleplaySpec, SoloWorkflow,
Superpower, Vision`. All of them are now held to the six-turn budget by the
enforcement in `lib/ai.ts`.

Only `SoloRoom` tells the learner that. It renders six dots and
`Question 3 of about 6`.

In the other twelve, the learner is in an open-ended conversation with no idea
whether it ends in two more questions or twenty. That uncertainty is the single
most common complaint an interview mechanic generates, the budget already exists,
and the marker is about fifteen lines. Lifting it into the shared chat component
is the cheapest real improvement in this document.

---

## P2 — the finish line

### 5. Report pages use three vocabularies for two actions

| report | share | export | back |
|---|---|---|---|
| `/plan` | `Copy share link` | `↧ Save as PDF / print` | `← Done` |
| `/canvas` | `↗ Share` | `↧ Save as PDF / print` | `← Done` |
| `/career` | `↗ Share` | `↧ Save as PDF / print` | `← Done` |
| `/paper-study` | `↗ Share` | `Save as PDF` | **none** |

`/paper-study` has no `← Done`. The wordmark still goes to the dashboard, so it
is not a dead end, but the module ends without an exit.

Pick one label for each action and one footer component.

### 6. Report headlines follow no convention

Four reports, four different ideas of what an `<h1>` is:

- `/plan` — **"Floor Leader, Amplified by Data"** — a named artifact. This is the good one.
- `/canvas` — **"Can LLMs evaluate ideas at scale?"** — the learner's question.
- `/paper-study` — **"Paper deconstruction"** — a generic label, says nothing about *this* paper.
- `/career` — a **30-word sentence** stating the whole thesis, set as the page heading.

The `/plan` pattern is right: name the thing the learner made. The `/career` one
should be demoted to a standfirst under a short title, and `/paper-study` should
carry the paper's own title.

### 7. The first screen front-loads theory

Canvas step 1 opens with a five-sentence paragraph on the GAS framework —
generality, accuracy, simplicity, where advantage comes from — sitting directly
above the single text box, on a two-minute clock, immediately after the learner
dismissed a three-card intro that also explained the module.

That is three explanations before one action. The framing is good writing; it is
in the wrong place. Move it behind the "How this works" chip or under the input,
and let the learner type the workflow first.

---

## P3 — smaller

### 8. Two chrome affordances are hard to reach
`← Exit` renders at 20px tall, below any reasonable target size, and it is the
one irreversible-feeling control on the screen. `How this works` is pinned
bottom-left, which is not where someone who is stuck looks — they look at the top
of the page, near the title.

---

## Order to do them

| # | change | files | why now |
|---|---|---|---|
| 1 | Pass `onAdvance` to `<Timer>` | 17 | A built affordance is dark; learners are stuck at 0:00 today |
| 2 | Lift the turn marker into the shared chat | ~2 + 12 | Six-turn budget already ships; learners can't see it |
| 3 | One `<StepHeader>`, localised | ~21 | Kills the four dialects and the hard-coded English together |
| 4 | Route the 21 silent rooms through `t()` | 21 | Largest job here, but nine locales are shipping today |
| 5 | One report footer, one label per action | 4 | Adds the missing `← Done` |
| 6 | Report `<h1>` convention: name the artifact | 4 | |
| 7 | Demote the theory paragraph below the input | canvas defs | |
| 8 | Exit target size; move the help chip up | 2 | |

Items 1–3 are a day's work and account for most of what a learner would describe
as "inconsistent." Item 4 is the big one and is worth scoping separately.

## What this sweep did not cover

- **Mobile.** The resize changed the browser window but not the page viewport, so
  I have no verified mobile measurements. Worth a separate pass.
- **Report content quality** across families — covered for two modules in
  `LEARNER_TEST.md`, not for the rest.
- **Group and facilitator-run modules**, which need a cohort to exercise.
