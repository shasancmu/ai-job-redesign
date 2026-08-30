import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";
import { listAgentFeedback, agentModules, type AgentNote } from "@/lib/agent";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import QAConsole from "@/components/QAConsole";

export const dynamic = "force-dynamic";

// Quality Assurance: pick modules, run a synthetic-user persona panel, get
// improvement notes + a Claude-Code-ready brief. Superadmin only.
export default async function QAPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/agent");
  if (!(await isSuperadmin(user))) redirect("/dashboard");

  const admin = createAdminClient();
  const modules = agentModules().map((m) => ({ slug: m.slug, name: m.name }));
  const all = await listAgentFeedback(admin, 500);
  const latest = new Map<string, AgentNote>();
  for (const n of all) { const k = `${n.module_slug}:${n.role}`; if (!latest.has(k)) latest.set(k, n); }
  const byModule = new Map<string, AgentNote[]>();
  for (const n of latest.values()) { if (!byModule.has(n.module_slug)) byModule.set(n.module_slug, []); byModule.get(n.module_slug)!.push(n); }
  const history = [...byModule.entries()]
    .map(([slug, ns]) => ({ slug, name: ns[0].module_name, avg: ns.reduce((s, n) => s + (n.rating || 0), 0) / ns.length, personas: ns.length }))
    .sort((a, b) => a.avg - b.avg);
  const reviewed = byModule.size;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/admin" className="text-sm text-slate2 hover:text-ink">← Admin</Link><HeaderNav /></div>
      </header>

      <span className="eyebrow text-sage">Quality Assurance</span>
      <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">The synthetic-user QA panel</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate2">
        Pick a module or a set. A panel of five AI personas — <b>learner, skeptic, struggling, expert, hurried</b> — each runs it and reports how it went and the single highest-value fix. Then copy a <b>Claude-Code-ready brief</b> — paste it in and Claude Code drives the live UI to reproduce and fix. That&apos;s the loop.
      </p>

      <div className="mt-6">
        <QAConsole modules={modules} />
      </div>

      {history.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow mb-1">Coverage</h2>
          <p className="mb-3 text-sm text-slate2">{reviewed} of {modules.length} modules reviewed — worst experience first.</p>
          <div className="overflow-hidden rounded-2xl border border-line">
            {history.map((h, i) => (
              <div key={h.slug} className={"flex items-center justify-between gap-3 px-4 py-2.5 text-sm " + (i > 0 ? "border-t border-line" : "")}>
                <span className="min-w-0 flex-1 truncate text-ink">{h.name}</span>
                <span className="shrink-0 text-xs text-slate-400">{h.personas} personas</span>
                <span className={"w-12 shrink-0 text-right text-sm font-semibold tabular-nums " + (h.avg < 3 ? "text-clay" : h.avg < 4 ? "text-amber-600" : "text-sage")}>{h.avg.toFixed(1)}/5</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
