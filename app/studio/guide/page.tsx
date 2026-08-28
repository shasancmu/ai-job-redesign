import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { roleFor } from "@/lib/orgs";

export const dynamic = "force-dynamic";

const LOOP = [
  { n: "1", title: "Create", body: "Draft a module from your materials or a description." },
  { n: "2", title: "Run", body: "Assign it to a cohort, or share the link." },
  { n: "3", title: "Observe", body: "See scores, where people got stuck, what surfaced." },
  { n: "4", title: "Improve", body: "Tighten it with the copilot and the quality checks." },
  { n: "5", title: "Reuse", body: "Run it again, or promote it so others can use it." },
];

const TYPES = [
  { emoji: "🎭", name: "Role-play", best: "Interrogate an AI character under a hidden truth and judge under uncertainty. For detecting deception, diligence, eliciting from a guarded source, reading a person. (The Earnings Call is this.)" },
  { emoji: "🗂️", name: "Guided interview → output", best: "An AI interviews the learner, then writes a report, scorecard, or verdict. For applying a framework to the learner's own situation (Five Forces, jobs-to-be-done, a readiness check, a reflection)." },
  { emoji: "🤝", name: "Negotiation", best: "Negotiate a scored deal against an AI counterpart with a hidden payoff table. For bargaining, deal-making, and trade-offs." },
  { emoji: "⏱️", name: "Timed quiz", best: "A timed multiple-choice test, scored server-side, with a debrief tuned to what the learner missed. For recall and concept checks." },
  { emoji: "📊", name: "Analytical instrument", best: "Break a subject into units and score each against a scale you define, X-ray style. For audits: AI-exposure of a job, risk of a plan, evidence strength of an argument." },
  { emoji: "🤝", name: "Paired redesign", best: "Two learners interview each other live, then redesign each other's work on an instrument you set. For workshop-style peer redesign of a job or workflow." },
  { emoji: "📖", name: "Explainer", best: "A taught, guided walkthrough of a topic, section by section. For handing learners a concept clearly before the interactive work." },
  { emoji: "🗞️", name: "In the News", best: "Apply a business framework to a real, current news story pulled live at run time. Keeps a framework alive against this week's headlines." },
];

const FINISH = [
  { title: "Edit", body: "A structured editor holds every field, with an AI copilot beside it. Type an instruction (\"make the counterpart tougher\", \"add a scenario\") and it revises the draft." },
  { title: "Check quality", body: "Validate flags anything missing. For role-plays, the Critic gives an adversarial read of your design, and Playtest runs a simulated learner to see whether it actually teaches, before a real one runs it." },
  { title: "Publish", body: "Publishing makes the module runnable at its own link. Until then it's a private draft only you see." },
  { title: "Assign or share", body: "Attach it to a cohort so a class runs it together, or just send the link. Learners never see the answer key or the hidden layer." },
  { title: "Observe and improve", body: "Watch results and insights come in, then revise. History keeps a snapshot of every save, so you can always restore a prior version." },
];

