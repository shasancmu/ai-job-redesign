import Link from "next/link";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";

export const metadata = {
  title: "Superadditive for L&D, exec ed & in-house academies",
  description: "Turn your experts' materials into interactive, AI-run learning — role-plays, simulations, benchmarks and more — and run, govern, and measure them at scale.",
};

const CONTACT = "/contact?source=for-teams";

const STEPS = [
  { n: "1", title: "Your expert uploads", body: "A faculty member or SME drops their slides, case, or reading. No new content to write — the material already exists." },
  { n: "2", title: "The AI proposes modules", body: "It reads the material and offers a menu of interactive modules across formats. They pick one, a few, or the whole set." },
  { n: "3", title: "Edit and publish", body: "A structured editor and an AI copilot make the last edits fast. An AI critic and a simulated learner check quality before it ships." },
  { n: "4", title: "Run, govern, measure", body: "Assign to cohorts under your brand. Approve which modules go org-wide. See completion, scores, and where learners got stuck." },
];

const FEATURES = [
  { icon: "🪄", title: "Author from your materials", body: "Upload slides, readings, or a case; the AI drafts a working module. A copilot and a structured editor finish it. Minutes, not an instructional-design queue." },
  { icon: "🧩", title: "Every kind of experience", body: "Role-plays, negotiations, timed benchmarks, analytical X-rays, guided-interview canvases, paired redesigns, explainers, and live room activities — all authored the same way." },
  { icon: "✅", title: "Quality you control", body: "An AI critic flags an unfair module and a simulated learner playtests whether it teaches, before a real one runs it. A promotion ladder means only vetted modules reach the wider library." },
  { icon: "🎨", title: "Your brand, your space", body: "Your logo, colors, and a private address. It feels like your program, not a vendor's tool." },
  { icon: "👥", title: "Cohorts, directors & instructors", body: "Organize people into cohorts and sections. Directors run the space; instructors run their groups; each sees only their own people." },
  { icon: "📈", title: "See it land", body: "Completion, scores, where the room gets stuck, how calibrated their judgment is, and the themes rising across a live activity." },
  { icon: "📡", title: "Live, in the room", body: "Run a word cloud, poll, benchmark, or open prompt your whole room joins from their phones — no sign-in for them." },
  { icon: "🔒", title: "Your content stays yours", body: "Per-organization isolation. Uploaded materials are read to draft the module and never stored. Your library is yours." },
];

const AUDIENCES = [
  ["Executive education", "Scale a professor's teaching into interactive modules learners run before, during, and after the room — under the school's brand."],
  ["Corporate universities & academies", "Turn your experts' knowledge into a living, branded library without a courseware project for every topic."],
  ["In-house team enablement", "A function builds exactly the practice its people need, from its own playbooks and cases — no vendor, no dev cycle."],
  ["Fellowships & accelerators", "Keep a cohort practicing the real thinking between sessions, as a connected group."],
  ["Alumni & membership", "Turn a one-time program into an ongoing, branded relationship your community returns to."],
  ["Networks & communities", "Give the people you convene a shared space — and a reason — to keep thinking together."],
];

