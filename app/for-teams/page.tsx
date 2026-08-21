import Link from "next/link";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import ForTeamsStory from "@/components/ForTeamsStory";

export const metadata = {
  title: "Superadditive for teams & programs",
  description: "A branded, AI-run learning space that keeps your participants engaged long after the program ends.",
};

const CONTACT = "mailto:shasanx@gmail.com?subject=Superadditive%20for%20our%20organization";

const FEATURES = [
  { icon: "🎨", title: "Your brand, your space", body: "Your logo, colors, hero, and a private address — superadditive.app/your-org. It feels like your program, not a vendor." },
  { icon: "🧩", title: "30+ AI-run exercises", body: "More than thirty hands-on exercises — and growing — where an AI runs the interview, plays a partner or counterpart, and coaches the debrief." },
  { icon: "👥", title: "Cohorts, directors & instructors", body: "Organize people into cohorts and sections. Directors run the space; instructors run their groups. You only see your own people." },
  { icon: "📡", title: "Live, in-room activities", body: "Run a live word cloud, benchmark, or network map your whole room joins from their phones — no sign-in for them." },
  { icon: "📄", title: "Their work is theirs", body: "Each exercise ends in a concrete artifact — a plan, a scorecard, a map — that belongs to the participant, to keep and share on their own terms." },
  { icon: "🌱", title: "Know it's landing", body: "See how the cohort is engaging and the themes rising across the room — the pulse of your program, so you can keep the community connected." },
];

const RESEARCH = [
  { title: "The economics of AI & work", body: "How AI is actually reshaping specific tasks, roles, and careers — not the hype." },
  { title: "Elicitation & interviewing", body: "What makes an interview — spoken or typed — draw out real signal instead of platitudes." },
  { title: "Network science", body: "How advice, trust, and influence really move through a team or a room." },
  { title: "Behavioral strategy", body: "The frameworks that hold up when a real decision, bet, or negotiation is on the line." },
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
            <span className="eyebrow">For programs, teams & organizations</span>
            <h1 className="display mt-4 text-[2.75rem] leading-[1.05] text-ink sm:text-[4.25rem]">
              Keep your people thinking, long after the session ends.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate2">
              Give your team or cohort a private, branded space with 30+ AI-run exercises grounded in real research.
              They keep practicing the ideas; you stay connected to the people you brought together.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={CONTACT} className="btn-primary">Bring it to your organization <span aria-hidden>→</span></a>
              <Link href="/" className="btn-ghost">See the exercises</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Numbers — the wow moment */}
      <section className="mx-auto -mt-6 max-w-4xl px-6">
        <Reveal>
          <div className="grid gap-6 rounded-2xl border border-line bg-white p-8 text-center shadow-soft sm:grid-cols-3">
            {[
              ["30+", "AI-run exercises, and growing"],
              ["~1 week", "from hello to your live space"],
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
            The insight peaks on the last day — then fades. <span className="text-sage">Superadditive keeps it alive</span>, with exercises your people actually want to return to.
          </p>
        </Reveal>
      </section>

      {/* What you get */}
      <section className="mx-auto mt-24 max-w-6xl px-6 sm:mt-32">
        <Reveal>
          <span className="eyebrow">What your organization gets</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">A living program, not a PDF.</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 80}>
              <div className="card h-full p-6">
                <div className="text-3xl" aria-hidden>{f.icon}</div>
                <h3 className="mt-4 text-lg font-bold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate2">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works — the scrolly */}
      <section className="mx-auto mt-28 max-w-6xl px-6 sm:mt-40">
        <Reveal>
          <div className="max-w-2xl">
            <span className="eyebrow">How it works</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">From your brand to their breakthrough, in three moves.</h2>
          </div>
        </Reveal>
        <div className="mt-12">
          <ForTeamsStory />
        </div>
      </section>

      {/* Grounded in research */}
      <section className="mt-16 border-y border-line bg-mist/50">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <Reveal>
            <div className="max-w-2xl">
              <span className="eyebrow">Grounded in science</span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Frameworks from the frontier — not invented for a webinar.</h2>
              <p className="mt-4 text-lg leading-relaxed text-slate2">
                Every exercise is built on peer-reviewed research and put to work by an AI that runs it with each person.
                The voice and chat interviews draw on the science of elicitation; the work-and-AI exercises on the latest
                research into how AI reshapes specific jobs; the network maps on decades of network science. Rigor your
                faculty will recognize, in a form your participants will finish.
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

      {/* Why cutting edge */}
      <section className="mx-auto mt-24 max-w-5xl px-6 sm:mt-32">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <div>
              <span className="eyebrow">Why it feels different</span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">The AI runs the exercise. Your people bring the judgment.</h2>
              <p className="mt-4 text-lg leading-relaxed text-slate2">
                This isn&apos;t a course to watch. An AI interviews, partners, counters, and coaches — adapting to each
                person in real time — while the human does the thinking only a human can. It&apos;s the difference between
                reading about strategy and being pushed to make a real call.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="grid gap-3">
              {[
                ["Adaptive, not scripted", "Every session responds to what the person actually says."],
                ["Human + AI, by design", "The exercise makes the case for what only people can lead, own, and judge."],
                ["Live or on their own time", "Run it in the room, or let alumni return to it whenever they like."],
              ].map(([t, b]) => (
                <div key={t} className="card p-5">
                  <div className="font-semibold text-ink">{t}</div>
                  <p className="mt-1 text-sm text-slate2">{b}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Who it's for */}
      <section className="mx-auto mt-24 max-w-6xl px-6 sm:mt-32">
        <Reveal>
          <span className="eyebrow">Built for programs like yours</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">If you gather people to learn, this keeps them together.</h2>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Executive education", "Extend a program past the classroom and give participants a reason to keep coming back."],
            ["Teams inside companies", "A manager equips their team to work smarter with AI — no IT project, just a link."],
            ["Company-wide (site license)", "Roll it out across the organization under your brand, with as many cohorts as you need."],
            ["Fellowships & accelerators", "Keep a cohort practicing the frameworks between sessions, as a connected group."],
            ["Alumni & membership", "Turn a one-time experience into an ongoing, branded relationship with your community."],
            ["Networks & communities", "Give the people you convene a reason — and a shared space — to keep thinking together."],
          ].map(([t, b], i) => (
            <Reveal key={t} delay={i * 80}>
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
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-[2.6rem]">Bring Superadditive to your organization.</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-white/70">
              We&apos;ll set up your branded space, help you shape the cohort, and get your people started — usually within a week.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href={CONTACT} className="btn-primary">Talk to us <span aria-hidden>→</span></a>
              <Link href="/" className="rounded-full px-5 py-2.5 text-sm font-semibold text-white/85 hover:text-white">Explore the exercises</Link>
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
