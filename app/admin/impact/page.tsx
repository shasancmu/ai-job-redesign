import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import { createClient } from "@/lib/supabase/server";
import { isSuperadmin } from "@/lib/orgs";
import { conversationFacets } from "@/lib/conversations";
import { computeImpact, type Series, type Point } from "@/lib/impact";
import { HOLDOUT_FRAC } from "@/lib/holdout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · impact" };

export default async function ImpactPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isSuperadmin(user))) redirect("/dashboard");

  const module = searchParams.module || "";
  const [facets, impact] = await Promise.all([conversationFacets(), computeImpact(module || undefined)]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          <Link href="/admin/conversations" className="text-sm text-slate2 hover:text-ink">← Conversations</Link>
          <Link href="/admin/interventions" className="text-sm text-slate2 hover:text-ink">Which &amp; why →</Link>
          <HeaderNav />
        </div>
      </header>

      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Platform · research</div>
      <h1 className="text-3xl text-ink">Impact vs counterfactual</h1>
      <p className="mb-5 mt-1 max-w-2xl text-sm text-slate2">
        Conversation quality under the adaptive policy minus the <b>frozen holdout</b> ({Math.round(HOLDOUT_FRAC * 100)}% of runs kept on
        the original prompt), by week. Because the holdout is randomized per run, this difference is an unbiased estimate of the loop&apos;s
        effect, robust to the adaptivity that would bias a plain time trend. Bands are 95% CIs.
      </p>

      <form className="mb-6 flex flex-wrap items-end gap-2" method="get">
        <label className="text-xs text-slate-500">Module
          <select name="module" defaultValue={module} className="field mt-1 w-auto text-sm">
            <option value="">All modules</option>
            {facets.modules.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <button className="btn-primary text-sm" type="submit">Filter</button>
        {module && <Link href="/admin/impact" className="btn-ghost text-sm">Clear</Link>}
      </form>

      {/* Readiness */}
      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        <Chip label="Completed conversations" value={impact.total} />
        <Chip label="With a known arm" value={impact.withHoldout} />
        <Chip label="Policy runs" value={impact.policyRuns} />
        <Chip label="Holdout runs" value={impact.holdoutRuns} />
      </div>

      {impact.withHoldout === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-slate-400">
          No holdout-labeled conversations yet. Once <span className="font-mono">sql/conversation_counterfactual.sql</span> is applied and
          runs accumulate, {Math.round(HOLDOUT_FRAC * 100)}% land in the frozen counterfactual and this fills in.
        </div>
      ) : (
        impact.series.map((s) => <SeriesBlock key={s.metric} s={s} />)
      )}

      <section className="mt-8 rounded-2xl border border-line bg-mist/40 p-4 text-sm text-slate-600">
        <h2 className="text-sm font-bold text-ink">The estimator</h2>
        <p className="mt-1">
          The curve is the per-week difference in means, <span className="font-mono">δ_t = mean(policy) − mean(holdout)</span>, with Welch
          standard errors. The equivalent regression is an event study:
        </p>
        <p className="mt-2 rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-700">
          Q₍i,m,t₎ = α_m + f(t) + Σₜ δₜ·(adaptive₍i₎ × 1[period=t]) + u_i + ε
        </p>
        <p className="mt-2">
          α_m module fixed effects, f(t) time fixed effects, u_i a person effect (cluster SEs by person). The single-coefficient form
          <span className="font-mono"> Q = β₀ + β₁·adaptive + module FE + time FE + ε</span> gives the pooled effect (the headline δ above);
          the δₜ series is that β₁ interacted with time (the graph). Replace <span className="font-mono">adaptive</span> with
          <span className="font-mono"> baseline_version</span> for a dose-response over the ratchet steps. Because assignment propensities are
          known, adaptively-weighted AIPW gives valid inference on the policy arm without the holdout; the holdout makes it design-based.
        </p>
      </section>
    </main>
  );
}

