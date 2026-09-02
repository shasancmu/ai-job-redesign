# Running a module as a learner — three personas

**Date:** 2026-09-02
**Module:** Redesign Your Job with AI (`solo-ai`), run end to end on production, three times.
**Method:** Played each persona honestly — answering the way that person would, at the length they would, and bailing when they would. Turn counts, timings and report sizes below are measured.

---

## The personas

| | Who | How they answered |
|---|---|---|
| **Dana**, 34 | Shift supervisor, distribution centre. Busy, mildly sceptical, types on a phone. | Short, concrete, a bit flat. Stayed 9 exchanges. |
| **Marcus**, 23 | Marketing coordinator, first job. Little autonomy. | Minimal — "Post stuff, write the newsletter, pull numbers on Fridays." Bailed at 4. |
| **Priya**, 41 | Hospice nurse. High-judgment, relational, heavy documentation. | Vivid but guarded. Stayed 3. |

---

## The headline

**The interview is better than it needs to be, and it doesn't know when to stop. The report is genuinely excellent and is doing the real teaching.** The single highest-value change is not to improve either one — it's to shorten the interview to the length the prompt already asks for, and spend the saved attention on the report.

---

# 1. Is the flow good?

Mostly yes, and the interviewing itself is the strongest part of the product.

**What's genuinely good.** It builds on the learner's actual words rather than running a script. With Dana it caught a real tension unprompted — *"You moved someone to prevent tension that would have slowed the line, but then paperwork pulls you away from the floor where you make those calls. Are those two things competing for your time every night?"* With Priya it **deferred her complaint to stay on the important thread**: *"I hear you, that's a real drag on your time. Before we get into that though, I want to stay with what you just said about reading families."* That is better interviewing than most humans do.

**Three flow problems, in order of how much they cost:**

### The prediction gate is defeated by the layout

Step 4 asks: *"Before you see the redesign: which one part of your job do you think only you can do... No peeking, commit your guess first. The gap between it and the result is the whole point."*

**"YOUR REIMAGINED JOB" is rendered directly above that prompt**, and the 2×4 split was already shown in full on step 3. The learner is asked not to peek at something they have already read twice. The mechanic is good — predict-then-reveal is exactly right — but it currently teaches nothing, because there is no gap left to be surprised by.

*Fix:* move the prediction to the **end of step 2**, right after the interview, before any part of the redesign is drawn. It costs nothing and restores the whole point.

### Three separate "now press the AI button" moments

After the interview the learner must press **Draft with AI** (step 3), then **Build implementation plan** (step 4), then answer the gate, then press build again. Each is a 30–60 second wait. From Dana's seat, the exercise stops feeling like a conversation and starts feeling like operating a machine.

*Fix:* draft the split automatically on entering step 3 — the learner has already done the work that earns it. Keep an explicit "redraft" for people who want to change it.

### Step 3 hands you an empty 2×4 grid

After nine exchanges of talking about her job, Dana lands on eight empty boxes (Search / Structure / Think / Translate, Lead / Own / Judge / Integrate) with a Draft button off to the side. The framework is the point of the module, but meeting it as an empty form — after you have just explained everything — reads as "none of that counted."

*Fix:* if the split is drafted on arrival (above), the grid becomes something to **react to** rather than fill. That is a much better teaching moment, and it's the same move the Studio's draft review makes for authors.

---

# 2. Does the interview last too long? Should there be a fixed number of turns?

**Yes, and yes — and the fixed number already exists in the prompt. It just isn't enforced.**

`lib/ai.ts:659`, the last line of `INTERVIEWER_SYSTEM`:

> *After roughly 6 exchanges, briefly reflect the throughline you heard, ask if there's anything important you missed, then thank them and close.*

**Dana reached 9 exchanges and it never closed.** No throughline, no "anything I missed", no thank-you. Its ninth question was *"When you say reports nobody reads, what are you actually writing and who's supposed to be reading them?"* — still gathering operational detail. It would have continued indefinitely.

Measured across all three runs: **the model never once signalled it had enough.** Nothing in the UI does either — no turn counter, no progress, no "I have what I need" state. The only exit is a **Next step** button that looks like navigation rather than completion. A learner cannot tell whether they are a third of the way through or nearly done.

**Why this matters more than it looks:** it is the same failure the Studio had. The model was asked to self-regulate something it is unreliable at, and nothing in the code enforced it.

