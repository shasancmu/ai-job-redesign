import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import HeaderNav from "@/components/HeaderNav";
import { facilitatorAccess } from "@/lib/orgs";
import { getSpec } from "@/lib/mechanics/store";
import { getInsights } from "@/lib/mechanics/insights";
import GenericRoleplayReport from "@/components/GenericRoleplayReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-cohort results for one role-play module: the aggregate the author sees in
// the editor, plus every participant's run, for a facilitator reviewing a class.
export default async function RoleplayResults({ searchParams }: { searchParams: { cohort?: string; slug?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const access = await facilitatorAccess(user);
  if (!access.ok) redirect("/dashboard");

  const cohort = (searchParams.cohort || "").trim();
  const slug = (searchParams.slug || "").trim();
  if (!cohort || !slug) redirect("/facilitator");

  const admin = createAdminClient();
  // Visibility: the facilitator must own or staff the class behind this cohort.
  const { data: klass } = await admin.from("classes").select("name, owner_id, org_id").eq("code", cohort).maybeSingle();
  const k = klass as any;
  const mayView = access.superadmin || (k && (k.owner_id === user.id || (k.org_id && (access.orgIds?.includes(k.org_id) || access.instructorOrgIds?.includes(k.org_id)))));
  if (!mayView) redirect("/facilitator");

  const [spec, insights, { data: rowsRaw }] = await Promise.all([
    getSpec(slug),
    getInsights(slug, cohort),
    admin.from("roleplay_results").select("user_id, scenario, score, verdict, report, created_at").eq("slug", slug).eq("cohort", cohort).order("created_at", { ascending: false }),
  ]);
  const rows = (rowsRaw as any[]) || [];
  const name = spec?.meta?.name || slug;
  const blocks = (spec?.report as any[]) || [];

  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  const profiles = ids.length ? (((await admin.from("profiles").select("id, display_name").in("id", ids)).data as any[]) || []) : [];
  const nameOf = (id?: string | null) => (id && profiles.find((p) => p.id === id)?.display_name) || "—";

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/facilitator?cohort=${encodeURIComponent(cohort)}`} className="text-sm text-slate-400 hover:text-slate-600">← Back to cohort</Link>
          <h1 className="mt-1 text-2xl font-bold text-ink">{spec?.meta?.emoji} {name}</h1>
          <p className="text-sm text-slate-500">{k?.name || cohort} · {rows.length} run{rows.length === 1 ? "" : "s"}</p>
        </div>
        <HeaderNav />
      </div>

      {/* Aggregate — the same signals the author sees, scoped to this class. */}
      {insights && insights.runs > 0 ? (
        <div className="mb-6 space-y-4 rounded-2xl border border-line bg-white p-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center"><div className="text-2xl font-bold text-ink">{insights.runs}</div><div className="text-[11px] text-slate-500">runs</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-ink">{insights.avgScore ?? "—"}</div><div className="text-[11px] text-slate-500">avg score</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-ink">{insights.correctPct != null ? `${insights.correctPct}%` : "—"}</div><div className="text-[11px] text-slate-500">right call</div></div>
          </div>
          {insights.weakest && insights.weakest.askRate < 50 && (
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              This class rarely probed <span className="font-semibold">“{insights.weakest.label}”</span> ({insights.weakest.askRate}%), a decisive cut. Worth a debrief.
            </div>
          )}
          {insights.funnel?.some((s) => s.count > 0) && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Where this class dropped off</div>
              <div className="mt-2 space-y-1.5">
                {insights.funnel.map((s, i) => {
                  const start = insights.funnel[0]?.count || 0;
                  const pct = start ? Math.round((s.count / start) * 100) : 0;
                  const drop = i > 0 ? insights.funnel[i - 1].count - s.count : 0;
                  return (
                    <div key={s.key} className="flex items-center gap-2">
                      <div className="w-28 shrink-0 truncate text-xs text-slate-600" title={s.label}>{s.label}</div>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full bg-ai" style={{ width: `${pct}%` }} /></div>
                      <div className="w-24 shrink-0 text-right text-xs tabular-nums text-slate-500">{s.count} · {pct}%{i > 0 && drop > 0 && <span className="text-clay"> (-{drop})</span>}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {insights.probes?.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Probe coverage</div>
              <div className="mt-2 space-y-1.5">
                {insights.probes.map((p) => (
                  <div key={p.key} className="flex items-center gap-2">
                    <div className="w-40 shrink-0 truncate text-xs text-slate-600" title={p.label}>{p.label}{p.highValue && <span className="ml-1 text-[10px] font-semibold text-clay">key</span>}</div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist"><div className={`h-full rounded-full ${p.highValue && p.askRate < 50 ? "bg-clay" : "bg-sage"}`} style={{ width: `${p.askRate}%` }} /></div>
                    <div className="w-9 shrink-0 text-right text-xs tabular-nums text-slate-500">{p.askRate}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-dashed border-line p-6 text-center text-sm text-slate-400">No runs in this cohort yet.</div>
      )}

      {/* Per-participant runs. Each expands to its full graded report. */}
      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <details key={i} className="rounded-xl border border-line bg-white">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="font-semibold text-ink">{nameOf(r.user_id)}</span>
                <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] text-slate-500">{r.scenario || "—"}</span>
                {typeof r.score === "number" && <span className="text-slate-600">score <b className="text-ink">{r.score}</b></span>}
                {r.report?.verdict_correct != null && <span className={r.report.verdict_correct ? "text-sage" : "text-clay"}>{r.report.verdict_correct ? "right call" : "wrong call"}</span>}
                {r.verdict?.confidence != null && <span className="text-xs text-slate-400">confidence {r.verdict.confidence}</span>}
                <span className="ml-auto text-xs text-slate-300">{new Date(r.created_at).toLocaleDateString()}</span>
              </summary>
              <div className="border-t border-line p-4">
                {r.report ? <GenericRoleplayReport report={r.report} blocks={blocks} /> : <p className="text-sm text-slate-400">No report saved.</p>}
              </div>
            </details>
          ))}
        </div>
      )}
    </main>
  );
}
