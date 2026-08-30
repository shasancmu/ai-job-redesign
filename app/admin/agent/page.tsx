import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";
import { listAgentFeedback, agentModules, type AgentNote } from "@/lib/agent";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import AgentRunner from "@/components/AgentRunner";

export const dynamic = "force-dynamic";

function Stars({ n }: { n: number | null }) {
  const v = n || 0;
  return <span className="tabular-nums" title={`${v}/5`}>{"★".repeat(v)}<span className="text-slate-300">{"★".repeat(Math.max(0, 5 - v))}</span></span>;
}

// The self-improvement agent's notebook: latest take per module, worst first, so
// the biggest experience problems rise to the top. Superadmin only.
export default async function AgentPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/agent");
  if (!(await isSuperadmin(user))) redirect("/dashboard");

  const admin = createAdminClient();
  const all = await listAgentFeedback(admin, 500);
  // Latest note per module.
  const latest = new Map<string, AgentNote>();
  for (const n of all) if (!latest.has(n.module_slug)) latest.set(n.module_slug, n);
  const notes = [...latest.values()].sort((a, b) => (a.rating ?? 3) - (b.rating ?? 3));
  const reviewed = latest.size;
  const total = agentModules().length;
  const avg = notes.length ? (notes.reduce((s, n) => s + (n.rating || 0), 0) / notes.length).toFixed(1) : "—";

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/admin" className="text-sm text-slate2 hover:text-ink">← Admin</Link><HeaderNav /></div>
      </header>

      <span className="eyebrow text-sage">Self-improvement agent</span>
      <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">The synthetic learner</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate2">
        An AI plays a learner through each module, then reports how it went and the single highest-value fix. Notes accumulate per module, so you can act on the worst experiences and watch the ratings climb — the self-improvement loop. Runs a few modules per click.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <AgentRunner />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-line bg-white p-4"><div className="text-2xl font-bold text-ink tabular-nums">{reviewed}/{total}</div><div className="mt-0.5 text-xs text-slate2">Modules reviewed</div></div>
        <div className="rounded-2xl border border-line bg-white p-4"><div className="text-2xl font-bold text-ink tabular-nums">{avg}</div><div className="mt-0.5 text-xs text-slate2">Avg experience (1–5)</div></div>
        <div className="rounded-2xl border border-line bg-white p-4"><div className="text-2xl font-bold text-ink tabular-nums">{all.length}</div><div className="mt-0.5 text-xs text-slate2">Total runs logged</div></div>
      </div>

      <section className="mt-8">
        <h2 className="eyebrow mb-3">Where to improve first</h2>
        {notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white p-6 text-center text-sm text-slate2">No runs yet. Hit &ldquo;Run the agent&rdquo; and the synthetic learner starts working through the library.</div>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <div key={n.module_slug} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-ink">{n.module_name}</div>
                    <div className="text-xs text-amber-600"><Stars n={n.rating} /></div>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400">{n.role}</span>
                </div>
                {n.one_thing && <div className="mt-2 rounded-lg bg-sage/5 px-3 py-2 text-sm text-ink"><b className="text-sage">Fix first:</b> {n.one_thing}</div>}
                {n.summary && <p className="mt-2 text-sm italic text-slate2">&ldquo;{n.summary}&rdquo;</p>}
                {n.friction.length > 0 && (
                  <div className="mt-2 text-xs text-slate-500"><span className="font-semibold text-slate-400">Friction:</span> {n.friction.join(" · ")}</div>
                )}
                {n.suggestions.length > 0 && (
                  <div className="mt-1 text-xs text-slate-500"><span className="font-semibold text-slate-400">Ideas:</span> {n.suggestions.join(" · ")}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