*Fix, in order:*

1. **Tell the model where it is.** Pass the exchange number into the system prompt — "This is exchange 4 of 6" — rather than hoping it counts the history. This is a one-line change in `interviewReply`.
2. **Show the learner the same thing.** A "4 of 6" marker on the interview panel. It converts an open-ended chat into a bounded task, which is what makes people finish.
3. **Make the closing turn a real state.** When the interview closes, the Next button should say **"Build my redesign →"**, not "Next step". Right now the most important transition in the module is unmarked.
4. **Let it end early.** Priya gave everything essential in three exchanges. A "I think I have what I need — anything I missed?" that can fire at exchange 3 is better than padding to 6.

**On the length itself: six is right, and probably generous.** See below — the evidence is that the report barely improves after the first two substantive answers.

---

# 3. How good is the report? Is it informative?

**It is the best part of the product, and it is more informative than the interview length justifies.**

Dana's report contained, for each delegated task: **HOW**, **WHERE TO LOOK**, a copy-pasteable **STARTER PROMPT**, and — best of all — **YOU CHECK**, naming what to verify in the AI's output. That last one is the difference between a plan and a lecture.

A real example from Marcus's report:

> **STARTER PROMPT** — *"What posts in [your industry] got the most engagement this week? What tone or topic patterns do you see? Flag 2-3 things our audience might care about."*
> **YOU CHECK** — *Spot check one or two flagged posts to make sure the summary is accurate*

Priya's report passed the hardest test in the set. It did **not** over-claim on relational work:

> *"The kitchen moments, the reading of unspoken family crisis, the decision about what to do with that information, the pacing of difficult truths, the presence itself: that is the irreplaceable work. You keep all of it."*

It targeted the two hours of evening documentation she actually complained about. A module of this kind could very easily have insulted a hospice nurse, and it didn't.

### The finding that should change the design

| | Dana | Marcus |
|---|---|---|
| Exchanges | **9** | **4** |
| Report length | 6,360 chars | 5,901 chars |
| Starter prompts | 5 | 5 |
| "You check" items | 5 | 5 |

**Marcus's interview was 55% shorter and his report was 93% as long, with identical structure and the same number of actionable items.** The extra five exchanges bought almost nothing in the artifact.

Report quality tracks **one or two substantive answers**, not interview length. Dana's whole report turns on two things she said — "it's judgement, I know who works well together" and "the reports nobody reads". Marcus's turns on one — "knowing what sounds too corporate."

That is the empirical case for a short, bounded interview: **stop when you have two real answers, not when you run out of questions.**

### What would make the report more informative

1. **Say what it heard, and from where.** Every claim in the report is inferred from the interview, but nothing is attributed. Quoting the learner back — *"You said the reports nobody reads are the worst of it"* — next to the recommendation would make it feel earned rather than generated, and would let them catch it when it's wrong.
2. **Make it falsifiable.** Every item reads as confident advice. Add one line per AI power: *"This is worth doing if… It isn't if…"* A plan you can disagree with is more useful than one you can only accept.
3. **Rank it.** Five AI powers arrive as a flat list. Dana will try one, at most. Mark the one to start with this week and say why it's first.
4. **Watch the role inflation.** Marcus — who said "my manager tells me what to post" — was told his reimagined role is **"Voice and Strategy Lead"** who will "keep your manager aligned on what's working." Dana's "Floor Strategist" was apt; Marcus's was flattery. For junior learners the report should name the *next* rung honestly, not promote them two levels in a sentence.
5. **Give the prediction gap teeth.** "YOU PREDICTED … the gap is the lesson" is a great device, but nothing then *names* the gap. One sentence — *"You guessed the reports; you didn't guess that your read on people is the scarce thing"* — would land the lesson instead of leaving it as an exercise.

---

# What I'd change first

| # | Change | Why |
|---|---|---|
| 1 | Pass the exchange number into the prompt, and enforce a close at 6 | The intent already exists at `lib/ai.ts:659` and is ignored in practice |
| 2 | Move the prediction gate to the end of step 2 | It currently asks learners not to peek at what's on screen above it |
| 3 | Show "4 of 6" and change the button to "Build my redesign →" | The learner cannot currently tell how far through they are |
| 4 | Draft the 2×4 split on arrival instead of on a button | Removes one of three machine-operating moments, and makes the framework something to react to |
| 5 | Quote the learner in the report, and rank the AI powers | Cheapest way to make a strong artifact feel earned and actionable |
| 6 | Temper the role name for junior learners | "Voice and Strategy Lead" for a coordinator who posts what he's told is flattery |

