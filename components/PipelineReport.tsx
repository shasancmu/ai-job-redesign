import { pct, curve, type PipelineInputs, type PipelineResult } from "@/lib/pipeline";

// The publication-pipeline report: the simulated odds, a papers→publications
// curve, and (when present) the AI's candid strategy. Plain component so it
// renders in the room and on the shared report page alike.
export default function PipelineReport({
  inputs,
  result,
  advice,
}: {
  inputs: PipelineInputs;
  result: PipelineResult;
  advice?: any;
}) {
  const tiles: { label: string; value: string; note?: string; accent?: string }[] = [
    { label: "Acceptance at one journal", value: pct(result.singleJournal), note: `${inputs.reviewers} reviewers, editor variance`, accent: "#B07A1E" },
    { label: "Odds a paper ever lands", value: pct(result.everPublished), note: `trying up to ${inputs.maxJournals} journals`, accent: "#3F7A52" },
    { label: "Papers to write", value: `${result.papersToWrite}`, note: `to bank ${inputs.target} publications`, accent: "#14283A" },
    { label: "Submissions per paper", value: result.avgSubmissions.toFixed(1), note: "until it lands or you kill it" },
    { label: "Months in review", value: `${Math.round(result.monthsPerPaper)}`, note: "per paper's journey" },
    { label: "Keep in flight", value: `${result.inFlight}`, note: "papers moving at once" },
  ];

  return (
    <div className="space-y-5">
      {advice?.headline && (
        <div data-guide="headline" className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The reality</div>
          <p className="mt-1 text-lg font-bold leading-snug text-ink">{advice.headline}</p>
          {advice.reality && <p className="mt-2 text-sm leading-relaxed text-slate-600">{advice.reality}</p>}
        </div>
      )}

      <div data-guide="odds" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-line bg-white p-4">
            <div className="text-2xl font-bold tabular-nums" style={{ color: t.accent || "#14283A" }}>{t.value}</div>
            <div className="mt-0.5 text-xs font-semibold text-ink">{t.label}</div>
            {t.note && <div className="mt-0.5 text-[11px] text-slate-400">{t.note}</div>}
          </div>
        ))}
      </div>

      <div data-guide="curve" className="rounded-2xl border border-line bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Papers written &rarr; publications</div>
        <PapersCurve everPublished={result.everPublished} target={inputs.target} />
        <p className="mt-2 text-xs text-slate-500">
          At your odds, each paper you write is worth about <span className="font-semibold text-ink">{pct(result.everPublished)}</span> of a
          publication. That is why productivity is a pipeline, not a single bet.
        </p>
      </div>

      <div className={"grid gap-3 " + (result.onTrack ? "" : "sm:grid-cols-1")}>
        <div className={"rounded-2xl border p-4 " + (result.onTrack ? "border-sage/30 bg-sage-soft" : "border-amber-300 bg-amber-50")}>
          <div className="text-sm font-semibold text-ink">
            {result.onTrack ? "You're on pace." : "You're behind the pace you'd need."}
          </div>
          <div className="mt-0.5 text-sm text-slate-600">
            Hitting {inputs.target} in {inputs.years} years needs about{" "}
            <span className="font-semibold tabular-nums">{result.paceNeeded.toFixed(1)}</span> new papers/year. You start about{" "}
            <span className="font-semibold tabular-nums">{inputs.pace}</span>.
          </div>
        </div>
      </div>

      {advice && (
        <div data-guide="plan" className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">Your pipeline strategy</div>
          {Array.isArray(advice.moves) && (
            <ul className="mt-2 space-y-2">
              {advice.moves.map((m: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full" style={{ background: "#3F7A52" }} />
                  {m}
                </li>
              ))}
            </ul>
          )}
          {advice.killRule && (
            <div className="mt-4 rounded-xl bg-mist p-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">When to kill a paper</span>
              <p className="mt-1 text-sm text-slate-700">{advice.killRule}</p>
            </div>
          )}
          {advice.watchout && (
            <div className="mt-3 text-sm text-slate-600">
              <span className="font-semibold text-ink">Watch out: </span>
              {advice.watchout}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PapersCurve({ everPublished, target }: { everPublished: number; target: number }) {
  const W = 520, H = 180, pad = 30;
  const maxPapers = 15;
  const maxPubs = Math.max(target + 1, Math.ceil(maxPapers * everPublished) + 1);
  const pts = curve(everPublished, maxPapers);
  const x = (n: number) => pad + (n / maxPapers) * (W - pad * 2);
  const y = (v: number) => H - pad - (v / maxPubs) * (H - pad * 2);
  const line = pts.map((p) => `${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
  const targetPapers = everPublished > 0 ? target / everPublished : maxPapers;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Publications expected as you write more papers">
      {/* target line */}
      <line x1={pad} y1={y(target)} x2={W - pad} y2={y(target)} stroke="#E3E7DF" strokeWidth="1" strokeDasharray="4 4" />
      <text x={W - pad} y={y(target) - 5} textAnchor="end" fontSize="11" fill="#93A2B0">{target} target</text>
      {/* axes */}
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#D2D8CD" strokeWidth="1" />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#D2D8CD" strokeWidth="1" />
      {/* curve */}
      <polyline points={line} fill="none" stroke="#3F7A52" strokeWidth="2.5" strokeLinecap="round" />
      {/* marker where target is reached */}
      {targetPapers <= maxPapers && (
        <>
          <circle cx={x(targetPapers)} cy={y(target)} r="4" fill="#CE8F2C" />
          <text x={x(targetPapers)} y={H - pad + 14} textAnchor="middle" fontSize="11" fill="#B07A1E">
            ~{Math.ceil(targetPapers)} papers
          </text>
        </>
      )}
      <text x={W - pad} y={H - pad + 14} textAnchor="end" fontSize="10" fill="#93A2B0">papers written &rarr;</text>
    </svg>
  );
}
