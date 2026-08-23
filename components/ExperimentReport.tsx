import ExperimentPlot from "@/components/ExperimentPlot";
import { CANVAS_PARTS, fmt, pStars, type ExperimentCanvas, type DGP, type SimResult } from "@/lib/experiment";

// The finished in-silico experiment: the model, a summary graph, an honest
// regression table (numbers from a real simulation), power, secondary and
// long-term outcomes, the intervention pattern, an Important/Interesting/
// Ambitious/Craft read, and design warnings.
export default function ExperimentReport({ canvas, design, dgp, result }: { canvas: ExperimentCanvas; design: any; dgp: DGP; result: SimResult }) {
  const b1 = result.coefs[1], b3 = result.coefs[3];
  const sig = b1.p < 0.05;
  const powered = result.power >= 0.8;
  const iia = design?.iia || {};

  return (
    <div className="space-y-5">
      {/* Headline verdict */}
      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-sage">In-silico result</div>
        <p className="mt-1 text-lg font-bold leading-snug text-ink">
          Treatment effect of {fmt(b1.est)} {dgp.outcomeUnit} ({b1.p < 0.001 ? "p < 0.001" : `p = ${fmt(b1.p, 3)}`}),{" "}
          {sig ? "distinguishable from zero" : "not distinguishable from zero"} at this sample.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <Stat label="Effect (b1)" value={`${b1.est >= 0 ? "+" : ""}${fmt(b1.est)}`} sub={dgp.outcomeUnit} />
          <Stat label="Analyzed n" value={`${result.n}`} sub={`${Math.round(dgp.attrition * 100)}% attrition`} />
          <Stat label="Power" value={`${Math.round(result.power * 100)}%`} sub={powered ? "well-powered" : "under-powered"} tone={powered ? "good" : "warn"} />
        </div>
      </div>

      {/* The model */}
      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The model</div>
        <div className="mt-2 overflow-x-auto">
          <div className="whitespace-nowrap font-mono text-sm text-ink">
            Y = β0 + <span className="font-bold" style={{ color: "#3F7A52" }}>β1·Treatment</span> + <span style={{ color: "#93A2B0" }}>β2·X</span> + <span className="font-bold" style={{ color: "#C98A2B" }}>β3·(Treatment×X)</span>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-600">β1 is the average treatment effect; β3 is the heterogeneous effect, how much more (or less) it works for the high-{design?.dgp?.moderatorName || dgp.moderatorName} group.</p>
      </div>

      {/* Summary graph */}
      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Summary graph</div>
        <div className="mt-2"><ExperimentPlot result={result} outcome={`${dgp.outcomeName} (${dgp.outcomeUnit})`} moderator={dgp.moderatorName} /></div>
        <p className="mt-1 text-xs text-slate-400">The gap between the two Treatment bars is the heterogeneous effect (β3 = {b3.est >= 0 ? "+" : ""}{fmt(b3.est)}{pStars(b3.p)}).</p>
      </div>

      {/* Regression table */}
      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Regression table</div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-1.5 pr-3 font-semibold">Term</th>
                <th className="py-1.5 pr-3 text-right font-semibold">Estimate</th>
                <th className="py-1.5 pr-3 text-right font-semibold">Std. error</th>
                <th className="py-1.5 text-right font-semibold">t</th>
              </tr>
            </thead>
            <tbody>
              {result.coefs.map((c) => (
                <tr key={c.name} className="border-b border-line/60">
                  <td className="py-1.5 pr-3 text-slate-600">{c.name}</td>
                  <td className="py-1.5 pr-3 text-right font-semibold text-ink">{fmt(c.est, 2)}<span className="text-clay">{pStars(c.p)}</span></td>
                  <td className="py-1.5 pr-3 text-right text-slate-500">{fmt(c.se, 2)}</td>
                  <td className="py-1.5 text-right text-slate-500">{fmt(c.t, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">n = {result.n} · R² = {fmt(result.r2, 2)} · *** p&lt;.01, ** p&lt;.05, * p&lt;.10. Numbers are from a real simulated draw, so they carry sampling noise.</p>
      </div>

      {/* Secondary + long-term outcomes */}
      {(result.secondary || result.longTerm) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {result.secondary && <OutcomeCard label="Mechanism outcome" o={result.secondary} />}
          {result.longTerm && <OutcomeCard label="Long-term outcome" o={result.longTerm} />}
        </div>
      )}

      {/* Intervention pattern + idea quality */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Intervention pattern</div>
          <div className="mt-2 inline-block rounded-full bg-sage-soft px-3 py-1 text-sm font-semibold text-sage">{design?.pattern || "—"}</div>
          {design?.patternWhy && <p className="mt-2 text-sm text-slate-600">{design.patternWhy}</p>}
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Is it a good idea?</div>
          <div className="mt-2 space-y-1.5">
            {(["important", "interesting", "ambitious", "craft"] as const).map((k) => (
              <Score key={k} label={k[0].toUpperCase() + k.slice(1)} n={Number(iia[k]) || 0} />
            ))}
          </div>
          {iia.note && <p className="mt-2 text-sm text-slate-600">{iia.note}</p>}
        </div>
      </div>

      {/* Design warnings */}
      {Array.isArray(design?.warnings) && design.warnings.length > 0 && (
        <div className="rounded-2xl border border-clay/30 bg-clay-soft/40 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-clay">Design warnings</div>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            {design.warnings.map((w: string, i: number) => <li key={i} className="flex gap-2"><span className="text-clay">▸</span><span>{w}</span></li>)}
          </ul>
        </div>
      )}

      {/* The canvas */}
      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your strategy experiment canvas</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {CANVAS_PARTS.map((p) => (
            <div key={p.key} className="rounded-xl border border-line bg-mist/30 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{p.label}</div>
              <p className="mt-0.5 text-sm text-slate-700">{canvas[p.key] || <span className="text-slate-300">—</span>}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "warn" }) {
  const color = tone === "good" ? "text-sage" : tone === "warn" ? "text-clay" : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-mist/30 p-3">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

function OutcomeCard({ label, o }: { label: string; o: { name: string; est: number; se: number; p: number; unit: string } }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{o.name}</div>
      <div className="mt-1 text-sm text-slate-600">Effect {o.est >= 0 ? "+" : ""}{fmt(o.est, 2)} {o.unit}<span className="text-clay">{pStars(o.p)}</span> ({o.p < 0.001 ? "p < 0.001" : `p = ${fmt(o.p, 3)}`})</div>
    </div>
  );
}

function Score({ label, n }: { label: string; n: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 text-xs font-medium text-slate-500">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => <span key={i} className={"h-2 w-4 rounded-sm " + (i <= n ? "bg-sage" : "bg-slate-200")} />)}
      </div>
    </div>
  );
}
