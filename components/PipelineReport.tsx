import { pct, leverTable, feasibleByVolume, QUALITY, type PipelineInputs, type PipelineResult } from "@/lib/pipeline";

// The publication-pipeline report. The point is NOT "write more" — it's that you
// cannot out-write a 3–5% acceptance rate, so the only real lever is raising the
// probability each paper gets in (convincing reviewers). That pivots into the
// next module: what reviewers are looking for.
export default function PipelineReport({
  inputs,
  result,
  advice,
}: {
  inputs: PipelineInputs;
  result: PipelineResult;
  advice?: any;
}) {
  const lever = leverTable(inputs);
  const maxPapers = Math.max(...lever.map((l) => (Number.isFinite(l.papersToWrite) ? l.papersToWrite : 0)), 1);
  const canVolume = feasibleByVolume(inputs, result.papersToWrite);
  const curIdx = QUALITY.findIndex((q) => q.key === inputs.quality);
  const better = lever[Math.min(curIdx + 1, lever.length - 1)];
  const cur = lever[curIdx];
  const dropFactor = better && better.papersToWrite > 0 ? cur.papersToWrite / better.papersToWrite : 1;

  return (
    <div className="space-y-5">
      {/* The reality */}
      <div data-guide="reality" className="rounded-2xl border border-line bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The reality</div>
        <p className="mt-1 text-lg font-bold leading-snug text-ink">
          At your odds, banking {inputs.target} publications means writing about {result.papersToWrite} papers in {inputs.years} years.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Each paper is worth roughly <span className="font-semibold text-ink">{pct(result.everPublished)}</span> of a publication once it clears every
          filter. {canVolume
            ? `That's within reach of your pace, but it's a punishing amount of writing for a ${pct(result.everPublished)} hit rate.`
            : `That is more than you could write at your pace of ${inputs.pace}/year. You cannot out-write the odds.`}
        </p>
      </div>

      {/* Key numbers */}
      <div data-guide="odds" className="grid grid-cols-3 gap-3">
        <Tile value={pct(result.everPublished)} label="Odds one paper lands" note="after every filter" accent="#B07A1E" />
        <Tile value={`${result.papersToWrite}`} label="Papers to write" note={`to bank ${inputs.target}`} accent="#C0603A" />
        <Tile value={`${result.paceNeeded.toFixed(1)}/yr`} label="Pace that requires" note={`you write ${inputs.pace}/yr`} accent="#14283A" />
      </div>

      {/* The lever */}
      <div data-guide="lever" className="rounded-2xl border border-line bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-sage">The lever</div>
        <p className="mt-1 text-sm text-slate-600">
          Watch what actually moves the number of papers you'd have to write. It isn't your pace — it's how likely each paper is to convince
          reviewers.
        </p>
        <div className="mt-4 space-y-2.5">
          {lever.map((l) => {
            const w = Number.isFinite(l.papersToWrite) ? Math.max(4, (l.papersToWrite / maxPapers) * 100) : 100;
            const isCur = l.key === inputs.quality;
            return (
              <div key={l.key} className={"rounded-xl border p-2.5 " + (isCur ? "border-ink bg-mist/50" : "border-line")}>
                <div className="flex items-center justify-between text-sm">
                  <span className={isCur ? "font-semibold text-ink" : "text-slate-600"}>{l.label}{isCur && " · you"}</span>
                  <span className="font-semibold tabular-nums text-ink">{l.papersToWrite} papers</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-mist">
                  <div className="h-full rounded-full" style={{ width: `${w}%`, background: isCur ? "#C0603A" : "#3F7A52" }} />
                </div>
              </div>
            );
          })}
        </div>
        {better && better.key !== inputs.quality && dropFactor > 1.1 && (
          <p className="mt-3 text-sm text-slate-700">
            Moving one tier up — from a paper reviewers respect to one they <span className="font-semibold text-ink">argue to accept</span> — cuts
            the papers you'd need by roughly <span className="font-semibold text-ink">{dropFactor.toFixed(1)}×</span>. Writing faster does none of that.
          </p>
        )}
      </div>

      {/* The takeaway / pivot */}
      <div data-guide="pivot" className="rounded-2xl border p-5" style={{ borderColor: "#3F7A52", background: "#EAF2EC" }}>
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#3F7A52" }}>The takeaway</div>
        <p className="mt-1 text-base font-bold leading-snug text-ink">
          Writing more papers won't build a portfolio. Raising the probability each one gets in will — and that means convincing reviewers.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          So the real question isn't &ldquo;how many can I write?&rdquo; It's &ldquo;what makes a paper one reviewers champion?&rdquo; That's the next thing to learn.
        </p>
      </div>

      {advice && (
        <div data-guide="plan" className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">For your situation</div>
          {advice.reality && <p className="mt-1 text-sm leading-relaxed text-slate-600">{advice.reality}</p>}
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
          {advice.watchout && (
            <div className="mt-3 text-sm text-slate-600"><span className="font-semibold text-ink">Watch out: </span>{advice.watchout}</div>
          )}
        </div>
      )}
    </div>
  );
}

function Tile({ value, label, note, accent }: { value: string; label: string; note?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="text-xl font-bold tabular-nums sm:text-2xl" style={{ color: accent || "#14283A" }}>{value}</div>
      <div className="mt-0.5 text-xs font-semibold text-ink">{label}</div>
      {note && <div className="mt-0.5 text-[11px] text-slate-400">{note}</div>}
    </div>
  );
}
