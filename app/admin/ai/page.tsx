import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { eventCost } from "@/lib/costs";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

type Ev = {
  created_at: string;
  model: string | null;
  flow: string | null;
  ok: boolean;
  error: string | null;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  cache_write_tokens: number | null;
};

function pct(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
}

function usd(n: number): string {
  return n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`;
}

export default async function AdminAiPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  let events: Ev[] = [];
  let ready = false;
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const { data } = await admin
      .from("ai_events")
      .select("created_at, model, flow, ok, error, latency_ms, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50000);
    events = (data as Ev[]) || [];
    ready = true;
  } catch { /* service role not set */ }

  const now = Date.now();
  const windows = [
    { label: "Last 24h", ms: 864e5 },
    { label: "Last 7 days", ms: 7 * 864e5 },
    { label: "Last 30 days", ms: 30 * 864e5 },
  ].map((w) => {
    const rows = events.filter((e) => now - new Date(e.created_at).getTime() <= w.ms);
    const errors = rows.filter((e) => !e.ok).length;
    const cost = rows.reduce((s, e) => s + eventCost(e), 0);
    const lat = rows.filter((e) => e.latency_ms != null).map((e) => e.latency_ms as number);
    return { label: w.label, calls: rows.length, errors, cost, p95: pct(lat, 95) };
  });

  // Breakdown by model (30d)
  const byModel = new Map<string, { calls: number; cost: number; inTok: number; outTok: number }>();
  for (const e of events) {
    const k = e.model || "(unknown)";
    const m = byModel.get(k) || { calls: 0, cost: 0, inTok: 0, outTok: 0 };
    m.calls++; m.cost += eventCost(e); m.inTok += e.input_tokens || 0; m.outTok += e.output_tokens || 0;
    byModel.set(k, m);
  }
  const models = [...byModel.entries()].sort((a, b) => b[1].cost - a[1].cost);

  // Breakdown by module/flow (30d)
  const byFlow = new Map<string, { calls: number; errors: number; cost: number }>();
  for (const e of events) {
    const k = e.flow || "(unlabeled)";
    const m = byFlow.get(k) || { calls: 0, errors: 0, cost: 0 };
    m.calls++; if (!e.ok) m.errors++; m.cost += eventCost(e);
    byFlow.set(k, m);
  }
  const flows = [...byFlow.entries()].sort((a, b) => b[1].cost - a[1].cost);

  const recentErrors = events.filter((e) => !e.ok).slice(0, 25);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>

      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">AI health &amp; spend</h1>
        <Link href="/admin/costs" className="text-sm text-slate-400 hover:text-ink">Estimated per-module costs →</Link>
      </div>
      <p className="mt-1 text-sm text-slate-500">Real measured token usage, errors, and latency from live traffic. Only you can see this.</p>

      {!ready ? (
        <p className="mt-8 text-slate-400">Usage logging needs the service-role key. No data yet.</p>
      ) : events.length === 0 ? (
        <p className="mt-8 text-slate-500">No AI calls logged yet in the last 30 days. Run an exercise and refresh.</p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {windows.map((w) => (
              <div key={w.label} className="card p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{w.label}</div>
                <div className="mt-2 text-3xl font-bold text-ink">{usd(w.cost)}</div>
                <div className="mt-1 text-sm text-slate-500">{w.calls.toLocaleString()} calls</div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className={w.errors > 0 ? "font-medium text-red-600" : "text-slate-400"}>
                    {w.errors} error{w.errors === 1 ? "" : "s"}{w.calls ? ` (${((w.errors / w.calls) * 100).toFixed(1)}%)` : ""}
                  </span>
                  <span className="text-slate-400">p95 {(w.p95 / 1000).toFixed(1)}s</span>
                </div>
              </div>
            ))}
          </div>

          <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-slate-400">By model (30 days)</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-mist text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2">Model</th><th className="px-4 py-2">Calls</th><th className="px-4 py-2">In tok</th><th className="px-4 py-2">Out tok</th><th className="px-4 py-2">Cost</th><th className="px-4 py-2">$/call</th></tr>
              </thead>
              <tbody>
                {models.map(([name, m]) => (
                  <tr key={name} className="border-t border-line">
                    <td className="px-4 py-2 font-mono text-xs">{name}</td>
                    <td className="px-4 py-2">{m.calls.toLocaleString()}</td>
                    <td className="px-4 py-2">{m.inTok.toLocaleString()}</td>
                    <td className="px-4 py-2">{m.outTok.toLocaleString()}</td>
                    <td className="px-4 py-2 font-medium">{usd(m.cost)}</td>
                    <td className="px-4 py-2 text-slate-500">{usd(m.cost / Math.max(1, m.calls))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-slate-400">By module (30 days)</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-mist text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2">Module · step</th><th className="px-4 py-2">Calls</th><th className="px-4 py-2">Errors</th><th className="px-4 py-2">Cost</th><th className="px-4 py-2">$/call</th></tr>
              </thead>
              <tbody>
                {flows.map(([name, m]) => (
                  <tr key={name} className="border-t border-line">
                    <td className="px-4 py-2 font-mono text-xs">{name}</td>
                    <td className="px-4 py-2">{m.calls.toLocaleString()}</td>
                    <td className={"px-4 py-2 " + (m.errors > 0 ? "font-medium text-red-600" : "text-slate-400")}>{m.errors || "—"}</td>
                    <td className="px-4 py-2 font-medium">{usd(m.cost)}</td>
                    <td className="px-4 py-2 text-slate-500">{usd(m.cost / Math.max(1, m.calls))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {recentErrors.length > 0 && (
            <>
              <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-slate-400">Recent errors</h2>
              <div className="mt-3 space-y-2">
                {recentErrors.map((e, i) => (
                  <div key={i} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between text-xs text-red-500">
                      <span className="font-mono">{e.model || "?"}{e.flow ? ` · ${e.flow}` : ""}</span>
                      <span>{new Date(e.created_at).toLocaleString()}</span>
                    </div>
                    <div className="mt-0.5 text-red-800">{e.error || "(no message)"}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
