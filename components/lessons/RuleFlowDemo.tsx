"use client";

import { useState } from "react";

// A tiny hand-coded "expert system" for approving a small loan. The learner walks
// the rules; then a case it was never given a rule for shows the brittleness —
// every path had to be written by a human, so anything unforeseen breaks it.
type Q = { q: string; yes: number | string; no: number | string };
const RULES: Q[] = [
  { q: "Credit score above 650?", yes: 1, no: "Deny — score too low" },
  { q: "Debt-to-income under 40%?", yes: 2, no: "Deny — too much debt" },
  { q: "Employed for over 2 years?", yes: "Approve", no: "Refer to a human" },
];

export default function RuleFlowDemo() {
  const [step, setStep] = useState<number | string>(0);
  const [path, setPath] = useState<string[]>([]);
  const [broke, setBroke] = useState(false);

  const isOutcome = typeof step === "string";
  const cur = !isOutcome ? RULES[step as number] : null;

  function answer(yes: boolean) {
    if (!cur) return;
    setPath((p) => [...p, `${cur.q} → ${yes ? "Yes" : "No"}`]);
    setStep(yes ? cur.yes : cur.no);
  }
  function reset() { setStep(0); setPath([]); setBroke(false); }

  return (
    <div className="my-6 rounded-2xl border border-line bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Try it — an expert system for a loan</div>

      {path.length > 0 && (
        <div className="mt-3 space-y-1">
          {path.map((p, i) => <div key={i} className="text-xs text-slate-400">{p}</div>)}
        </div>
      )}

      {!broke && !isOutcome && cur && (
        <div className="mt-3">
          <p className="font-semibold text-ink">{cur.q}</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => answer(true)} className="btn-primary text-sm">Yes</button>
            <button onClick={() => answer(false)} className="btn-ghost text-sm">No</button>
          </div>
        </div>
      )}

      {!broke && isOutcome && (
        <div className="mt-3">
          <div className={"inline-block rounded-xl px-3 py-1.5 text-sm font-semibold " + ((step as string).startsWith("Approve") ? "bg-sage-soft text-sage" : (step as string).startsWith("Deny") ? "bg-clay-soft text-clay" : "bg-mist text-slate-600")}>{step}</div>
          <p className="mt-2 text-xs text-slate-400">Every branch here was written by a person. That is an expert system.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={reset} className="btn-ghost text-sm">Start over</button>
            <button onClick={() => setBroke(true)} className="text-sm font-semibold text-clay hover:underline">Now try a case it wasn't built for →</button>
          </div>
        </div>
      )}

      {broke && (
        <div className="mt-3">
          <div className="rounded-xl border border-clay/30 bg-clay-soft p-3 text-sm text-ink">
            <span className="font-semibold">The applicant:</span> a self-employed founder with no credit score, huge but lumpy revenue, and eight months in business.
            <div className="mt-2 font-semibold text-clay">The system has no rule for this. It can't answer.</div>
          </div>
          <p className="mt-2 text-xs text-slate-400">This is the wall: a human has to foresee and encode every case. Real judgment is full of cases no one wrote a rule for.</p>
          <button onClick={reset} className="btn-ghost mt-3 text-sm">Start over</button>
        </div>
      )}
    </div>
  );
}
