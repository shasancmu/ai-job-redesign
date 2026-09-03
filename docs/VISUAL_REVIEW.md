# Visual delight

Not flow, not structure — just how it looks and feels to be in.

---

## The thesis

**Superadditive is beautiful where you arrive and plain where you live.**

The design kit is genuinely good: Fraunces set at `-0.028em` with a `1.06` line
height, a warm five-colour palette, two shadow tiers, a custom easing curve, a
page-level fade, a stagger, a `joy-pop`. Almost all of it is spent on the report
pages — the screens someone sees once — and almost none of it on the dashboard,
Studio and cohort pages they see every day.

Measured:

| | biggest type | face |
|---|---|---|
| Career X-ray report | **40px** | Fraunces display |
| Reimagined-role plan | **48px** | Fraunces display |
| Finish screen | 36px | Fraunces display |
| Reports index | 30px | Fraunces |
| Cohorts | 30px | Fraunces |
| **Dashboard** | **24px** | Fraunces |
| **Studio** | **nothing above 24px** | — |

The `.display` class — the app's best typographic asset — appears in exactly five
components: `CanvasView`, `CareerXrayView`, `GiftReveal`, `PlanView`,
`WorkflowPlanView`. Every one is a report.

The dashboard, the most-visited page in the product, has eight distinct type
sizes and tops out at 24px. Nothing on it is ever large.

---

## What's already delightful — and why it works

The career X-ray is the best-looking page in the app, and it's worth naming what
it does that nothing else does:

1. **A real typographic jump.** A 40px serif headline against 17px sans body —
   a 2.4× ratio. The eye lands somewhere. The dashboard's biggest jump is
   24px→20px, which is 1.2× and lands nowhere.
2. **Colour that carries meaning.** The `E0 / E1 / E2` pills run sage → amber →
   clay, and the two exposure bars use amber against sage. That's a chromatic
   system doing work, not decoration. It is the single most sophisticated thing
   in the interface.
3. **A generous standfirst.** The summary sets at ~68 characters with loose
   leading. It reads like a magazine.
4. **One warm gradient wash** behind the top-right, barely perceptible.

That page proves the product can look excellent. The problem is purely one of
distribution.

---

## Where the delight leaks

### 1. The dashboard has no moment

After collapsing the catalogue it now ends at **671px in a 784px viewport** — the
whole page sits above the fold — and the largest thing on it is a 24px greeting.
What follows is a single card, four pill-shaped chips, two text links, and three
uppercase labels. Every element is between 12px and 20px.

It is calm, and it is also flat. Nothing is beautiful, nothing is large, nothing
is coloured. A page that short needs one thing worth looking at.

The greeting is the wrong candidate — "Hi Sharique Hasan" is not what anyone came
for. The **resume card** is: it's the one thing the page exists to offer. It
should be the visual event, at report scale.

### 2. The eyebrow is doing all the structural work

`JUMP BACK IN` · `EXERCISES` · `YOUR SESSIONS` · `JOB & AI X-RAY` · `EXPOSURE:
THE TWO VIEWS` · `TASK BY TASK` — uppercase, letterspaced, 12px, sage.

It's a nice device, and it is the *only* device. Six of them stack up on a short
page and none of them is a heading. When everything is an eyebrow, nothing is a
title.

### 3. Two measures on one page

The X-ray's standfirst wraps at ~680px. Its task rows run to ~1170px — **1.7×
the measure**, on the same screen. The eye has to re-learn the line length
halfway down.

### 4. The task list has no air

Twelve rows, identical treatment, title and description run together on one line
in two greys. It's the densest thing in the product and the most interesting
content in the report. It should breathe — grouped by exposure band, or simply
given space every few rows.

### 5. Motion exists and is barely spent

`--ease: cubic-bezier(.22,.61,.36,1)`, `lux-fade` on every `<main>`,
`stagger-in`, `joy-pop`. `stagger-in` appears in four files. `joy-pop` is not on
the finish screen — the one moment in the whole product that has earned a small
celebration.

---

## The moves, in order of delight per unit of work

| # | move | why |
|---|---|---|
| 1 | Make the resume card the dashboard's hero — display face, report scale | The most-visited page has no moment; this is the thing people came for |
| 2 | `joy-pop` the artifact name on the finish screen | The one earned celebration in the product, currently unmarked |
| 3 | One measure per page — cap the X-ray's task rows to the standfirst's width | Removes a jarring 1.7× shift mid-page |
| 4 | Give the task list air: group by E0/E1/E2 band | The best content in the product is its densest block |
| 5 | Promote one eyebrow per page to a real heading | Restores a hierarchy the eyebrow currently flattens |
| 6 | Let the exposure palette out of the report — use sage/amber/clay on module cards by category | The most sophisticated thing in the UI is used on one page |

Items 1 and 2 are small and would change how the product *feels* more than
anything else on the list.

## Two things I got wrong while looking

- I assumed the palette was unused outside reports. It appears in **131 files** —
  it's the *navigational* surfaces that are monochrome, not the app.
- I read the dashboard as left-hugging. It's centred in a 1024px column; what
  reads as left-weight is content that stops early inside it, leaving a ragged
  right edge.
