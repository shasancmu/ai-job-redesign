# Voice & style

How text in the app should read. Applies to everything a person sees: module
taglines and descriptions, buttons, labels, empty states, errors, and the reports
the AI writes at runtime. When you edit copy or a prompt, this is the reference.

The enemy is **claude-ese** — the recognizable default-AI register: em-dashes
everywhere, triads of three, "not just X, it's Y", hype words, and hedging that
sounds confident while saying nothing. It reads as generated. Our text should read
as though a specific, capable person wrote it for one specific reader.

---

## The voice in one line

**A sharp colleague explaining something they know well, to one person, in plain
words.** Present, specific, unhurried, never selling. (This follows the product's
own north star: relationship, not transaction — costly plainness over frictionless
hype.)

## Principles

1. **Write to one person.** "You," not "users" or "learners." Say what *they* get,
   not what the feature *is*.
2. **Concrete beats abstract.** Name the real thing — the 2×4 model, the one metric,
   the résumé bullet — not "insights," "solutions," or "outcomes."
3. **Earn every word.** If a clause can go without loss, cut it. A short true
   sentence beats a long balanced one.
4. **Say it once.** Don't restate the tagline in the description, or the heading in
   the first line. Each piece of text adds something the others didn't.
5. **Verbs do the work.** Prefer a strong verb to an adjective pile. "Pressure-test
   an initiative" over "a powerful, comprehensive assessment framework."
6. **No hedging, no hype.** Not "can help you," not "designed to," not "unlock." Say
   what happens.
7. **Plain, not dumbed-down.** Short words, real ideas. Assume an intelligent reader.

## The kill list (claude-ese tells)

Each of these reads as machine-written. The before/afters are from this app.

**Em-dashes.** Banned. Use commas, colons, parentheses, or two sentences.
- ✗ `Map one workflow to find where AI belongs — and leave with a plan.`
- ✓ `Map one workflow to find where AI belongs, and leave with a plan.`

**The rule of three.** AI pads with triads ("the split, the risks, and how to
deploy"). Keep a list only when each item earns its place; two is often plenty, and
one sharp thing beats three vague ones.
- ✗ `the outcome, the accuracy and generality it needs, the human/AI split, where complexity lives, the risks, and how to deploy`
- ✓ `where AI fits, what it must get right, and how to ship it`

**"Not just X, it's Y" / "isn't about X, it's about Y."** A tic. State the thing.
- ✗ `This isn't just a course, it's a transformation.`
- ✓ `A 20-minute exercise that redraws one workflow.`

**Cliché closers.** "You'll walk out with," "you leave with," "by the end you'll
have." Fine once in a while; not on every card. Prefer showing the payoff in the
verb.

**Hype words.** unlock, supercharge, seamless, robust, powerful, leverage,
cutting-edge, revolutionary, elevate, empower, dive in, journey, game-changing.
Delete or replace with the plain word.

**Hedges.** "helps you," "designed to," "aims to," "can assist with." They soften
until nothing is claimed. Say what it does.
- ✗ `This module is designed to help you think about where AI can fit.`
- ✓ `Find where AI fits one of your workflows.`

**Restating yourself.** Tagline and description that say the same thing (see below).

**Over-punchy fragments.** A wall of dramatic one-liners is its own tell. Vary
rhythm; let sentences breathe.

## Static copy rules

**Tagline** — the card hook. One line, roughly under 110 characters, a single
scannable promise. Not a mini-description.
- ✓ `Find your real job, hand AI the busywork, keep the judgment with you.`

**Description** — the detail, shown in the "What's this?" modal. A short paragraph
that says *what actually happens* and *what you walk away with*, in specifics the
tagline didn't already spend. Never repeat the tagline's wording or its closing
line.

**Buttons & controls** — say exactly what happens, in the imperative. "Score it,"
"Rebuild the brief," "Start." Not "Submit," not "Click here." The toast after should
echo the verb ("Scored," "Published").

**Empty states** — one plain sentence that orients, plus the next action. No mascot
cheer.

**Errors** — what went wrong and what to do next, in plain words, no apology theater.
- ✓ `Paste your invention as an abstract (a few sentences).`

**Labels & eyebrows** — sentence case, short, literal. Reserve numbering (01 / 02)
for things that are actually a sequence.

## Generated (AI) text

Runtime reports and interview turns are governed by `STYLE_RULE` in
[lib/ai.ts](../lib/ai.ts), which is appended to every system prompt through
`localize()`. That rule is the enforcement arm of this guide — keep it in sync with
the kill list above. When a prompt needs voice guidance, lean on `STYLE_RULE` rather
than re-describing tone inline; add only what's specific to that surface.

## Mechanics

- **Em-dashes:** never (see above). Hyphens for compounds are fine.
- **Oxford comma:** yes.
- **Case:** sentence case for headings, labels, and buttons. Not Title Case, not ALL
  CAPS (small-caps eyebrows via CSS are fine).
- **Numerals:** digits for anything measurable ("20 min," "4 A's," "3 papers").
- **Emoji:** sparingly, and never as a section marker.
- **Voice:** active. "AI interviews you," not "you are interviewed by AI."

## The 10-second check

Before you ship a string, read it aloud and ask:
1. Would a smart person actually say it this way, or does it smell generated?
2. Is there an em-dash, a triad, or a hype word I can cut?
3. Does it repeat something the reader already saw right above it?
4. Is it about *this* specific thing, or a generic version?

If any answer is off, rewrite it.
