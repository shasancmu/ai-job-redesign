import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import HeroVisual from "@/components/HeroVisual";
import LandingLibrary from "@/components/LandingLibrary";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";

// The eight interactive module types an author can build (or generate from their
// own materials). Kept in sync with the studio.
const TYPES = [
  { emoji: "🎭", title: "Role-play", body: "Learners interrogate an AI character who won't lie but will spin, and make a call under uncertainty. Detect fraud, elicit a guarded source, read a person." },
  { emoji: "🗂️", title: "Guided interview → canvas", body: "An AI interviews the learner, then drafts a framework artifact — Five Forces, a scorecard, a job redesign — from what they said." },
  { emoji: "🤝", title: "Negotiation", body: "Negotiate a scored deal against an AI counterpart with a hidden payoff table. Value-creating trades beat splitting the difference." },
  { emoji: "⏱️", title: "Timed benchmark", body: "A timed, you-vs-AI test that scores itself and rolls up across the whole cohort." },
  { emoji: "📊", title: "Analytical X-ray", body: "Decompose a job, a plan, or an argument into its parts and score each against a scale you define." },
  { emoji: "👥", title: "Paired redesign", body: "Two learners interview each other and redesign each other's work, live, on an instrument you set." },
  { emoji: "📖", title: "Explainer", body: "A taught, guided walkthrough that makes a concept click — before the interactive work begins." },
  { emoji: "🌥️", title: "Live group activity", body: "A word cloud, poll, or open prompt the whole room joins from their phones, with an AI read-out of the answers." },
];

const STEPS = [
  { n: "1", title: "Upload your materials", body: "Drop your slides, readings, or case notes — PDF, Word, or text. Your experts already have everything they need." },
  { n: "2", title: "The AI drafts modules", body: "It reads the materials and proposes a menu of interactive modules. Pick one, a few, or many; it drafts each one for you." },
  { n: "3", title: "Edit and launch", body: "A structured editor and an AI copilot make the last-mile edits fast. Publish to a cohort in a couple of clicks." },
  { n: "4", title: "Watch it land", body: "Learners run it live or on their own time. You see completion, scores, where they got stuck, and what the room is thinking." },
];

const AUDIENCES = [
  ["Executive education", "Scale your faculty's teaching into interactive modules learners run before, during, and after the room."],
  ["Corporate L&D & academies", "Turn your experts' knowledge into a living, branded library — without an instructional-design queue."],
  ["In-house team enablement", "A manager or a function builds exactly the practice their people need, from their own material."],
  ["Fellowships & cohorts", "Keep a cohort practicing the real thinking between sessions, as a connected group."],
];

