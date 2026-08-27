"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RedesignEditor from "@/components/RedesignEditor";

const EXAMPLES = [
  { label: "Reimagine your job", text: "Partners interview each other about their jobs, then redesign each other's role: what to delegate to AI (search, structure, draft, translate) vs. what to lean into as a human (lead, own, judge, integrate)." },
  { label: "Redesign a workflow", text: "Partners map each other's core workflow, then redesign it: which steps AI should handle vs. which need human judgment." },
  { label: "Rework a research plan", text: "Partners interview each other about a research project, then redesign the plan around what AI can accelerate vs. what only the researcher can do." },
];
const LOADING = ["Setting the interview…", "Building the instrument…", "Writing the buckets…"];

export default function RedesignIntentStart({ me }: { me: string }) {
  const [phase, setPhase] = useState<"intent" | "editor">("intent");
  const [spec, setSpec] = useState<any>(null);
  const [intent, setIntent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [step, setStep] = useState(0);
  useEffect(() => { if (!busy) return; const t = setInterval(() => setStep((s) => (s + 1) % LOADING.length), 1600); return () => clearInterval(t); }, [busy]);

  async function build() {
    if (!intent.trim()) return;
    setBusy(true); setErr(""); setStep(0);
    try {
      const res = await fetch("/api/mechanics/redesign-copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.spec) setErr(d.error || "Couldn't build a draft. Try naming the subject and the split.");
      else { setSpec(d.spec); setPhase("editor"); }
    } catch (e: any) { setErr(e?.message || "Something went wrong."); }
    finally { setBusy(false); }
  }

  if (phase === "editor" && spec) return <div><div className="mb-3 rounded-xl border border-sage/30 bg-sage-soft px-4 py-2.5 text-sm text-sage">Here's your first draft. Tune the buckets and prompts, Validate, then Publish. Test it with two browsers.</div><RedesignEditor me={me} initial={spec} initialStatus="draft" /></div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <div className="text-3xl">🤝</div>
        <h1 className="mt-2 font-serif text-3xl text-ink">Describe the paired redesign to build</h1>
        <p className="mt-2 text-slate2">Two learners interview each other, then redesign each other's subject on an instrument you define. Name the subject and the split.</p>
      </div>
      {busy ? (
        <div className="mt-8 rounded-2xl border border-line bg-white p-8 text-center shadow-sm"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-ai" /><div className="mt-4 font-serif text-lg text-ink">Designing it</div><div className="mt-1 text-sm text-slate-500">{LOADING[step]}</div></div>
      ) : (
        <>
          <textarea className="field mt-6 w-full text-base" style={{ minHeight: "7rem" }} value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="e.g. Partners redesign each other's job into an AI/Human split." autoFocus />
          <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-xs text-slate-400">Try:</span>{EXAMPLES.map((ex) => <button key={ex.label} onClick={() => setIntent(ex.text)} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-sage hover:bg-sage-soft">{ex.label}</button>)}</div>
          <button onClick={build} disabled={!intent.trim()} className="btn-primary mt-6 w-full text-base disabled:opacity-50">Build it →</button>
          {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
          <div className="mt-6 text-center text-sm text-slate-400">Prefer to fill it in yourself? <Link href="/studio/redesign/new" className="text-slate2 underline hover:text-ink">Open the blank builder</Link></div>
        </>
      )}
    </div>
  );
}
