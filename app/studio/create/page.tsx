import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { roleFor } from "@/lib/orgs";

export const dynamic = "force-dynamic";

// The one authoring home. Two ways in that pick the format for you (upload
// materials and/or talk it through), then one equal gallery of every format for
// when you already know what you want — no format dominating, none buried.
const FORMATS: { emoji: string; name: string; blurb: string; href: string; tag?: string }[] = [
  { emoji: "🎬", name: "Living case", blurb: "An interactive, decision-first case study from your materials: the learner reads the evidence, commits a call under uncertainty, then gets the reveal — with drill-downs and a tutor.", href: "/studio/case" },
  { emoji: "🎭", name: "Role-play with a hidden truth", blurb: "The learner interrogates an AI character who won't lie but will spin, then makes a call. Like The Earnings Call.", href: "/studio/roleplay", tag: "9 examples" },
  { emoji: "🗂️", name: "Guided interview → output", blurb: "An AI interviews the learner, then writes a report, scorecard, or verdict grounded in a framework you name.", href: "/studio/interview/start" },
  { emoji: "🤝", name: "Negotiation", blurb: "The learner negotiates a scored deal against an AI counterpart with a hidden payoff table. Value-creating trades beat splitting the difference.", href: "/studio/negotiation/start" },
  { emoji: "📊", name: "Analytical instrument", blurb: "Break a subject into units and score each against a scale you define, X-ray style — AI-exposure, risk, evidence strength.", href: "/studio/analytical/start" },
  { emoji: "⏱️", name: "Timed quiz", blurb: "A timed, multiple-choice quiz. Server-scored, so the answer key stays private.", href: "/studio/benchmark/start" },
  { emoji: "📖", name: "Explainer", blurb: "A taught, section-by-section walkthrough of a topic — the clearest way to hand learners a concept before the interactive work.", href: "/studio/explainer/start" },
  { emoji: "🗞️", name: "In the News", blurb: "Apply a framework to real, current headlines that refresh every run, so the module never goes stale.", href: "/studio/news/start" },
  { emoji: "🔧", name: "Paired redesign", blurb: "Two learners interview each other, then redesign each other's subject on an instrument you define. A live two-person experience.", href: "/studio/redesign/start", tag: "beta · live" },
  { emoji: "🌥️", name: "Live group activity", blurb: "A whole-room word cloud, poll, or open responses with an AI synthesis. Participants join on their phones, no account.", href: "/studio/live/new" },
];

export const metadata = { title: "Create a module" };

export default async function CreateGallery() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  const canCreate = role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0;
  if (!canCreate) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/studio" className="text-sm text-slate2 hover:text-ink">← Studio</Link><HeaderNav /></div>
      </header>
      <h1 className="text-3xl text-ink">Create a module</h1>
      <p className="mt-1 max-w-2xl text-slate2">Start from your own materials, talk it through with the AI, or pick a format. The editor and AI copilot take it from there.</p>
      <p className="mt-2 text-sm text-slate-500">New to this? <Link href="/studio/guide" className="font-medium text-ai hover:underline">Read the guide</Link> — what modules are, and how to build one. Already made some? <Link href="/studio/mine" className="font-medium text-ai hover:underline">Your modules →</Link></p>

      {/* Two ways in that pick the format for you. They are an "and", not an
          "or": the upload screen lets you add materials AND talk it through,
          grounded in what you added — so neither card claims to be the only way. */}
      <div className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">Not sure which format? Start here</div>
      <Link href="/studio/upload" className="group mt-3 block rounded-2xl border border-ai/40 bg-gradient-to-br from-ai/5 to-mist/50 p-5 transition hover:shadow-sm sm:p-6">
        <div className="flex items-center gap-4">
          <div className="text-3xl">📎</div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-ink group-hover:text-ai">Upload your materials → get a module</div>
            <div className="mt-0.5 text-sm text-slate2">Drop PDFs, Word docs, or notes and paste links. It reads them, picks the best format, and drafts a module — and you can add a quick interview on top. The fastest way in.</div>
          </div>
          <span className="shrink-0 text-lg font-semibold text-ai">→</span>
        </div>
      </Link>
      <Link href="/studio/upload?start=interview" className="group mt-3 block rounded-2xl border border-line bg-white p-5 transition hover:border-ai/40 hover:shadow-sm sm:p-6">
        <div className="flex items-center gap-4">
          <div className="text-3xl">🎙️</div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-ink group-hover:text-ai">Talk it through</div>
            <div className="mt-0.5 text-sm text-slate2">The AI interviews you, by text or voice, about what you want learners to do, then proposes what to build. Add materials too and it uses both.</div>
          </div>
          <span className="shrink-0 text-lg font-semibold text-ai">→</span>
        </div>
      </Link>

      {/* One equal gallery of every format — always visible, none dominating. */}
      <div className="mt-10 text-xs font-semibold uppercase tracking-wide text-slate-400">Or pick a format</div>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">Each starts a draft in one specific format. Not sure which fits? Use one of the two paths above, or read <Link href="/studio/guide" className="font-medium text-ai hover:underline">what each format is for</Link>.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FORMATS.map((f) => (
          <Link key={f.href} href={f.href} className="group flex flex-col rounded-2xl border border-line bg-white p-4 transition hover:border-ai/40 hover:shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="text-2xl">{f.emoji}</div>
              {f.tag && <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{f.tag}</span>}
            </div>
            <div className="mt-2 text-sm font-bold text-ink group-hover:text-ai">{f.name}</div>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">{f.blurb}</p>
            <span className="mt-3 text-sm font-semibold text-ai">Start →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