const RESEARCH = [
  { title: "The economics of AI & work", body: "How AI is actually reshaping specific tasks, roles, and careers — not the hype." },
  { title: "Elicitation & interviewing", body: "What makes an interview — spoken or typed — draw out real signal instead of platitudes." },
  { title: "Behavioral strategy", body: "The frameworks that hold up when a real decision, bet, or negotiation is on the line." },
  { title: "Assessment & calibration", body: "Grading the quality of someone's thinking and judgment, not just whether they guessed the label." },
];

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main>
      {/* Hero */}
      <div className="hero-wrap">
        <div className="ribbon" />
        <div className="ribbon-2" />
        <div className="relative mx-auto max-w-6xl px-6">
          <HeroVisual />
          <nav className="relative z-10 flex items-center justify-between py-5">
            <Logo />
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden text-sm font-semibold text-ink/80 hover:text-ink sm:inline">Sign in</Link>
              <Link href="/for-teams" className="btn-dark">For L&amp;D teams</Link>
            </div>
          </nav>

          <div className="relative z-10 max-w-2xl pb-28 pt-16 sm:pb-36 sm:pt-24">
            <span className="eyebrow">The authoring platform for interactive learning</span>
            <h1 className="display mt-4 text-[2.75rem] leading-[1.05] text-ink sm:text-[4rem]">
              Turn your expertise into experiences people actually do.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate2">
              Superadditive is how L&amp;D teams, executive-education programs, and in-house academies turn slides and case
              notes into AI-run learning — role-plays, simulations, benchmarks, and more — in minutes, not months. No
              instructional designers, no engineers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/for-teams" className="btn-primary">See it for L&amp;D <span aria-hidden>→</span></Link>
              <Link href="/login?mode=signup" className="btn-ghost">Try it yourself</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Numbers */}
      <section className="mx-auto -mt-6 max-w-4xl px-6">
        <Reveal>
          <div className="grid gap-6 rounded-2xl border border-line bg-white p-8 text-center shadow-soft sm:grid-cols-3">
            {[
              [`${TYPES.length}`, "kinds of interactive module to build from"],
              ["Minutes", "from your materials to a live module"],
              ["0", "instructional designers or engineers needed"],
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
            Great learning is <span className="text-sage">active, not watched</span>. The only thing standing in the way was the cost of building it. Superadditive removes it.
          </p>
        </Reveal>
      </section>

      {/* How it works */}
      <section className="mx-auto mt-24 max-w-6xl px-6 sm:mt-32">
        <Reveal>
          <div className="max-w-2xl">
            <span className="eyebrow">How it works</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">From a slide deck to a live module, in four moves.</h2>
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

      {/* The range of module types */}
      <section className="mx-auto mt-24 max-w-6xl px-6 sm:mt-32">
        <Reveal>
          <span className="eyebrow">One deck, many experiences</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">The same material, as many kinds of practice.</h2>
          <p className="mt-2 max-w-2xl text-slate2">Upload once and the AI shows you every interactive module your material could become. Build the mix that fits how you teach.</p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TYPES.map((t, i) => (
            <Reveal key={t.title} delay={(i % 4) * 70}>
              <div className="card h-full p-5">
                <div className="text-2xl" aria-hidden>{t.emoji}</div>
                <h3 className="mt-3 font-bold text-ink">{t.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate2">{t.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Grounded in research */}
      <section className="mt-20 border-y border-line bg-mist/50">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <Reveal>
            <div className="max-w-2xl">
              <span className="eyebrow">Grounded in science</span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Rigor built into the engine, not left to the author.</h2>
              <p className="mt-4 text-lg leading-relaxed text-slate2">
                The mechanics are built on peer-reviewed research, so an expert who is not an instructional designer still
                produces something sound. An AI critic checks each module for fairness before it ships, and a simulated
                learner playtests whether it actually teaches — before a real one ever runs it.
              </p>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RESEARCH.map((r, i) => (
              <Reveal key={r.title} delay={(i % 4) * 70}>
                <div className="card h-full p-5">
                  <h3 className="font-semibold text-ink">{r.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate2">{r.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="mx-auto mt-24 max-w-6xl px-6 sm:mt-32">
        <Reveal>
          <span className="eyebrow">Built for the people who teach</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Wherever learning gets designed and delivered.</h2>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* A ready-made library to start from */}
      <section className="mx-auto mt-24 max-w-6xl px-6 sm:mt-32">
        <Reveal>
          <span className="eyebrow">Or start from a ready-made library</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Proven modules you can run today, or remix.</h2>
          <p className="mt-2 max-w-2xl text-slate2">
            A library of built-and-tested modules — from interrogating an AI CEO to redesigning your own job — ready to
            assign as-is or clone as a starting point for your own.
          </p>
        </Reveal>
        <LandingLibrary />
      </section>

      {/* Final CTA */}
      <section className="mx-auto mt-24 max-w-6xl px-6 sm:mt-32">
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-line bg-ink px-8 py-14 text-center sm:py-20">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-[2.6rem]">Bring your material to life.</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-white/70">Show us a deck and we&apos;ll turn it into a working module on the call. See what your program could become.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/for-teams" className="btn-primary">See it for L&amp;D <span aria-hidden>→</span></Link>
              <Link href="/login?mode=signup" className="rounded-full px-5 py-2.5 text-sm font-semibold text-white/85 hover:text-white">Or try it yourself →</Link>
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
