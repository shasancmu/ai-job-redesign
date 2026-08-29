import Link from "next/link";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";

export const metadata = {
  title: "The Relationship OS — Superadditive",
  description: "A program is a transaction. The Relationship OS turns it into a lifelong, high-value relationship with every learner — at fixed cost.",
};

const CONTACT = "/contact?source=relationship-os";

const BEATS = [
  { n: "1", title: "Drip value", body: "Free module drops and sharp, relevant nudges — micro-doses that keep a learner engaged. Cheap to give, easy to receive." },
  { n: "2", title: "Stay warm", body: "The relationship stays alive without per-head effort. You learn what each person values by what they do — and every touch gets more relevant." },
  { n: "3", title: "Ask when it fits", body: "Because you've been giving, the relevant ask lands — the next exec-ed program, an event, an intro — surfaced to the right person at the right moment." },
];

const LENSES = [
  { icon: "🕸️", title: "Network theory", body: "The cohort is a graph. Read who's embedded, who's isolated (the churn risk), and who the connectors are — the brokers who carry value and referrals across the whole group." },
  { icon: "💬", title: "Relationship science", body: "A tie strengthens with recency, frequency, and reciprocity — and decays in silence. Catch a relationship while it's cooling, when a small deposit still saves it." },
  { icon: "♟️", title: "Game theory", body: "Sustaining a relationship is a repeated cooperation game. Invest value where cooperation is decaying; keep peer interaction positive-sum by design, so it can't be gamed or spammed." },
];

export default function RelationshipOS() {
  return (
    <main className="bg-paper text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo href="/" />
        <div className="flex items-center gap-4 text-sm">
          <Link href="/for-teams" className="text-slate2 hover:text-ink">For teams</Link>
          <Link href={CONTACT} className="btn-dark text-sm">Talk to us</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-12 text-center sm:pt-20">
        <span className="eyebrow text-sage">The Relationship OS</span>
        <h1 className="display mt-4 text-[2.5rem] leading-[1.05] text-ink sm:text-[3.75rem]">
          A program is a transaction.<br />Make it the start of a relationship.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate2">
          Most schools touch a learner once, then send a magazine and a donation ask. The Relationship OS turns every student and every alum into a <b className="text-ink">lifelong, high-value relationship</b> — run by the platform, at <b className="text-ink">fixed cost</b>.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={CONTACT} className="btn-dark">Bring it to your institution →</Link>
          <Link href="/for-teams" className="btn-ghost">See the platform</Link>
        </div>
      </section>

      {/* The reframe */}
      <section className="mx-auto mt-24 max-w-3xl px-6 sm:mt-32">
        <Reveal>
          <span className="eyebrow">The idea</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">The currency isn&apos;t email. It&apos;s value.</h2>
          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-slate2">
            <p>A relationship is a <b className="text-ink">repeated, two-way exchange of value</b> — not a broadcast channel. The asks you care about (keep them updated, sell more programs, earn referrals) are <b className="text-ink">byproducts of value you&apos;ve banked</b>, never the point of contact.</p>
            <p>So the sequence is everything: <b className="text-ink">give first, and keep the value-to-ask ratio lopsided in the learner&apos;s favor.</b> Get it backwards — ask before you&apos;ve given — and you convert a relationship back into a transaction, and a resented one.</p>
          </div>
        </Reveal>
      </section>

      {/* The loop */}
      <section className="mx-auto mt-24 max-w-5xl px-6 sm:mt-28">
        <Reveal>
          <div className="text-center">
            <span className="eyebrow">The loop</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Three beats, on repeat.</h2>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {BEATS.map((b) => (
            <Reveal key={b.n}>
              <div className="h-full rounded-2xl border border-line bg-white p-6">
                <div className="text-sm font-bold text-sage">{b.n}</div>
                <div className="mt-1 text-lg font-bold text-ink">{b.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate2">{b.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* The flywheel */}
      <section className="mt-24 border-y border-line bg-mist/50 sm:mt-32">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <Reveal>
            <span className="eyebrow text-sage">The engine</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Understanding ↔ value: the flywheel</h2>
            <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-slate2">
              <p>You learn what a person values → you give value tailored to it → they receive it and reveal <i>more</i> about what they value → your understanding deepens → the next touch is even more relevant.</p>
              <p>Every turn does two things at once: it raises the value to the learner, and it builds a <b className="text-ink">model of that learner</b> that makes every future touch more relevant. That accumulated understanding is the moat — a competitor can send the same email, but they can&apos;t replicate a decade of knowing this person. <b className="text-ink">Strength is relevance, and relevance compounds.</b></p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* The three lenses */}
      <section className="mx-auto mt-24 max-w-6xl px-6 sm:mt-32">
        <Reveal>
          <div className="text-center">
            <span className="eyebrow">Under the hood</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Built on three sciences of connection.</h2>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {LENSES.map((l) => (
            <Reveal key={l.title}>
              <div className="h-full rounded-2xl border border-line bg-white p-6">
                <div className="text-2xl">{l.icon}</div>
                <div className="mt-3 text-lg font-bold text-ink">{l.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate2">{l.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Fixed cost */}
      <section className="mx-auto mt-24 max-w-3xl px-6 sm:mt-32">
        <Reveal>
          <span className="eyebrow text-sage">The economics</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">A high-value relationship with everyone — at fixed cost.</h2>
          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-slate2">
            <p>A human relationship — an advisor, an alumni officer — costs hundreds of dollars a head and doesn&apos;t scale. Here the warmth is manufactured by <b className="text-ink">personalization, community, and AI</b>, not per-head labor. The platform, the content, and light oversight are fixed; the marginal cost of one more person is <b className="text-ink">cents</b>.</p>
            <p>Which is the only reason &ldquo;every student and every alum, personalized&rdquo; is even possible. For that fixed cost, the institution gets future programs filled at near-zero acquisition cost, referral-driven admissions, deeper alumni giving, a live stream of outcomes — and a lifelong, measurable relationship with every person it has ever taught.</p>
          </div>
        </Reveal>
      </section>

      {/* Two-sided value */}
      <section className="mx-auto mt-20 max-w-5xl px-6 sm:mt-28">
        <div className="grid gap-4 sm:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-line bg-white p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-sage">What the learner gets</div>
              <p className="mt-2 text-[15px] leading-relaxed text-slate2">A lifelong companion that keeps them sharp, a living portfolio of what they&apos;ve built, an activated network of peers, and the right opportunity surfaced <i>for</i> them. Not &ldquo;the place I went once&rdquo; — a lifelong advantage they belong to.</p>
            </div>
          </Reveal>
          <Reveal>
            <div className="h-full rounded-2xl border border-line bg-white p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-sage">What the institution gets</div>
              <p className="mt-2 text-[15px] leading-relaxed text-slate2">A pipeline for every program filled at near-zero CAC, referrals that compound, deeper giving from engaged alumni, and a defensible asset — the accumulated understanding of, and network among, everyone it has taught.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-24 max-w-4xl px-6 sm:mt-32">
        <div className="rounded-3xl bg-ink px-8 py-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-[2.6rem]">Turn your alumni list into a living relationship.</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">Every student, every alum, one platform — value-first, at fixed cost.</p>
          <Link href={CONTACT} className="mt-7 inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white/90">Talk to us →</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