export default async function GuidePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0)) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/studio/create" className="text-sm text-slate2 hover:text-ink">← Create</Link><HeaderNav /></div>
      </header>

      <span className="eyebrow">Guide</span>
      <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">How to create a module</h1>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate2">
        A module is one interactive experience your learners do, not watch. This walks through the idea behind them, then exactly how to build one.
      </p>

      {/* ============================ CONCEPTUAL ============================ */}
      <section className="mt-14">
        <span className="eyebrow text-sage">The idea</span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">What a module actually is</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-slate2">
          <p>
            Most learning content is watched or read. A module is different: an AI runs a live experience the learner takes part in. It interviews them, plays a counterpart, poses a case, or grades a real attempt, and it adapts to what they actually say.
          </p>
          <p>
            Two things make it work. First, the learner <b className="text-ink">does the thing</b>, on a situation that is real to them, so the practice sticks. Second, they walk away with a <b className="text-ink">concrete output</b>: a plan, a scorecard, a redesigned role, a graded run. Not a completion checkmark.
          </p>
          <p>
            Your job as the author is to set the situation and the standard. The AI handles the conversation and the feedback.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight text-ink">The loop you are designing for</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate2">A good module is not a one-time asset. It is something you run, learn from, and sharpen. That cycle is the whole point.</p>
        <ol className="mt-5 grid gap-3 sm:grid-cols-5">
          {LOOP.map((s) => (
            <li key={s.n} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{s.n}</div>
              <div className="mt-2.5 text-sm font-bold text-ink">{s.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-500">{s.body}</div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Pick the right shape</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate2">
          Every module is one of these shapes. You do not have to know which before you start, the upload flow suggests them, but knowing what each is for helps you choose well.
        </p>
        <div className="mt-5 space-y-2.5">
          {TYPES.map((t) => (
            <div key={t.name} className="flex gap-3 rounded-2xl border border-line bg-white p-4">
              <div className="text-2xl leading-none">{t.emoji}</div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-ink">{t.name}</div>
                <div className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{t.best}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="rounded-2xl bg-mist/60 p-5">
          <div className="text-sm font-bold text-ink">Where a module lives</div>
          <p className="mt-1.5 text-[14px] leading-relaxed text-slate2">
            A new module is <b className="text-ink">Personal</b> by default: it runs in your own classes, no approval needed. A director can promote a good one to run <b className="text-ink">org-wide</b>, and a curator can send a vetted one to the <b className="text-ink">shared library</b> everyone draws from. Quality earns reach; nothing floods the platform.
          </p>
        </div>
      </section>

      {/* ============================ PRACTICAL ============================ */}
      <section className="mt-16 border-t border-line pt-12">
        <span className="eyebrow text-ai">Step by step</span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">How to build one</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate2">Three ways in. All of them land you in the same editor with a working draft, and all take minutes. Pick the one that fits where you&apos;re starting from.</p>
      </section>

      <section className="mt-6">
        <div className="rounded-2xl border border-ai/30 bg-gradient-to-br from-ai/5 to-mist/40 p-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">📎</span>
            <div className="text-sm font-bold text-ink">Path A — Upload your materials</div>
          </div>
          <p className="mt-1 text-xs text-slate-500">Fastest when you already have a deck or reading.</p>
          <ol className="mt-3 space-y-2.5 text-[14px] leading-relaxed text-slate2">
            <li><b className="text-ink">1. Drop your files.</b> Go to Create, then Upload, and add your slides, a PDF, a Word doc, or notes. They are read to draft the module and never stored.</li>
            <li><b className="text-ink">2. See the menu.</b> It reads the material and proposes a few genuinely different modules it could become, across formats. Pick one, a few, or all of them.</li>
            <li><b className="text-ink">3. Watch it draft.</b> Each module is written live from your material, so you can see it take shape.</li>
            <li><b className="text-ink">4. Edit and launch.</b> You land in the editor with a working first draft. Make a few changes, then publish.</li>
          </ol>
          <Link href="/studio/upload" className="btn-primary mt-4 inline-block text-sm">Upload materials →</Link>
        </div>
      </section>

      <section className="mt-4">
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎙️</span>
            <div className="text-sm font-bold text-ink">Path B — Talk it through</div>
          </div>
          <p className="mt-1 text-xs text-slate-500">Best when you&apos;re not sure which format fits, or you have no materials to upload.</p>
          <ol className="mt-3 space-y-2.5 text-[14px] leading-relaxed text-slate2">
            <li><b className="text-ink">1. Start the interview.</b> Choose &ldquo;Talk it through&rdquo; on Create (or the Upload page), by <b className="text-ink">text or voice</b> (the blue dot asks the questions aloud). It works with or without materials; if you uploaded some, it draws on them.</li>
            <li><b className="text-ink">2. Answer a few questions.</b> It asks what you want learners to be able to do, who they are, and what&apos;s hard, five or six short questions, then tells you when it has enough.</li>
            <li><b className="text-ink">3. See what it can build.</b> It turns the conversation into the same menu of module ideas, already shaped by what you said. Pick one or more.</li>
            <li><b className="text-ink">4. Edit and launch.</b> Same editor, same finish.</li>
          </ol>
          <Link href="/studio/upload?start=interview" className="btn-ghost mt-4 inline-block text-sm">Start an interview →</Link>
        </div>
      </section>

      <section className="mt-4">
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <div className="text-sm font-bold text-ink">Path C — Describe a specific module</div>
          </div>
          <p className="mt-1 text-xs text-slate-500">Best when you already know the shape you want.</p>
          <ol className="mt-3 space-y-2.5 text-[14px] leading-relaxed text-slate2">
            <li><b className="text-ink">1. Pick a shape.</b> In Create, choose the type that fits (a role-play, an interview, a quiz, and so on).</li>
            <li><b className="text-ink">2. Describe it.</b> Say the situation, the characters, or the framework in a sentence or two. The copilot drafts a full first version.</li>
            <li><b className="text-ink">3. Edit and launch.</b> Same editor, same finish: refine, validate, publish.</li>
          </ol>
          <Link href="/studio/create" className="btn-ghost mt-4 inline-block text-sm">Browse the shapes →</Link>
        </div>
      </section>

      <section className="mt-10">
        <h3 className="text-lg font-bold text-ink">Finishing a module</h3>
        <p className="mt-1 text-[14px] leading-relaxed text-slate2">However you started, these are the last steps.</p>
        <div className="mt-4 space-y-3">
          {FINISH.map((s, i) => (
            <div key={s.title} className="flex gap-3.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-soft text-xs font-bold text-sage">{i + 1}</div>
              <div>
                <div className="text-sm font-bold text-ink">{s.title}</div>
                <div className="mt-0.5 text-[14px] leading-relaxed text-slate2">{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="text-sm font-bold text-ink">Three things that make a module good</div>
          <ul className="mt-2.5 space-y-2 text-[14px] leading-relaxed text-slate2">
            <li><b className="text-ink">One clear objective.</b> A module that tries to teach everything teaches nothing. Name the single thing a learner should walk away able to do.</li>
            <li><b className="text-ink">Let the copilot draft, then you judge.</b> The AI is fast at a first version. Your edits are where the real quality comes from.</li>
            <li><b className="text-ink">Use real material.</b> Your own case, deck, or situation beats anything generic, and it is what makes the practice transfer.</li>
          </ul>
        </div>
      </section>

      <div className="mt-12 flex flex-wrap items-center gap-3">
        <Link href="/studio/upload" className="btn-primary text-sm">Start with your materials →</Link>
        <Link href="/studio/create" className="btn-ghost text-sm">Or pick a shape</Link>
      </div>
    </main>
  );
}