export default function ForTeams() {
  return (
    <main>
      {/* Hero */}
      <div className="hero-wrap">
        <div className="ribbon" />
        <div className="ribbon-2" />
        <div className="relative mx-auto max-w-6xl px-6">
          <nav className="relative z-10 flex items-center justify-between py-5">
            <Logo />
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden text-sm font-semibold text-ink/80 hover:text-ink sm:inline">Sign in</Link>
              <a href={CONTACT} className="btn-dark">Talk to us</a>
            </div>
          </nav>

          <div className="relative z-10 max-w-3xl pb-28 pt-16 sm:pb-36 sm:pt-24">
            <span className="eyebrow">For L&amp;D · exec ed · corporate academies · in-house</span>
            <h1 className="display mt-4 text-[2.75rem] leading-[1.05] text-ink sm:text-[4.25rem]">
              Turn your material into interactive learning. In minutes.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate2">
              Your faculty and subject-matter experts already have the expertise and the decks. Superadditive turns them
              into AI-run experiences your people actually do — and lets you run, govern, and measure them at scale.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={CONTACT} className="btn-primary">Bring it to your organization <span aria-hidden>→</span></a>
              <Link href="/" className="btn-ghost">See the platform</Link>
            </div>
            <div className="mt-4">
              <Link href={CONTACT} className="text-sm font-medium text-slate2 underline-offset-4 hover:text-ink hover:underline">
                Prefer to talk first? Contact us <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Numbers */}
      <section className="mx-auto -mt-6 max-w-4xl px-6">
        <Reveal>
          <div className="grid gap-6 rounded-2xl border border-line bg-white p-8 text-center shadow-soft sm:grid-cols-3">
            {[
              ["8", "kinds of interactive module"],
              ["Minutes", "from a deck to a live module"],
              ["0", "IT projects — just share a link"],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">{n}</div>
                <div className="mt-1 text-sm text-slate2">{l}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Thesis */}
      <section className="mx-auto mt-20 max-w-4xl px-6 text-center sm:mt-28">
        <Reveal>
          <p className="text-2xl font-semibold leading-snug tracking-tight text-ink sm:text-[2.2rem]">
            Custom courseware is slow and expensive; static content doesn&apos;t stick. <span className="text-sage">Superadditive makes experiential learning as easy as uploading a deck.</span>
          </p>
        </Reveal>
      </section>

      {/* How it works */}
      <section className="mx-auto mt-24 max-w-6xl px-6 sm:mt-32">
        <Reveal>
          <div className="max-w-2xl">
            <span className="eyebrow">How it works</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Your expert&apos;s material becomes a live module, in four moves.</h2>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={(i % 4) * 80}>
              <div className="card h-full p-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{s.n}</div>
                <h3 className="mt-4 text-lg font-bold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate2">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* What your organization gets */}
      <section className="mx-auto mt-24 max-w-6xl px-6 sm:mt-32">
        <Reveal>
          <span className="eyebrow">What your organization gets</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">A platform to build, run, and govern experiential learning.</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 4) * 70}>
              <div className="card h-full p-6">
                <div className="text-3xl" aria-hidden>{f.icon}</div>
                <h3 className="mt-4 text-lg font-bold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate2">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Governance — the quality story */}
      <section className="mt-20 border-y border-line bg-mist/50">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <div>
                <span className="eyebrow">Quality &amp; governance</span>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Open authoring, without a flood of mediocre content.</h2>
                <p className="mt-4 text-lg leading-relaxed text-slate2">
                  When everyone can author, quality is the risk. Superadditive builds the control in: a new module lives with
                  its author until it&apos;s earned wider reach. A director approves what goes org-wide; a curator approves
                  what reaches everyone — and only after it clears automated gates on real usage and quality.
                </p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="grid gap-3">
                {[
                  ["Author freely", "A new module runs in the author's own cohorts by default. No committee to start."],
                  ["Promoted by a director", "Good ones go org-wide with a director's approval — your quality bar, your call."],
                  ["Curated for everyone", "Reaching the shared library takes passing automated quality gates plus a curator's review."],
                  ["Checked and playtested", "An AI critic and a simulated learner vet each module before it ships."],
                ].map(([t, b]) => (
                  <div key={t} className="card p-5">
                    <div className="font-semibold text-ink">{t}</div>
                    <p className="mt-1 text-sm text-slate2">{b}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="mx-auto mt-24 max-w-6xl px-6 sm:mt-32">
        <Reveal>
          <span className="eyebrow">Built for programs like yours</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">If you design or deliver learning, this is your studio.</h2>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {AUDIENCES.map(([t, b], i) => (
            <Reveal key={t} delay={i * 70}>
              <div className="card h-full p-6">
                <h3 className="text-lg font-bold text-ink">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate2">{b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto mt-24 max-w-6xl px-6 sm:mt-32">
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-line bg-ink px-8 py-14 text-center sm:py-20">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-[2.6rem]">Show us a deck. We&apos;ll build the module on the call.</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-white/70">
              Bring one lecture or case. We&apos;ll turn it into a working, interactive module while we talk — so you can see
              exactly what your program could become.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href={CONTACT} className="btn-primary">Talk to us <span aria-hidden>→</span></a>
              <Link href="/" className="rounded-full px-5 py-2.5 text-sm font-semibold text-white/85 hover:text-white">See the platform</Link>
            </div>
          </div>
        </Reveal>
      </section>

      <div className="mx-auto max-w-6xl px-6">
        <Footer />
      </div>
    </main>
  );
}
