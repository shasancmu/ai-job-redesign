import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import { createClient } from "@/lib/supabase/server";
import { isSuperadmin } from "@/lib/orgs";
import { listLedger, type LedgerRow } from "@/lib/interventionLedger";
import { mediationFor, type MediationResult } from "@/lib/mediation";
import { conversationFacets } from "@/lib/conversations";
import MechanismCoder from "@/components/MechanismCoder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · interventions" };

export default async function InterventionsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isSuperadmin(user))) redirect("/dashboard");

  const flow = searchParams.flow || "";
  const [ledger, facets, mediation, mediationReal] = await Promise.all([
    listLedger(flow || undefined),
    conversationFacets(),
    flow ? mediationFor(flow, "outcome") : Promise.resolve(null),
    flow ? mediationFor(flow, "real_outcome") : Promise.resolve(null),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          <Link href="/admin/impact" className="text-sm text-slate2 hover:text-ink">← Impact</Link>
          <HeaderNav />
        </div>
      </header>

      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Platform · research</div>
      <h1 className="text-3xl text-ink">Which intervention, and why</h1>
      <p className="mb-5 mt-1 max-w-2xl text-sm text-slate2">
        The de-biased ledger of what worked, the mediation decomposition of how it worked, and a transcript-level read of the mechanism.
      </p>

      <form className="mb-6 flex flex-wrap items-end gap-2" method="get">
        <label className="text-xs text-slate-500">Module (for mediation &amp; mechanism)
          <select name="flow" defaultValue={flow} className="field mt-1 w-auto text-sm">
            <option value="">All modules (ledger only)</option>
            {facets.modules.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <button className="btn-primary text-sm" type="submit">Go</button>
        {flow && <Link href="/admin/interventions" className="btn-ghost text-sm">Clear</Link>}
      </form>

      {/* 1 — Ledger */}
      <h2 className="eyebrow mb-2">Which intervention worked</h2>
      <p className="mb-2 text-xs text-slate-400">
        Each tested nudge, with its lift, the FDR-adjusted q-value across the family of {ledger.family} tests, and the empirical-Bayes
        shrunk effect (corrects the winner&apos;s-curse bias in selected winners). Adopted = ratcheted into the baseline.
      </p>
      {ledger.rows.length === 0 ? (
        <div className="mb-8 rounded-xl border border-dashed border-line p-8 text-center text-sm text-slate-400">No experiments with data yet.</div>
      ) : (
        <div className="mb-8 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2.5 font-semibold">Intervention</th>
                <th className="px-3 py-2.5 font-semibold">Module</th>
                <th className="px-3 py-2.5 text-right font-semibold">Lift</th>
                <th className="px-3 py-2.5 text-right font-semibold">Shrunk</th>
                <th className="px-3 py-2.5 text-right font-semibold">p</th>
                <th className="px-3 py-2.5 text-right font-semibold">q (FDR)</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ledger.rows.map((r: LedgerRow) => (
                <tr key={r.id} className="align-top">
                  <td className="px-3 py-2.5 max-w-[260px]">
                    <div className="font-semibold text-ink">{r.name}</div>
                    {r.nudge && <div className="mt-0.5 text-xs text-slate-500 line-clamp-2">{r.nudge}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">{r.flowLabel}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{pct(r.lift)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-ink">{pct(r.shrunk)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{num(r.pValue)}</td>
                  <td className={"px-3 py-2.5 text-right tabular-nums " + (r.q != null && r.q < 0.1 ? "font-semibold text-sage" : "text-slate-500")}>{num(r.q)}</td>
                  <td className="px-3 py-2.5"><StatusChip status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2 — Mediation */}
      {flow && (
        <>
          <h2 className="eyebrow mb-2">How it worked · {flow}</h2>
          <p className="mb-3 text-xs text-slate-400">
            Effect of the policy (vs frozen holdout) on the outcome, split into what flows THROUGH conversation depth (indirect) and what does not (direct).
          </p>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <MediationCard m={mediation} />
            <MediationCard m={mediationReal} />
          </div>
          <p className="mb-8 text-[11px] text-slate-400">
            The treatment is randomized (holdout) but depth is not, so the mediated share assumes no unmeasured depth→outcome confounder.
            The clean confirmation is an experiment that targets depth directly — then this becomes causal, not just consistent.
          </p>

          {/* 3 — Mechanism coder */}
          <h2 className="eyebrow mb-2">Why — the mechanism</h2>
          <div className="mb-8"><MechanismCoder flow={flow} /></div>
        </>
      )}

      {!flow && <p className="text-sm text-slate-400">Pick a module above to see its mediation decomposition and the transcript-level mechanism.</p>}
    </main>
  );
}

function MediationCard({ m }: { m: MediationResult | null }) {
  if (!m) return null;
  if (m.n < 10 || m.total == null) {
    return <div className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-slate-400">{m.outcomeLabel}: not enough paired data yet (n={m.n}).</div>;
  }
  const sig = m.indirectLo != null && m.indirectHi != null && (m.indirectLo > 0 || m.indirectHi < 0);
  const row = (label: string, v: number | null, strong = false) => (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={"tabular-nums " + (strong ? "font-semibold text-ink" : "text-slate-600")}>{v == null ? "—" : (v > 0 ? "+" : "") + v}</span>
    </div>
  );
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-1 text-sm font-bold text-ink capitalize">{m.outcomeLabel}</div>
      <div className="text-[11px] text-slate-400 mb-2">n = {m.n} · mediator = depth</div>
      {row("Total effect (T→Y)", m.total, true)}
      {row("via depth (a: T→M)", m.aPath)}
      {row("depth→outcome (b)", m.bPath)}
      {row("Indirect (a·b)", m.indirect, true)}
      {row("Direct (c′)", m.direct)}
      <div className="mt-2 border-t border-line pt-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">% mediated by depth</span>
        <span className={"tabular-nums font-semibold " + (sig ? "text-sage" : "text-ink")}>{m.propMediated == null ? "—" : Math.round(m.propMediated * 100) + "%"}</span>
      </div>
      {m.indirectLo != null && <div className="mt-1 text-[11px] text-slate-400">indirect 95% CI [{m.indirectLo}, {m.indirectHi}]{sig ? " · excludes 0" : ""}</div>}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    adopted: "bg-sage-soft text-sage", running: "bg-amber-soft text-amber",
    rejected: "bg-clay-soft text-clay", concluded: "bg-slate-100 text-slate-500", proposed: "bg-slate-100 text-slate-500",
  };
  return <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + (map[status] || "bg-slate-100 text-slate-500")}>{status}</span>;
}

function pct(x: number | null): string { return x == null ? "—" : (x > 0 ? "+" : "") + (x * 100).toFixed(1) + "pts"; }
function num(x: number | null): string { return x == null ? "—" : String(x); }
