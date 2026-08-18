"use client";

// Renders the "how do you actually get there" plan for the three OCC trade-offs:
// better outcomes, accuracy where it counts, and structure that frees autonomy.
type Aim = { aim: string; why: string; moves: string[]; check: string };

const CARDS: { key: string; label: string; color: string }[] = [
  { key: "outcomes", label: "Outcomes → Better", color: "#3F7A52" },
  { key: "capabilities", label: "Capabilities → Accuracy", color: "#CE8F2C" },
  { key: "control", label: "Control → Structure", color: "#7C5CBF" },
];

export default function TradeoffPlan({ plan }: { plan?: Record<string, Aim> | null }) {
  if (!plan) return null;
  const any = CARDS.some((c) => plan[c.key]?.aim || plan[c.key]?.moves?.length);
  if (!any) return null;

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Your plan: how to actually get there
      </div>
      {CARDS.map((c) => {
        const p = plan[c.key];
        if (!p || (!p.aim && !p.moves?.length)) return null;
        return (
          <div key={c.key} className="card overflow-hidden p-0">
            <div className="h-1.5" style={{ background: c.color }} />
            <div className="p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: c.color }}>
                {c.label}
              </div>
              {p.aim && <div className="mt-0.5 text-base font-bold text-ink">{p.aim}</div>}
              {p.why && <p className="mt-1 text-sm text-slate-600">{p.why}</p>}
              {p.moves?.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {p.moves.map((m, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span style={{ color: c.color }}>→</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              )}
              {p.check && (
                <div className="mt-3 rounded-lg bg-mist p-3 text-sm">
                  <span className="font-semibold text-ink">Guardrail:</span>{" "}
                  <span className="text-slate-600">{p.check}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
