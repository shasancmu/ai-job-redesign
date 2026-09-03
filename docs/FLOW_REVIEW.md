# Moving through the app

A walk through Superadditive as the two people who use it: a director or
instructor running a class, and a student doing the work. Not a bug hunt — the
subject is the *seams*, the moments between screens where someone has to decide
what to do next.

Measured in the browser on production. Everything with a number was counted, not
estimated.

---

## The app already knows how to do this

Four surfaces are genuinely excellent, and they are the standard the rest should
be held to:

- **`/join`** — "Join the workshop. No account needed, just your name." One
  field, one button, and a quiet escape hatch underneath for people who want an
  account. Nothing else on the page. This is the best screen in the product.
- **`/reports`** — five cards, no chrome, no scroll.
- **Studio's `1 · Create → 2 · Run → 3 · Observe → 4 · Improve & reuse`** — the
  instructor's real loop, numbered, on one page.
- **"Pick up where you left off"** on the dashboard — a single strong next action
  with a progress bar.

Every problem below is a place where that standard slipped.

---

## The one to fix first

### 1. Finishing something is the best moment in the product, and it is thrown away

I ran a career X-ray end to end. It produced a genuinely good artifact — *"Floor
Operations and Guest Recovery Lead"*, a task-by-task exposure read, a set of
career vectors. Then I clicked **Finish**.

I landed at the top of the dashboard. Measured, at that instant:

- Scroll position `0`, on a page **15,235px tall**
- First words on screen: *"Hi Sharique Hasan · 3-week streak"*
- The X-ray is **not mentioned anywhere in the first 900 characters**
- "Pick up where you left off" was pointing at **a different, older module**

Fifteen rooms send `Finish` to `/dashboard`. The student has just made the thing
the entire exercise exists to produce, and the app's response is to show them a
catalogue and suggest something else.

What it should do is what any good product does when you finish making
something: show them the thing. A finish screen naming the artifact, the report
one tap away, and *one* suggested next step — not ninety-five.

That single change would do more for the student experience than everything else
in this document combined.

---

## For students

### 2. The dashboard is a catalogue, not a home

| | |
|---|---|
| Page height | **15,235px — 19 screens** |
| Exercise cards | **95** |
| Distinct titles | 91 |
| Titles appearing twice | 4 |

A returning student wants one of three things: continue what I was doing, open
what I made, or start the thing my instructor assigned. All three exist on the
page, in the top 500px — and then 14,700px of catalogue follows.

The catalogue should be somewhere you *go* ("Browse all exercises →"), not the
thing you land in.

### 3. Your library lists the exercises you did, not the things you made

`/reports` cards read **"Analyze Your Career's AI Exposure"**. The report inside
is titled **"Floor Operations and Guest Recovery Lead"**.

This is the loose end from the last pass: the report `<h1>` now names the
artifact, but the card that points at it still names the exercise. A student's
library should read like a shelf of things they made, not a list of homework
they submitted.

### 4. Redo an exercise and the first one disappears

I ran the X-ray twice. `/reports` shows **one** card, linking to the newer report
(`/career/PS8J9`); the earlier one (`/career/E9CDJ`) is gone from the library.
The URL still works, but nothing links to it.

A student x-raying two different roles, or comparing their thinking before and
after a course, silently loses the first. If one-per-module is deliberate, the
card should at least say "3 versions".

---

## For directors and instructors

### 5. The only global navigation is the account menu, and it holds two different jobs

There is no persistent nav. Every move between major surfaces goes through the
avatar dropdown, which contains:

> Reports · Achievements · Profile · Take a tour
> **Studio · Cohorts · Organization · Data collection · Admin**

The first row is *my account*. The second row is *my workplace* — everything an
instructor does for a living. Putting Cohorts and Studio behind a personal
avatar is like filing a company's meeting rooms under someone's contact card.

An instructor needs their workspace visible, not remembered.

### 6. Instructors have two front doors that overlap

`/facilitator` and `/studio` both claim the teaching job:

- `/facilitator` — "Run something live" (7 activities) + Your cohorts + Admin tools
- `/studio` — Create → **Run (links to `/facilitator` and `/facilitator/classes`)** → Observe → Improve

Studio *contains* Cohorts. The account menu lists them as siblings. Neither page
says which one is home.

Studio has the better structure — its four numbered stages are exactly the
instructor's loop. It should be the front door, with the live activities folded
into "2 · Run".

### 7. `/facilitator` is titled "Cohorts" and leads with something else

The `h1` says **Cohorts**. The page then gives seven live-activity cards, and
your actual cohorts appear **below the fold**. An instructor arriving to check on
their class lands on a grid of party tricks.

Three smaller things on the same page:

- **Admin tools** — Usage, A/B testing, Costs — sit on the teaching surface.
  These are operator concerns, not instructor ones.
- **Two "New cohort" buttons** are visible simultaneously: a floating pill and
  one in the empty state.
- The empty state asks the instructor to **hand-assemble a URL**:
  *"share a tagged link like `/dashboard?cohort=EXECED-XYZ-DATE`"*. Asking
  someone to construct a query string by hand is the least Apple thing in the
  product. (The hyphens are plain ASCII — I checked, they only look like
  en-dashes in the mono font.)

### 8. The instructor's two most important tools are the smallest things on their dashboard

"Turn your materials into a module · or open the Studio" and "Organization
settings" render as 14px text links, wedged between the resume card and "Jump
back in" — visually quieter than the exercise chips beneath them.

For a director, authoring a module and configuring the org *are* the product.
They are currently styled like footnotes.

---

## Order

| # | change | who | why it's first |
|---|---|---|---|
| 1 | A finish screen: name the artifact, link the report, one next step | students | The best moment in the product currently ends on a catalogue |
| 2 | Report cards titled by artifact, not exercise | students | Half-done already; the `h1` was fixed and the card wasn't |
| 3 | Persistent nav; split account from workspace | both | Removes the "where do I go" tax from every session |
| 4 | Make Studio the instructor front door; fold live activities into "2 · Run" | instructors | Two doors to one room is the deepest structural confusion |
| 5 | Dashboard leads with continue / your work / assigned; catalogue behind "Browse all" | students | 19 screens of scroll on the page you see most |
| 6 | Lead `/facilitator` with cohorts; move admin tools out | instructors | The `h1` should describe the page |
| 7 | Replace the hand-built cohort URL with a copy-link button; drop a duplicate CTA | instructors | Nobody should assemble a query string |
| 8 | Promote Studio + Org settings on the director's dashboard | directors | Their core tools are styled as footnotes |
| 9 | Keep report history, or say "3 versions" on the card | students | Silent data loss from the user's point of view |

Items 1 and 2 are small and account for most of what a student would feel. Items
3 and 4 are the structural ones and deserve a design pass before code.

## What this did not cover

- **Mobile**, again — the browser window resizes but the page viewport doesn't,
  so I have no verified measurements.
- The **paired/partner** flows, which need two people.
- **`/team`, `/org`, `/admin`** in any depth — a director's reporting surfaces
  deserve their own walk.
- Anything behind creating real cohorts or classes, which would have written to
  live org data.