Items 1–4 are mechanical. Items 5–6 are prompt and copy work on the report generator.

---

---

# The same three personas through Analyze Your Career's AI Exposure

Run as a follow-up, because it is the natural control: **no interview at all**, just a pasted résumé. If the report holds up without an interview, that tells us what the interview is actually buying.

It holds up. In several respects it is the better module.

| | Redesign Your Job (interview) | Career X-ray (paste) |
|---|---|---|
| Learner input | 4–9 exchanges, several minutes of typing | one paste |
| Report length | 5,900–6,360 chars | **9,086–9,643 chars** |
| Analytical spine | a qualitative 2×4 split | **E0/E1/E2 per task, complement vs. substitute, and two exposure views benchmarked to an O\*NET occupation** |
| Actionability | starter prompts + "you check" | search keywords, where to look, named next roles |
| Honesty with a junior | called Marcus a "Voice and Strategy Lead" | told Marcus he is **68–73% exposed** and "the coordinator role is a launchpad, not a destination" |

**The exposure numbers discriminated properly**, which is the thing that would have been easy to get wrong:

- Dana (supervisor): 42% top-down / 44% bottom-up
- Priya (hospice nurse): 61% top-down / **48% bottom-up** — the gap correctly says her palliative work is less exposed than generic RN work
- Marcus (coordinator): 73% / 68%

Priya's is the best result in either module. The top-down figure for Registered Nurses is 61%; her actual tasks come out at 48%, and the report explains why — documentation and protocol-driven assessment are exposed, "presence, tone, timing" are not. That gap **is** the lesson the two-view design exists to teach, and it landed without any interview.

The career guidance was sector-literate too: it used Priya's Advanced Communication Skills qualification and pointed at CNS, palliative educator, and service-lead routes within an NHS/hospice structure. It used Dana's OSHA 30 to point at Safety Manager. Neither read as generic.

## What this changes about the interview

**The interview is not earning its length.** A module with no interview produced a longer, more rigorous, and more honest artifact.

But the interview is buying one thing the X-ray cannot: **the unwritten.** Dana's interview surfaced *"I know who works well together and who's having a rough week — a schedule can't see that."* No résumé contains that sentence. Résumés systematically understate exactly the judgment work these modules exist to find, because people write résumés in the language of tasks.

So the conclusion is not "cut the interview" — it is **cut it to the two or three questions that get at what isn't written down**, and borrow the X-ray's analytical spine for the report:

1. **Stop at 6 exchanges** (already the instruction; see above) and consider 4.
2. **Ask the X-ray's questions of the interview data.** The redesign report has no equivalent of the two views, no per-task exposure label, no benchmark. It could — it has richer input.
3. **Steal the honesty.** The X-ray told a 23-year-old his job is 68% exposed and framed it as a launchpad. The interview module told the same person he is a "Voice and Strategy Lead". The X-ray's calibration is the one to copy.

## Bugs and rough edges found in the X-ray

1. **"what you actually does"** — a subject-verb disagreement on every résumé run, in `CareerXrayView.tsx:49`. The sentence is shared with the job-description variant, where "this role actually does" is correct. **Fixed** in this pass.
2. **Marcus was matched to "Marketing Managers (SOC 11-2021)."** He is a coordinator, not a manager. The mismatch inflates his top-down exposure, and it is then labelled as a *published* figure — so a wrong occupation match is presented with more authority than it has.
3. **The provenance label changes between runs.** Dana's top-down read "occupation estimate, rubric-based"; Marcus's and Priya's read "published occupation exposure (Eloundou et al.)". Same row, two very different epistemic claims, with nothing telling the learner which they got.
4. **"Run the X-ray" appears twice** — once on step 1 to submit the résumé, again on step 2 to actually run it. Same press-the-AI-button friction as the redesign module's three buttons.

## Notes on coverage

Three full runs of one module. I did not test the paired version, the voice variants, the résumé-paste modules (where the input is a document rather than an interview), or any role-play — the interrogation mechanic is different enough that its pacing question is separate.

The follow-up above covers Analyze Your Career's AI Exposure with the same three personas. Still untested: the paired and voice variants, and any role-play — the interrogation mechanic is different enough that its pacing question is separate.
