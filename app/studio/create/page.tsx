import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { roleFor } from "@/lib/orgs";
import { ROLEPLAY_TEMPLATES } from "@/lib/mechanics/templates";

export const dynamic = "force-dynamic";

// The one authoring home: pick a template, from either mechanic, and land in the
// right editor. The two engines stay specialized underneath; this is the shared
// front door for "create".
const INTERVIEW_TEMPLATES = [
  { type: "report", emoji: "📝", name: "Interview → report", domain: "Reflection · discovery", whenToUse: "An AI interviewer draws someone out on a topic, then writes a narrative report back. The workhorse." },
  { type: "scorecard", emoji: "📊", name: "Interview → scorecard", domain: "Assessment", whenToUse: "The interview ends in ratings across dimensions you define. Good for skills and readiness checks." },
  { type: "verdict", emoji: "⚖️", name: "Interview → verdict", domain: "Decision", whenToUse: "The interview drives to a labeled decision or recommendation the learner walks away with." },
];

export default async function CreateGallery() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  const canInterview = role.superadmin || role.directorOrgIds.length > 0;
  const canRoleplay = canInterview;
  if (!canInterview && !canRoleplay) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/studio" className="text-sm text-slate2 hover:text-ink">← Studio</Link><HeaderNav /></div>
      </header>
      <h1 className="text-3xl text-ink">Create a module</h1>
      <p className="mt-1 max-w-2xl text-slate2">Start from your own materials, a template, or a blank page. The editor and AI copilot take it from there.</p>

      <Link href="/studio/upload" className="group mt-6 block rounded-2xl border border-ai/40 bg-gradient-to-br from-ai/5 to-mist/50 p-5 transition hover:shadow-sm sm:p-6">
        <div className="flex items-center gap-4">
          <div className="text-3xl">📎</div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-ink group-hover:text-ai">Upload your slides &amp; readings → get a module</div>
            <div className="mt-0.5 text-sm text-slate2">Drop your PDFs, Word docs, or notes. It reads them, picks the best format, and drafts a module you edit and launch. The fastest way in.</div>
          </div>
          <span className="shrink-0 text-lg font-semibold text-ai">→</span>
        </div>
      </Link>
      <div className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">Or build from a template</div>

      {canInterview && (
        <section className="mt-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Guided interview → output</div>
          <p className="mt-1 text-sm text-slate-500">An AI interviewer talks the learner through a topic, then produces a report, scorecard, or verdict grounded in a framework you name.</p>
          <Link href="/build/start" className="group mt-3 flex items-center gap-3 rounded-2xl border border-ai/30 bg-gradient-to-br from-white to-mist/40 p-4 transition hover:shadow-sm">
            <div className="text-2xl">✨</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-ink group-hover:text-ai">Describe your idea, and build it</div>
              <div className="text-xs text-slate-500">Name the subject and the framework; the copilot drafts the whole module.</div>
            </div>
            <span className="shrink-0 text-sm font-semibold text-ai">→</span>
          </Link>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Or start from a shape</div>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {INTERVIEW_TEMPLATES.map((t) => (
              <Link key={t.type} href={`/build/new?type=${t.type}`} className="group flex flex-col rounded-2xl border border-line bg-white p-4 transition hover:shadow-sm">
                <div className="text-2xl">{t.emoji}</div>
                <div className="mt-2 text-sm font-bold text-ink group-hover:text-ai">{t.name}</div>
                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">{t.domain}</div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{t.whenToUse}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {canRoleplay && (
        <section className="mt-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Role-play with hidden truth</div>
          <p className="mt-1 text-sm text-slate-500">The learner interrogates an AI character who won't lie but will spin, then makes a call under uncertainty. Like The Earnings Call.</p>
          <Link href="/studio/roleplay/start" className="group mt-3 flex items-center gap-3 rounded-2xl border border-ai/30 bg-gradient-to-br from-white to-mist/40 p-4 transition hover:shadow-sm">
            <div className="text-2xl">✨</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-ink group-hover:text-ai">Describe your idea, and build it</div>
              <div className="text-xs text-slate-500">One prompt designs the whole module. You refine from there.</div>
            </div>
            <span className="shrink-0 text-sm font-semibold text-ai">→</span>
          </Link>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Or start from a template</div>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {ROLEPLAY_TEMPLATES.map((t) => (
              <div key={t.id} className="flex flex-col rounded-2xl border border-line bg-white p-4 transition hover:shadow-sm">
                <div className="text-2xl">{t.emoji}</div>
                <div className="mt-2 text-sm font-bold text-ink">{t.name}</div>
                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">{t.domain}</div>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-500">{t.whenToUse}</p>
                <div className="mt-3">
                  <Link href={`/studio/roleplay/new?from=${t.id}`} className="btn-primary w-full whitespace-nowrap text-sm">{t.id === "blank" ? "Start" : "Use template"}</Link>
                  {t.runnable && (
                    <div className="mt-2 flex items-center justify-center gap-3 text-xs">
                      <Link href={`/studio/roleplay/new?remix=${t.id}`} className="text-slate2 hover:text-ink">Remix</Link>
                      <span className="text-slate-300">·</span>
                      <Link href={`/m/${t.id}`} target="_blank" className="text-slate2 hover:text-ink">Preview →</Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-right"><Link href="/studio/roleplay" className="text-xs text-slate2 hover:text-ink">Your role-play modules →</Link></div>
        </section>
      )}

      {canRoleplay && (
        <section className="mt-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Negotiation simulation</div>
          <p className="mt-1 text-sm text-slate-500">The learner negotiates a scored deal against an AI counterpart with a hidden payoff table. Value-creating trades beat splitting the difference.</p>
          <Link href="/studio/negotiation/start" className="group mt-3 flex items-center gap-3 rounded-2xl border border-ai/30 bg-gradient-to-br from-white to-mist/40 p-4 transition hover:shadow-sm">
            <div className="text-2xl">🤝</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-ink group-hover:text-ai">Describe your negotiation, and build it</div>
              <div className="text-xs text-slate-500">The copilot writes the hidden payoff tables.</div>
            </div>
            <span className="shrink-0 text-sm font-semibold text-ai">→</span>
          </Link>
          <div className="mt-2 text-right"><Link href="/studio/negotiation" className="text-xs text-slate2 hover:text-ink">Your negotiations →</Link></div>
        </section>
      )}

      {canRoleplay && (
        <section className="mt-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Timed benchmark</div>
          <p className="mt-1 text-sm text-slate-500">A timed, scored "you vs. AI" multiple-choice test. Server-scored so the answer key stays private.</p>
          <Link href="/studio/benchmark/start" className="group mt-3 flex items-center gap-3 rounded-2xl border border-ai/30 bg-gradient-to-br from-white to-mist/40 p-4 transition hover:shadow-sm">
            <div className="text-2xl">⏱️</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-ink group-hover:text-ai">Describe your benchmark, and build it</div>
              <div className="text-xs text-slate-500">The copilot writes the questions and the answer key.</div>
            </div>
            <span className="shrink-0 text-sm font-semibold text-ai">→</span>
          </Link>
          <div className="mt-2 text-right"><Link href="/studio/benchmark" className="text-xs text-slate2 hover:text-ink">Your benchmarks →</Link></div>
        </section>
      )}

      {canRoleplay && (
        <section className="mt-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Analytical instrument</div>
          <p className="mt-1 text-sm text-slate-500">Break a subject into units and score each against a scale you define, X-ray style (AI-exposure, risk, evidence strength).</p>
          <Link href="/studio/analytical/start" className="group mt-3 flex items-center gap-3 rounded-2xl border border-ai/30 bg-gradient-to-br from-white to-mist/40 p-4 transition hover:shadow-sm">
            <div className="text-2xl">📊</div>
            <div className="min-w-0 flex-1"><div className="text-sm font-bold text-ink group-hover:text-ai">Describe your instrument, and build it</div><div className="text-xs text-slate-500">Name the subject, the units, and the scale.</div></div>
            <span className="shrink-0 text-sm font-semibold text-ai">→</span>
          </Link>
          <div className="mt-2 text-right"><Link href="/studio/analytical" className="text-xs text-slate2 hover:text-ink">Your instruments →</Link></div>
        </section>
      )}

      {canRoleplay && (
        <section className="mt-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Paired redesign <span className="ml-1 rounded-full bg-amber-soft px-1.5 py-0.5 text-[10px] font-semibold text-amber">beta · live</span></div>
          <p className="mt-1 text-sm text-slate-500">Two learners interview each other, then redesign each other's subject on an instrument you define. A live two-person experience.</p>
          <Link href="/studio/redesign/start" className="group mt-3 flex items-center gap-3 rounded-2xl border border-ai/30 bg-gradient-to-br from-white to-mist/40 p-4 transition hover:shadow-sm">
            <div className="text-2xl">🤝</div>
            <div className="min-w-0 flex-1"><div className="text-sm font-bold text-ink group-hover:text-ai">Describe your redesign, and build it</div><div className="text-xs text-slate-500">Name the subject and the AI/Human split.</div></div>
            <span className="shrink-0 text-sm font-semibold text-ai">→</span>
          </Link>
          <div className="mt-2 text-right"><Link href="/studio/redesign" className="text-xs text-slate2 hover:text-ink">Your redesigns →</Link></div>
        </section>
      )}

      {canRoleplay && (
        <section className="mt-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Live group activity</div>
          <p className="mt-1 text-sm text-slate-500">Author a whole-room activity — word cloud, poll, or open responses with an AI synthesis — then run it by code. Participants join on their phones, no account.</p>
          <Link href="/studio/live/new" className="group mt-3 flex items-center gap-3 rounded-2xl border border-ai/30 bg-gradient-to-br from-white to-mist/40 p-4 transition hover:shadow-sm">
            <div className="text-2xl">🌥️</div>
            <div className="min-w-0 flex-1"><div className="text-sm font-bold text-ink group-hover:text-ai">Author a live activity</div><div className="text-xs text-slate-500">Pick a type, write the prompt, run it any time.</div></div>
            <span className="shrink-0 text-sm font-semibold text-ai">→</span>
          </Link>
          <div className="mt-2 text-right"><Link href="/studio/live" className="text-xs text-slate2 hover:text-ink">Your live activities →</Link></div>
        </section>
      )}
    </main>
  );
}
