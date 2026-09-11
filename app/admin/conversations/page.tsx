import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import { createClient } from "@/lib/supabase/server";
import { isSuperadmin } from "@/lib/orgs";
import { listConversations, conversationFacets, interventionRollup, personHandle } from "@/lib/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · conversations" };

export default async function ConversationsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isSuperadmin(user))) redirect("/dashboard");

  const module = searchParams.module || "";
  const cohort = searchParams.cohort || "";
  const intervention = searchParams.intervention || "";

  const [facets, rows, rollup] = await Promise.all([
    conversationFacets(),
    listConversations({ module, cohort, intervention, limit: 200 }),
    interventionRollup(module || undefined),
  ]);

  const fmt = (x: number | null | undefined) => (x == null ? "—" : String(x));
  const when = (s: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-sm text-slate2 hover:text-ink">← Admin</Link>
          <HeaderNav />
        </div>
      </header>

      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Platform · research</div>
      <h1 className="text-3xl text-ink">Conversations</h1>
      <p className="mb-6 mt-1 max-w-2xl text-sm text-slate2">
        Every conversation across every engine: both sides, turn by turn, text and voice-as-transcript. This is the platform&apos;s
        data spine: {facets.total.toLocaleString()} recorded. Consent is granted at signup; this superadmin view is your lab.
      </p>

      {facets.total === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-slate-400">
          No conversations recorded yet. They appear as learners run modules (needs the sql/conversations.sql migration applied).
        </div>
      ) : (
        <>
          {/* Filters */}
          <form className="mb-6 flex flex-wrap items-end gap-2" method="get">
            <Select name="module" label="Module" value={module} options={facets.modules} />
            <Select name="cohort" label="Cohort" value={cohort} options={facets.cohorts} />
            <Select name="intervention" label="Intervention" value={intervention} options={facets.interventions} />
            <button className="btn-primary text-sm" type="submit">Filter</button>
            {(module || cohort || intervention) && <Link href="/admin/conversations" className="btn-ghost text-sm">Clear</Link>}
          </form>

          {/* Intervention rollup — the leading signal by arm */}
          <h2 className="eyebrow mb-2">By intervention{module ? ` · ${module}` : ""}</h2>
          <p className="mb-2 text-xs text-slate-400">Is the conversation moving forward (depth, movement) and ending in value (outcome)? Averaged per A/B arm, the leading indicator the autopilot reads.</p>
          <div className="mb-8 overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2.5 font-semibold">Intervention</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Convos</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Finished</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Avg depth</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Avg movement</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Avg outcome</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Avg real</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rollup.map((r) => (
                  <tr key={r.intervention}>
                    <td className="px-4 py-2.5"><span className="font-mono text-xs text-ink">{r.intervention}</span></td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.n}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.finished}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-ink">{fmt(r.avgDepth)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.avgMovement == null ? "—" : (r.avgMovement > 0 ? "+" : "") + r.avgMovement}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{fmt(r.avgOutcome)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{fmt(r.avgReal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent conversations */}
          <h2 className="eyebrow mb-2">Recent conversations {rows.length >= 200 && <span className="text-slate-400">(latest 200)</span>}</h2>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2.5 font-semibold">Person</th>
                  <th className="px-3 py-2.5 font-semibold">Module</th>
                  <th className="px-3 py-2.5 font-semibold">Cohort</th>
                  <th className="px-3 py-2.5 font-semibold">Intervention</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Turns</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Depth</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Outcome</th>
                  <th className="px-4 py-2.5 text-right font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.conversation_id} className="hover:bg-mist/40">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/conversations/${encodeURIComponent(r.conversation_id)}`} className="font-mono text-xs text-ai hover:underline">{personHandle(r.person_id)}</Link>
                      {r.dynamics?.voice && <span className="ml-1.5 rounded-full bg-mist px-1.5 py-0.5 text-[10px] text-slate-500">voice</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{r.module || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-500">{r.cohort || "—"}</td>
                    <td className="px-3 py-2.5"><span className="font-mono text-[11px] text-slate-500">{r.intervention || "—"}</span></td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.dynamics?.turns ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.dynamics?.depth ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.outcome ?? "—"}{r.ended_at ? "" : " ·"}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-slate-400">{when(r.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">A trailing &ldquo;·&rdquo; on outcome means the conversation is still open (no terminal yet). Depth is the composite 0-100 leading signal.</p>
        </>
      )}
    </main>
  );
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: string[] }) {
  return (
    <label className="text-xs text-slate-500">{label}
      <select name={name} defaultValue={value} className="field mt-1 w-auto text-sm">
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
