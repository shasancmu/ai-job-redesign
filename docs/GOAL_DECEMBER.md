# 1,000 by December

## Short answer

**Reachable, but not from the pipeline as listed — and it's the wrong number to
optimise.**

Two of the eight channels won't produce a single user by December. And at today's
completion rate, 1,000 users is 150 people who finished something, which is not
an asset you can sell to Duke CE.

---

## Where you actually stand

From `/admin/usage`, all time:

| | |
|---|---|
| Users | **37** |
| Runs | 654 |
| Completed | **99** |
| Completion | **15%** |

1,000 by December is a **27× increase in four months**.

The 15% is real behaviour, and it was tested twice.

The obvious objection is that completion is under-counted: rooms mark a session
`done` when the learner reaches the *last step*, and several modules build their
artifact one step earlier (SoloRoom makes the reimagined role at step 3 of 4 and
marks done at step 4, "Make it real"). Someone who finished the work and closed
the tab would look like a drop-out.

That theory is wrong. Measuring the thing itself — did this run produce an
artifact — `/api/admin/completion` returns **8 runs out of 654** that finished
without being counted. On the flagship modules the two measures agree exactly:

| module | counted | actually made something |
|---|---|---|
| Redesign Your Job with AI | 9% | **9%** |
| Analyze Your Career's AI Exposure | 18% | **18%** |
| Find Where AI Fits a Workflow | 5% | **5%** |
| Plan a Deep-Tech Venture | 3% | **3%** |

That agreement is the strong result. **People are not finishing and failing to be
counted — they are leaving before they make anything at all.** The drop-off is in
the setup and the interview, not at a trailing step.

(The platform-wide artifact figure reads 10% rather than 15% because group
activities — the live benchmark, the network map — are marked done by design and
produce no personal artifact. For individual modules, use the per-module rows.)

Per module it's worse than the average suggests:

| module | runs | finished |
|---|---|---|
| Redesign a Workflow with AI | 61 | 23% |
| Analyze Your Career's AI Exposure | 49 | 18% |
| Redesign Your Job with AI | 58 | 9% |
| Map Your Next Career Moves | 46 | 9% |
| Find Where AI Fits a Workflow | 40 | 5% |
| Diagnose Your Business in 30 Minutes | 25 | 4% |
| Negotiate a Job Offer | 32 | 3% |
| Plan a Deep-Tech Venture | 33 | 3% |
| **Practice a Price Negotiation** | **26** | **0%** |

Twenty-six people started a price negotiation and none finished it.

---

## The channel math

Counting only what can realistically land between now and 31 December:

| channel | realistic | note |
|---|---|---|
| Your own MBA sections | 100–140 | Fall term is already running — fastest, and you control it |
| Your exec teaching (IMF, CFC, Bohras) | 60–90 | Three engagements, ~30 each |
| Duke Executive Education | 40–80 | One or two programmes |
| Duke Christensen Center | 30–50 | One programme |
| Colleagues running one module | 200–320 | 5–8 classes × ~40. Highest variance, lowest friction |
| **Anjuman-e-Islam workshop** | **100–400** | The wildcard. 100k reach is the org, not the workshop |
| Duke Corporate Education | **0** | Contracting won't close by December |
| Government of Kazakhstan | **0** | Government procurement is 6–18 months |

**Base case: 530–680. With Anjuman at 300: 830–980.**

So 1,000 is not comfortable. It requires two specific things you don't fully
control — Anjuman landing large, and six-plus colleagues actually running a
module. If either slips you finish around 650.

Duke CE and Kazakhstan are real, and they are spring business. Counting them for
December is how the goal quietly becomes 700.

---

## Why 1,000 is the wrong headline

At 15% completion, 1,000 users is **150 finishers**.

Nobody at Duke Corporate Education buys on registrations. What closes that
conversation is one sentence: *"We ran this with a cohort of 40; 34 finished and
produced a redesigned role you can read."* That is the asset. You do not have one
yet, and December is your window to manufacture it.

Which flips the priority: **completion is the binding constraint, not
distribution.**

- Lifting completion 15% → 45% triples the value of every channel you already
  have, with no new relationships.
- It costs less than finding another 300 people.
- And it's what makes the spring deals — Duke CE, Kazakhstan — closeable at all.

You also can't currently *prove* a cohort's completion to a buyer. `/admin/usage`
is platform-wide. Per-cohort completion, exportable, is the artifact that sells.

---

## The goal I'd set instead

Keep 1,000 as the forcing function; add the two numbers that matter.

| | target | why |
|---|---|---|
| **Reached** | 1,000 | Your headline. Good pressure on the calendar |
| **Finished at least one module** | 400 | Requires completion 15% → 40%. This is the real number |
| **Documented cohorts above 70%** | 3 | The asset that closes Duke CE and Kazakhstan in the spring |

---

## Sequencing

**September — your own rooms.** You control the calendar and can watch it live.
Instrument per-cohort completion first: without it, none of this term produces
evidence. Fix the 0% negotiation module before it runs in front of a class.

**October — Anjuman and colleagues.** Highest volume, highest variance. The
one-module path for a colleague has to be frictionless; the join flow already is.
Give each colleague a cohort code, not a link to the catalogue.

**November–December — Duke Exec Ed and Christensen**, using September and October
completion data as the pitch rather than a demo.

**Seed now, close in spring — Duke CE and Kazakhstan.** Start them in September
so they're warm, but don't let them into the December count.

---

## The three risks

1. **Concentration.** If Anjuman is 300–400 of the 1,000, one cancellation takes
   out a third of the goal. Nothing else in the pipeline can absorb that.
2. **A module fails in a live room.** Price negotiation is 0 for 26. In a class of
   40 with a client watching, that's the thing they remember.
3. **You hit 1,000 and it doesn't help.** A thousand registrations at 15% is a
   vanity number that will not move Duke CE, and you'll have spent the term
   collecting it.

---

## What's already been done about completion

This session's work went at exactly the things that cost completion, and none of
it is measured yet:

- interviews that never ended (now capped at six turns, with a visible marker)
- the timer sitting at an amber `0:00` with no way forward, in 17 of 19 rooms
- finishing a module dumping you on a 19-screen catalogue that didn't mention
  what you'd made
- the flagship interview being dead in production

Worth taking a completion baseline now, before the fall cohorts, so the fall
tells you whether it worked.
