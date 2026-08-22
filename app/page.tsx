import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import HeroVisual from "@/components/HeroVisual";
import LandingLibrary from "@/components/LandingLibrary";
import ShareApp from "@/components/ShareApp";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import HomeStory from "@/components/HomeStory";
import { MODULES } from "@/lib/modules";

const EXERCISE_STAT = `${Math.floor(MODULES.filter((m) => !m.hidden).length / 5) * 5}+`;

// Minimal line icons — 24×24, stroke = currentColor. Kept intentionally plain
// so the cards read as considered product UI, not emoji.
const ICON: Record<string, React.ReactNode> = {
  runs: (
    <><path d="M7.5 8.5h9M7.5 12h6" /><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v8a1.5 1.5 0 0 1-1.5 1.5H9l-4 3.5v-3.5H5.5A1.5 1.5 0 0 1 4 13.5Z" /></>
  ),
  frameworks: (
    <><rect x="4" y="4" width="7" height="7" rx="1.2" /><rect x="13" y="4" width="7" height="7" rx="1.2" /><rect x="4" y="13" width="7" height="7" rx="1.2" /><rect x="13" y="13" width="7" height="7" rx="1.2" /></>
  ),
  keep: (
    <><path d="M6 3.5h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" /><path d="M13.5 3.5V8h4.5" /><path d="M8.5 13h7M8.5 16.5h5" /></>
  ),
  voice: (
    <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0" /><path d="M12 17v3.5M9 20.5h6" /></>
  ),
  paired: (
    <><circle cx="8.5" cy="8" r="3" /><circle cx="16" cy="9.5" r="2.4" /><path d="M3.5 19c0-2.8 2.2-5 5-5s5 2.2 5 5" /><path d="M14.5 14.2c2.3.3 4 2.2 4 4.8" /></>
  ),
  changes: (
    <><path d="M13 3 5 13.5h5.5L10 21l8-10.5h-5.5Z" /></>
  ),
};

const GETS = [
  { icon: "runs", tint: "#3F7A52", soft: "bg-sage-soft", title: "An AI that runs it", body: "It interviews you, plays a partner or a tough counterpart, and coaches the debrief — adapting to what you actually say." },
  { icon: "frameworks", tint: "#2F6DA8", soft: "bg-sky-soft", title: "Real frameworks", body: "Every exercise is built on established research, not generic advice — the kind of thinking that holds up on a real decision." },
  { icon: "keep", tint: "#B07A1E", soft: "bg-amber-soft", title: "Something you keep", body: "A plan, a redesigned role, a map, a sharpened story — a concrete artifact you can act on, not a grade." },
  { icon: "voice", tint: "#B0533E", soft: "bg-clay-soft", title: "Type or talk", body: "Do it in text, or go hands-free and just talk it through by voice." },
  { icon: "paired", tint: "#3F7A52", soft: "bg-sage-soft", title: "Solo or paired", body: "Work through it on your own, or pair up and interview each other." },
  { icon: "changes", tint: "#B07A1E", soft: "bg-amber-soft", title: "It changes how you work", body: "You practice the thinking and leave having actually done it — not just read about it." },
];

const RESEARCH = [
  { title: "The economics of AI & work", body: "How AI is actually reshaping specific tasks, roles, and careers — not the hype." },
  { title: "Elicitation & interviewing", body: "What makes an interview — spoken or typed — draw out real signal instead of platitudes." },
  { title: "Network science", body: "How advice, trust, and influence really move through a team or a room." },
  { title: "Behavioral strategy", body: "The frameworks that hold up when a real decision, bet, or negotiation is on the line." },
];

