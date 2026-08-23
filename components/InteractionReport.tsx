import InteractionPlot from "@/components/InteractionPlot";
import { ideaSentence, type IdeaInputs } from "@/lib/interaction";

// The finished idea: the sentence, the regression it becomes, its shape (the
// plot), the mechanism, and the discriminating test (which other outcomes move
// if the mechanism is true vs. a rival). Plain component.
export default function InteractionReport({ inputs, idea }: { inputs: IdeaInputs; idea: any }) {
  const short = (s: string, n = 16) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");
  const X = short(inputs.x, 18) || "X";
  const Y = short(inputs.y, 18) || "Y";
  const Z = short(inputs.z, 18) || "Z";
  const word = inputs.direction === "especially" ? "especially" : "except";

  return (
    <div className="space-y-5">
      {/* The idea */}
      <div data-guide="idea" className="rounded-2xl border border-line bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-sage">Your idea</div>
        <p className="mt-1 text-lg font-bold leading-snug text-ink">{idea?.sentence || ideaSentence(inputs)}</p>
        {idea?.sharper && idea.sharper !== idea.sentence && (
          <p className="mt-2 text-sm text-slate-600"><span className="font-semibold text-ink">Sharper: </span>{idea.sharper}</p>
        )}
      </div>

      {/* The regression */}
      <div data-guide="regression" className="rounded-2xl border border-line bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The same idea, as a regression</div>
        <div className="mt-2 overflow-x-auto">
          <div className="whitespace-nowrap font-mono text-sm text-ink">
            {Y} = β0 + <span style={{ color: "#93A2B0" }}>β1·{X}</span> + <span style={{ color: "#93A2B0" }}>β2·{Z}</span> +{" "}
            <span className="font-bold" style={{ color: "#3F7A52" }}>β3·({X}×{Z})</span>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
          <li><span className="font-mono text-slate-400">β1</span> — the main effect of {X} on {Y} (often already known)</li>
          <li>
            <span className="font-mono font-semibold" style={{ color: "#3F7A52" }}>β3</span> — the interaction: {Y}&apos;s response to {X} is{" "}
            <span className="font-semibold text-ink">{word === "especially" ? "stronger" : "weaker"}</span> when {Z}. <span className="font-medium text-ink">This is your contribution.</span>
          </li>
        </ul>
      </div>

      {/* The shape */}
      <div data-guide="plot" className="rounded-2xl border border-line bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The shape of the idea</div>
        <InteractionPlot xLabel={inputs.x || "X"} yLabel={inputs.y || "Y"} zLabel={inputs.z || "Z"} direction={inputs.direction} />
        <p className="mt-1 text-sm text-slate-500">
          Two slopes: the effect of {X} on {Y} when {Z} is low vs. high. The gap between them is β3 — {word === "especially" ? "the effect amplifies" : "the effect fades"} when {Z} is present.
        </p>
      </div>

      {/* The mechanism */}
      {(idea?.mechanismRead || idea?.rivalMechanism) && (
        <div data-guide="mechanism" className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#B07A1E" }}>The mechanism (the BECAUSE)</div>
          {idea.mechanismRead && <p className="mt-1 text-sm text-slate-700">{idea.mechanismRead}</p>}
          {idea.scopeCheck && <p className="mt-2 text-sm text-slate-600"><span className="font-semibold text-ink">Scope check: </span>{idea.scopeCheck}</p>}
          {idea.rivalMechanism && (
            <div className="mt-3 rounded-xl bg-mist p-3 text-sm text-slate-700">
              <span className="font-semibold text-ink">A rival explanation: </span>{idea.rivalMechanism}
            </div>
          )}
        </div>
      )}

      {/* The discriminating test */}
      {Array.isArray(idea?.additionalOutcomes) && idea.additionalOutcomes.length > 0 && (
        <div data-guide="test" className="rounded-2xl border border-line bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">The test: what else should move?</div>
          <p className="mt-1 text-sm text-slate-500">
            A real mechanism predicts other outcomes. These separate your explanation from the rival — measure them and you can tell which is true.
          </p>
          <div className="mt-3 space-y-3">
            {idea.additionalOutcomes.map((o: any, i: number) => (
              <div key={i} className="rounded-xl border border-line p-3">
                <div className="text-sm font-semibold text-ink">{o.outcome}</div>
                <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                  <div className="rounded-lg bg-sage-soft p-2 text-xs text-slate-700"><span className="font-semibold" style={{ color: "#3F7A52" }}>If your mechanism: </span>{o.ifYours}</div>
                  <div className="rounded-lg bg-mist p-2 text-xs text-slate-600"><span className="font-semibold text-slate-500">If the rival: </span>{o.ifRival}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
