"use client";

type Score = { raw: number; stars: number };
type Scores = { commercial: Score; scientific: Score; social: Score };
type DefenseFirm = { name: string; matched: string; patents: number; latestYear?: number };
type Evidence = { available: boolean; citingPatentCount: number; defenseFirms: DefenseFirm[]; otherFirms?: { name: string; patents: number }[]; note?: string };
type Read = {
  headline?: string; scorePct?: number; stars?: number;
  confidence?: string; confidenceWhy?: string;
  domains?: { name: string; why: string }[];
  pathways?: string[]; dualUse?: string; whoCares?: string[]; verdict?: string;
};

function Stars({ n }: { n: number }) {
  const full = Math.max(0, Math.min(5, Math.round(n || 0)));
  return <span className="text-amber" aria-label={`${full} of 5`}>{"★".repeat(full)}<span className="text-slate-300">{"★".repeat(5 - full)}</span></span>;
}

function MiniScore({ label, s }: { label: string; s?: Score }) {
  const pct = Math.round((s?.raw ?? 0) * 100);
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1"><span className="text-lg font-bold text-ink">{pct}</span><span className="text-[11px] text-slate-400">/100</span></div>
    </div>
  );
}

export default function DefenseImpactReport({ read, scores, evidence, engine }: { read: Read; scores?: Scores; evidence?: Evidence; engine?: "scibert" | "estimate" }) {
  const r = read || {};
  const pct = Math.max(0, Math.min(100, Math.round(r.scorePct ?? 0)));
  const barColor = pct >= 66 ? "#3F7A52" : pct >= 33 ? "#CE8F2C" : "#7E8794";
  const conf = (r.confidence || "").toLowerCase();
  const confColor = conf.includes("high") ? "text-sage" : conf.includes("mod") ? "text-amber" : "text-slate-500";
  const hasEvidence = evidence?.available && (evidence.defenseFirms?.length || 0) > 0;

  return (
    <div className="space-y-5">
      {/* Headline + big score */}
      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-clay">Defense impact potential</div>
          {engine && (
            <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " + (engine === "scibert" ? "bg-sage-soft text-sage" : "bg-mist text-slate-500")}>
              {engine === "scibert" ? "SciBERT model" : "AI estimate"}
            </span>
          )}
        </div>
        {r.headline && <p className="mt-1 text-lg font-bold leading-snug text-ink">{r.headline}</p>}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-ink">{pct}</span>
          <span className="text-xs text-slate-400">/100</span>
          <span className="ml-2 text-sm"><Stars n={r.stars ?? Math.round(pct / 20)} /></span>
          {r.confidence && <span className={"ml-auto text-xs font-semibold uppercase tracking-wide " + confColor}>{r.confidence} confidence</span>}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} /></div>
        {r.confidenceWhy && <p className="mt-2 text-sm text-slate-600">{r.confidenceWhy}</p>}
      </div>

      {/* Hard evidence — real defense-linked patent citations */}
      {evidence?.available && (
        <div className={"rounded-2xl border p-5 " + (hasEvidence ? "border-clay/40 bg-clay-soft/30" : "border-line bg-white")}>
          <div className="text-xs font-semibold uppercase tracking-wide text-clay">Real-world signal</div>
          {hasEvidence ? (
            <>
              <p className="mt-1 text-sm text-slate-700">Cited by patents assigned to defense entities — observed translation, not speculation. Of {evidence.citingPatentCount} citing patent{evidence.citingPatentCount === 1 ? "" : "s"}:</p>
              <ul className="mt-2 space-y-1.5">
                {evidence.defenseFirms.slice(0, 8).map((f, i) => (
                  <li key={i} className="flex items-baseline gap-2 text-sm">
                    <span className="text-clay">◆</span>
                    <span className="font-medium text-ink">{f.matched}</span>
                    <span className="text-slate-400">· {f.patents} patent{f.patents === 1 ? "" : "s"}{f.latestYear ? `, to ${f.latestYear}` : ""}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-600">
              {evidence.citingPatentCount > 0
                ? `Cited by ${evidence.citingPatentCount} patent${evidence.citingPatentCount === 1 ? "" : "s"}, but none of the resolved assignees are defense entities — commercial translation without a visible defense pathway yet.`
                : "No patents cite this paper yet in the Reliance-on-Science data — the estimate is from the science itself."}
            </p>
          )}
        </div>
      )}
      {evidence && !evidence.available && evidence.note && (
        <p className="text-xs text-slate-400">{evidence.note}</p>
      )}

      {/* Domains */}
      {Array.isArray(r.domains) && r.domains.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Domains it touches</div>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {r.domains.map((d, i) => <li key={i} className="flex gap-2"><span className="text-clay">▸</span><span><span className="font-semibold text-ink">{d.name}.</span> {d.why}</span></li>)}
          </ul>
        </div>
      )}

      {/* Pathways */}
      {Array.isArray(r.pathways) && r.pathways.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Translation pathways</div>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {r.pathways.map((x, i) => <li key={i} className="flex gap-2"><span className="text-sage">▸</span><span>{x}</span></li>)}
          </ul>
        </div>
      )}

      {/* Who tracks it */}
      {Array.isArray(r.whoCares) && r.whoCares.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Who would track work like this</div>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            {r.whoCares.map((x, i) => <li key={i} className="flex gap-2"><span className="text-slate-300">•</span><span>{x}</span></li>)}
          </ul>
        </div>
      )}

      {/* Context: the three potential scores */}
      {scores && (
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">For context — Scientifiq potential</div>
          <div className="grid grid-cols-3 gap-2">
            <MiniScore label="Commercial" s={scores.commercial} />
            <MiniScore label="Scientific" s={scores.scientific} />
            <MiniScore label="Social" s={scores.social} />
          </div>
        </div>
      )}

      {/* Dual-use framing */}
      {r.dualUse && (
        <div className="rounded-2xl border border-sky/30 bg-sky-soft/20 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-sky">Dual-use note</div>
          <p className="mt-1 text-sm text-slate-700">{r.dualUse}</p>
        </div>
      )}

      {/* Verdict */}
      {r.verdict && (
        <div className="rounded-2xl border border-clay/30 bg-clay-soft/30 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-clay">Verdict</div>
          <p className="mt-1 text-sm font-medium text-ink">{r.verdict}</p>
        </div>
      )}

      <p className="text-xs text-slate-400">A research-<em>mapping</em> estimate — a lens on where science flows toward public and defense applications, built from public bibliometric signals (abstract + patent citations). It maps relevance, not intent, and is a forward-looking signal, not a guarantee.</p>
    </div>
  );
}
