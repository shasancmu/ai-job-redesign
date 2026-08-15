"use client";

// No-backend walkthrough of the Workflow exercise. Local state, seeded with an
// example. Mirrors the real shared-canvas room.

import { useState } from "react";
import Link from "next/link";
import { WORKFLOW_STEPS, STEP_ROLES } from "@/lib/workflow";
import Timer from "@/components/Timer";

export default function WorkflowDemo() {
  const [phase, setPhase] = useState(0);
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [doc, setDoc] = useState<any>({
    name: "Monthly board reporting",
    why: "It eats a week of senior time and the insights land too late to act on.",
    steps: [
      { id: "1", text: "Pull numbers from 6 systems", role: "ai" },
      { id: "2", text: "Reconcile and sanity-check", role: "human" },
      { id: "3", text: "Draft the narrative", role: "both" },
      { id: "4", text: "Exec review & sign-off", role: "human" },
    ],
    success: "The board sees what changed and why, in time to decide.",
    failure: "Slides look polished but nobody trusts the numbers.",
    more: "Auto-generate the whole deck every month.",
    better: "Human judgment on what the numbers mean and which risks to flag.",
    accuracy: "The reconciliation step — a small error compounds.",
    generality: "The boilerplate commentary can be roughly right.",
    chaos: "AI writes the whole deck; no one owns the story.",
    architect: "AI drafts, a named human owns the narrative and sign-off.",
    stop_start: "Stop hand-assembling slides; start owning the story and the risks.",
  });

  const step = WORKFLOW_STEPS[phase];
  const set = (patch: any) => setDoc((d: any) => ({ ...d, ...patch }));
  const steps: any[] = doc.steps;
  const setRole = (id: string, role: string) =>
    set({ steps: steps.map((s) => (s.id === id ? { ...s, role } : s)) });

  function go(next: number) {
    setPhase(Math.max(0, Math.min(WORKFLOW_STEPS.length - 1, next)));
    setStartedAt(new Date().toISOString());
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-4 rounded-xl bg-blue-50 px-4 py-2 text-sm text-blue-800">
        Preview — the Workflow exercise, shared canvas.{" "}
        <Link href="/demo" className="font-semibold underline">
          See the Job exercise
        </Link>{" "}
        ·{" "}
        <Link href="/" className="font-semibold underline">
          Home
        </Link>
      </div>

      <div className="mb-5 flex items-center justify-between">
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-sm font-semibold tracking-widest">
          DEMO2
        </span>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {WORKFLOW_STEPS.map((p) => (
          <button
            key={p.key}
            onClick={() => go(p.index)}
            className={
              "h-1.5 flex-1 rounded-full " +
              (p.index < phase ? "bg-ink" : p.index === phase ? "bg-ai" : "bg-slate-200")
            }
          />
        ))}
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Step {phase + 1} of {WORKFLOW_STEPS.length} · {step.minutes} min · shared canvas
        </div>
        <h1 className="mt-1 text-2xl font-bold">{step.title}</h1>
        <p className="mt-1 text-slate-500">{step.subtitle}</p>
      </div>

      <div className="space-y-4 pb-24">
        {step.key === "name" && (
          <>
            <Card label="In one line, what is the workflow?">
              <input className="field" value={doc.name} onChange={(e) => set({ name: e.target.value })} />
            </Card>
            <Card label="Why is it worth redesigning?">
              <textarea className="field" value={doc.why} onChange={(e) => set({ why: e.target.value })} />
            </Card>
          </>
        )}

        {(step.key === "map" || step.key === "assign") && (
          <Card label={step.key === "map" ? "The workflow today" : "Sort each step"}>
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5">
                  <span className="w-5 text-right text-sm font-semibold text-slate-400">{i + 1}</span>
                  <span className="flex-1 text-sm">{s.text}</span>
                  {step.key === "assign" &&
                    STEP_ROLES.filter((r) => r.key).map((r) => (
                      <button
                        key={r.key}
                        onClick={() => setRole(s.id, r.key)}
                        className={
                          "rounded-lg px-2.5 py-1 text-xs font-semibold " +
                          (s.role === r.key ? "text-white" : "text-slate-500 hover:bg-slate-100")
                        }
                        style={s.role === r.key ? { backgroundColor: r.color } : {}}
                      >
                        {r.label}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </Card>
        )}

        {step.key === "outcome" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card label="Success">
              <textarea className="field min-h-[140px]" value={doc.success} onChange={(e) => set({ success: e.target.value })} />
            </Card>
            <Card label="Failure no one notices for 6 months">
              <textarea className="field min-h-[140px]" value={doc.failure} onChange={(e) => set({ failure: e.target.value })} />
            </Card>
          </div>
        )}

        {step.key === "tradeoffs" && (
          <>
            {[
              ["More vs. Better", "more", "better"],
              ["Accuracy vs. Generality", "accuracy", "generality"],
              ["Chaos vs. Architect", "chaos", "architect"],
            ].map(([title, a, b]) => (
              <Card key={a} label={title}>
                <div className="grid gap-3 md:grid-cols-2">
                  <textarea className="field" value={doc[a]} onChange={(e) => set({ [a]: e.target.value })} />
                  <textarea className="field" value={doc[b]} onChange={(e) => set({ [b]: e.target.value })} />
                </div>
              </Card>
            ))}
          </>
        )}

        {step.key === "redesign" && (
          <>
            <Card label="If we redesigned this, we would stop ___ and start ___">
              <textarea className="field min-h-[100px]" value={doc.stop_start} onChange={(e) => set({ stop_start: e.target.value })} />
            </Card>
            <div className="card bg-slate-50 p-5">
              <div className="text-lg font-semibold">{doc.name}</div>
              <div className="mt-3 space-y-1">
                {steps.map((s, i) => {
                  const role = STEP_ROLES.find((r) => r.key === s.role);
                  return (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                      <span className="w-5 text-right text-slate-400">{i + 1}</span>
                      <span className="flex-1">{s.text}</span>
                      {role?.key && (
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: role.color }}>
                          {role.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">
            Back
          </button>
          {phase < WORKFLOW_STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} className="btn-primary">
              Next step →
            </button>
          ) : (
            <Link href="/" className="btn-primary">
              Finish
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Card({ label, children }: { label: string; children: any }) {
  return (
    <div className="card p-5">
      <label className="lbl">{label}</label>
      {children}
    </div>
  );
}
