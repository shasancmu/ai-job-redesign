import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { staffActiveOrg } from "@/lib/orgs";
import { gatherUnderstanding } from "@/lib/understand";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import UnderstandBrief from "@/components/UnderstandBrief";
import ReachOut from "@/components/ReachOut";

export const dynamic = "force-dynamic";

const BUCKET: Record<string, { label: string; cls: string }> = {
  strong: { label: "Active", cls: "bg-emerald-50 text-emerald-700" },
  cooling: { label: "Cooling", cls: "bg-amber-50 text-amber-800" },
  at_risk: { label: "Drifting", cls: "bg-orange-50 text-orange-700" },
  dormant: { label: "Quiet", cls: "bg-mist text-slate2" },
};

function day(iso: string): string {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return ""; }
}
function ago(d: number | null): string {
  if (d == null) return "not started yet";
  if (d === 0) return "here today";
  if (d < 30) return `last here ${d}d ago`;
  if (d < 365) return `last here ${Math.round(d / 30)}mo ago`;
  return `last here ${Math.round(d / 365)}y ago`;
}

export const metadata = { title: "Team member" };

export default async function PersonPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await staffActiveOrg(user);
  if (!org) redirect("/dashboard");

  const admin = createAdminClient();
  const u = await gatherUnderstanding(admin, org, params.id);
  if (!u) redirect("/team/relationships"); // not in this org

  const p = u.person;
  const w = u.who;
  const b = BUCKET[p.state.bucket];

  // "Who they are" facts — from what they told us at onboarding.
  const facts = [
    w.segmentLabel && w.segmentLabel.replace(/^I'm /, ""),
    w.goalLabel && `wants to ${w.goalLabel.toLowerCase()}`,
    w.studyField,
    w.teamSize && `team: ${w.teamSize}`,
    w.founderStage,
    w.emailType === "corporate" && w.domain && `@${w.domain}`,
    w.emailType === "education" && w.domain && `@${w.domain}`,
    w.language && w.language !== "English" && w.language,
  ].filter(Boolean) as string[];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/team/relationships" className="text-sm text-slate2 hover:text-ink">← Relationship OS</Link><HeaderNav /></div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-4xl leading-tight text-ink">{p.name}</h1>
        <span className={"rounded-full px-2.5 py-0.5 text-xs font-semibold " + b.cls}>{b.label}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate2">
        {w.email && <span className="font-mono text-[13px] text-slate-500">{w.email}</span>}
        <span>· {ago(p.state.lastActiveDays)}</span>
      </div>
      {facts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {facts.map((f, i) => <span key={i} className="rounded-full bg-mist px-2.5 py-0.5 text-xs text-slate2">{f}</span>)}
        </div>
      )}
      <div className="mt-4"><ReachOut userId={p.userId} name={p.name} /></div>

      {/* The understanding — who they are, what they need. Loads on open. */}
      <section className="mt-6">
        <h2 className="eyebrow mb-2">Understanding {p.name.split(/\s+/)[0]}</h2>
        <UnderstandBrief userId={p.userId} />
      </section>

      {/* What they told us themselves — their own words, not a dossier. */}
      {u.portrait && (u.portrait.summary || u.portrait.reaching_for || u.portrait.context) && (
        <section className="mt-6">
          <h2 className="eyebrow mb-2">In {p.name.split(/\s+/)[0]}&apos;s own words</h2>
          <div className="rounded-2xl border border-line bg-mist/30 p-5">
            {u.portrait.summary && <p className="text-[15px] leading-relaxed text-ink">{u.portrait.summary}</p>}
            <div className="mt-3 space-y-2">
              {([["reaching_for", "Reaching for"], ["friction", "What's hard"], ["where_headed", "Where they're headed"], ["how_they_work", "How they work"], ["context", "Their day to day"]] as const).map(([k, label]) =>
                u.portrait[k] ? <p key={k} className="text-sm leading-relaxed text-slate2"><span className="font-semibold text-ink">{label}:</span> {u.portrait[k]}</p> : null
              )}
            </div>
            <p className="mt-3 text-[11px] text-slate-400">From the portrait they chose to share. Reference it the way you&apos;d remember what someone told you — not as a file.</p>
          </div>
        </section>
      )}

      {/* Evidence: what they've actually done. */}
      <section className="mt-8">
        <h2 className="eyebrow mb-3">What they&apos;ve worked on</h2>
        {p.timeline.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white p-5 text-sm text-slate-400">Nothing yet — they&apos;ve joined but haven&apos;t started. A first note from you might be what gets them going.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line">
            {p.timeline.map((t, i) => (
              <div key={i} className={"flex items-center gap-3 px-4 py-2.5 text-sm " + (i > 0 ? "border-t border-line" : "")}>
                <span className="text-lg" aria-hidden>{t.emoji}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{t.name}</span>
                {t.done ? <span className="shrink-0 rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-medium text-sage">finished</span> : <span className="shrink-0 rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-slate-400">started</span>}
                <span className="shrink-0 text-xs text-slate-400">{day(t.at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Peers */}
      {p.peers.length > 0 && (
        <section className="mt-8">
          <h2 className="eyebrow mb-3">People they&apos;ve worked with</h2>
          <div className="flex flex-wrap gap-2">
            {p.peers.map((pe) => (
              <Link key={pe.userId} href={`/team/person/${pe.userId}`} className="rounded-full border border-line bg-white px-3 py-1 text-sm text-slate2 transition hover:border-slate-300 hover:text-ink">{pe.name}</Link>
            ))}
          </div>
        </section>
      )}

      {/* Notes & messages they've received */}
      {p.pushes.length > 0 && (
        <section className="mt-8">
          <h2 className="eyebrow mb-3">Notes they&apos;ve received</h2>
          <div className="overflow-hidden rounded-2xl border border-line">
            {p.pushes.map((pu, i) => (
              <div key={i} className={"flex items-center gap-3 px-4 py-2.5 text-sm " + (i > 0 ? "border-t border-line" : "")}>
                <span className="min-w-0 flex-1 truncate text-ink">{pu.title}</span>
                <span className="shrink-0 text-xs font-medium text-slate-400">{pu.clicked ? "opened" : pu.seen ? "seen" : "sent"}</span>
                <span className="shrink-0 text-xs text-slate-400">{day(pu.at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10">
        <Link href="/team/relationships" className="btn-ghost text-sm">← Back to your people</Link>
      </div>
    </main>
  );
}