const FOR_YOU = [
  ["Rethinking your own role", "See what AI can take off your plate, and where your judgment becomes the point."],
  ["Managing a team", "Redesign how the work gets done and put people and AI in the right seats."],
  ["Building something", "Pressure-test a bet, shape a vision, and practice the negotiations that decide it."],
  ["On the move", "Sharpen your story, map your next moves, and rehearse the conversations that matter."],
];

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main>
      {/* Hero with the signature flowing gradient ribbon */}
      <div className="hero-wrap">
        <div className="ribbon" />
        <div className="ribbon-2" />
        <div className="relative mx-auto max-w-6xl px-6">
          <HeroVisual />
          <nav className="relative z-10 flex items-center justify-between py-5">
            <Logo />
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden text-sm font-semibold text-ink/80 hover:text-ink sm:inline">
                Sign in
              </Link>
              <Link href="/login?mode=signup" className="btn-dark">
                Get started
              </Link>
            </div>
          </nav>

          <div className="relative z-10 max-w-2xl pb-28 pt-16 sm:pb-36 sm:pt-24">
            <span className="eyebrow">AI for business strategy and innovation</span>
            <h1 className="display mt-4 text-[2.75rem] text-ink sm:text-[4rem]">
              Better strategy, with AI as your partner.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate2">
              Superadditive puts real business frameworks to work on your
              strategy, your innovation bets, your negotiations, and your own
              job. AI runs the interview, plays your counterpart, and coaches the
              debrief. You bring the judgment.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/try" className="btn-primary">
                Get your 90-second read <span aria-hidden>→</span>
              </Link>
            </div>
            <div className="mt-4">
              <Link
                href="/for-teams"
                className="text-sm font-medium text-slate2 underline-offset-4 hover:text-ink hover:underline"
              >
                Running this for a team or program? <span aria-hidden>→</span>
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
              [EXERCISE_STAT, "AI-run exercises, and growing"],
              ["Free", "to start — no card needed"],
              ["Yours", "every result is yours to keep"],
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
            The people who gain from AI <span className="text-sage">reimagine their own work</span> — they don&apos;t just bolt a tool onto it. Every exercise helps you do exactly that.
          </p>
        </Reveal>
      </section>

      {/* What you get */}
      <section className="mx-auto mt-24 max-w-6xl px-6 sm:mt-32">
        <Reveal>
          <span className="eyebrow">What you get</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">A workout for your judgment, not another course to watch.</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GETS.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 80}>
              <div className="card h-full p-6">
                <div className={"flex h-11 w-11 items-center justify-center rounded-xl " + f.soft} aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={f.tint} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {ICON[f.icon]}
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-bold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate2">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works — scrolly */}
      <section className="mx-auto mt-28 max-w-6xl px-6 sm:mt-40">
        <Reveal>
          <div className="max-w-2xl">
            <span className="eyebrow">How it works</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">From your real situation to something you keep, in three moves.</h2>
          </div>
        </Reveal>
        <div className="mt-12"><HomeStory /></div>
      </section>

      {/* Grounded in science */}
      <section className="mt-16 border-y border-line bg-mist/50">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <Reveal>
            <div className="max-w-2xl">
              <span className="eyebrow">Grounded in science</span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Frameworks from the frontier — not invented for a webinar.</h2>
              <p className="mt-4 text-lg leading-relaxed text-slate2">
                Every exercise is built on peer-reviewed research and put to work by an AI that runs it with you. Rigor a
                researcher would recognize, in a form you&apos;ll actually finish.
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

      {/* The exercises */}
      <section className="mx-auto mt-24 max-w-6xl px-6 sm:mt-32">
        <Reveal>
          <span className="eyebrow">The library</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Find your starting point.</h2>
          <p className="mt-2 max-w-2xl text-slate2">
            Every exercise is run by an AI interviewer, partner, counterpart, or coach, and ends in something you keep.
            Search or filter by theme to find the one that fits what you&apos;re working on right now.
          </p>
        </Reveal>
        <LandingLibrary />
      </section>

      {/* Who it's for */}
      <section className="mx-auto mt-24 max-w-6xl px-6 sm:mt-32">
        <Reveal>
          <span className="eyebrow">Wherever you are</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Built for the decision in front of you.</h2>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FOR_YOU.map(([t, b], i) => (
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
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-[2.6rem]">Start with the thing you&apos;re actually working on.</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-white/70">Create an account and finish your first exercise in minutes. It&apos;s free to start.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/try" className="btn-primary">Get your 90-second read <span aria-hidden>→</span></Link>
              <ShareApp />
              <Link href="/for-teams" className="rounded-full px-5 py-2.5 text-sm font-semibold text-white/85 hover:text-white">Running this for a team? →</Link>
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