function SeriesBlock({ s }: { s: Series }) {
  const p = s.pooled;
  const sig = p.delta != null && p.lo != null && p.hi != null && (p.lo > 0 || p.hi < 0);
  return (
    <div className="mb-6 rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-ink">{s.label}</h2>
        <div className="text-sm">
          {p.delta == null ? (
            <span className="text-slate-400">not enough data</span>
          ) : (
            <span className={sig ? "font-semibold text-sage" : "text-slate-600"}>
              pooled δ = {p.delta > 0 ? "+" : ""}{p.delta}
              {p.lo != null && p.hi != null && <span className="text-slate-400"> [{p.lo}, {p.hi}]</span>}
              <span className="text-slate-400"> · n={p.n}</span>
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <DeltaChart points={s.points} />
      </div>
    </div>
  );
}

// Server-rendered SVG: zero line, 95% CI band, delta line + points. No deps.
function DeltaChart({ points }: { points: Point[] }) {
  const usable = points.filter((p) => p.delta != null);
  if (usable.length === 0) return <div className="py-6 text-center text-xs text-slate-400">No periods with both arms populated yet.</div>;

  const W = 640, H = 220, padL = 44, padR = 12, padT = 16, padB = 40;
  const xs = points.map((p) => p.period);
  const los = usable.map((p) => p.lo!).concat(usable.map((p) => p.delta!));
  const his = usable.map((p) => p.hi!).concat(usable.map((p) => p.delta!));
  let yMin = Math.min(0, ...los), yMax = Math.max(0, ...his);
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const pad = (yMax - yMin) * 0.1 || 1;
  yMin -= pad; yMax += pad;

  const n = xs.length;
  const xAt = (i: number) => padL + (n === 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1));
  const yAt = (v: number) => padT + ((yMax - v) / (yMax - yMin)) * (H - padT - padB);

  const idxOf = new Map(points.map((p, i) => [p, i] as const));
  const line = usable.map((p) => `${xAt(idxOf.get(p)!)},${yAt(p.delta!)}`).join(" ");
  const bandTop = usable.map((p) => `${xAt(idxOf.get(p)!)},${yAt(p.hi!)}`);
  const bandBot = usable.map((p) => `${xAt(idxOf.get(p)!)},${yAt(p.lo!)}`).reverse();
  const band = [...bandTop, ...bandBot].join(" ");

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => yMin + (i * (yMax - yMin)) / ticks);
  const labelEvery = Math.ceil(n / 8);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 640 }} role="img" aria-label="Policy minus holdout by week, with 95% confidence band">
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={yAt(v)} x2={W - padR} y2={yAt(v)} stroke="var(--line, #e5e5e5)" strokeWidth={0.5} />
          <text x={padL - 6} y={yAt(v) + 3} textAnchor="end" fontSize={10} fill="#94a3b8">{Math.round(v * 10) / 10}</text>
        </g>
      ))}
      <line x1={padL} y1={yAt(0)} x2={W - padR} y2={yAt(0)} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
      <polygon points={band} fill="rgba(99,152,138,0.15)" stroke="none" />
      {usable.length > 1 && <polyline points={line} fill="none" stroke="var(--ink, #1f2937)" strokeWidth={1.5} />}
      {usable.map((p) => (
        <circle key={p.period} cx={xAt(idxOf.get(p)!)} cy={yAt(p.delta!)} r={3} fill="var(--ink, #1f2937)" />
      ))}
      {xs.map((wk, i) => (i % labelEvery === 0 ? (
        <text key={wk} x={xAt(i)} y={H - padB + 16} textAnchor="middle" fontSize={10} fill="#94a3b8">{wk.slice(5)}</text>
      ) : null))}
      <text x={padL} y={H - 6} fontSize={10} fill="#94a3b8">week →</text>
    </svg>
  );
}

function Chip({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-line bg-white px-3 py-1 text-slate-600">
      <span className="font-semibold text-ink tabular-nums">{value.toLocaleString()}</span> {label}
    </span>
  );
}
