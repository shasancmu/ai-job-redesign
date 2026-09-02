"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BuildProgress from "@/components/BuildProgress";
import DraftReview from "@/components/DraftReview";
import { streamSpec } from "@/lib/specStreamClient";
import { saveNewDraft } from "@/lib/saveNewDraft";
import RedesignEditor from "@/components/RedesignEditor";

const EXAMPLES = [
  { label: "Reimagine your job", text: "Partners interview each other about their jobs, then redesign each other's role: what to delegate to AI (search, structure, draft, translate) vs. what to lean into as a human (lead, own, judge, integrate)." },
  { label: "Redesign a workflow", text: "Partners map each other's core workflow, then redesign it: which steps AI should handle vs. which need human judgment." },
  { label: "Rework a research plan", text: "Partners interview each other about a research project, then redesign the plan around what AI can accelerate vs. what only the researcher can do." },
];

export default function RedesignIntentStart({ me }: { me: string }) {
  const [phase, setPhase] = useState<"intent" | "review" | "editor">("intent");
  const [spec, setSpec] = useState<any>(null);
  const [intent, setIntent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [progress, setProgress] = useState<{ chars: number; name: string; stage?: string }>({ chars: 0, name: "" });
  const [saved, setSaved] = useState(false);

  async function build() {
    if (!intent.trim()) return;
    setBusy(true); setErr(""); setProgress({ chars: 0, name: "" });
    try {
      const spec = await streamSpec("/api/mechanics/redesign-copilot", { intent }, setProgress);
      // Write it down before the editor opens — the author has had no chance
      // to save, and a minute of generation shouldn't die with a stray click.
      setSaved(await saveNewDraft("redesign", spec, me));
      setSpec(spec); setPhase("review");
    } catch (e: any) { setErr(e?.message || "Something went wrong."); }
    finally { setBusy(false); }
  }

  if (phase === "review" && spec) {
    return (
      <DraftReview
        formatId="redesign"
        spec={spec}
        onChange={setSpec}
        onDone={() => setPhase("editor")}
      />
    );
  }

  if (phase === "editor" && spec) return <div><div className="mb-3 rounded-xl border border-sage/30 bg-sage-soft px-4 py-2.5 text-sm text-sage">{saved ? "Saved to Your modules as a draft. " : ""}Here's your first draft. Tune the buckets and prompts, Validate, then Publish. Test it with two browsers.</div><RedesignEditor me={me} initial={spec} initialStatus="draft" /></div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <div className="text-3xl">🤝</div>
        <h1 className="mt-2 font-serif text-3xl text-ink">Describe the paired redesign to build</h1>
        <p className="mt-2 text-slate2">Two learners interview each other, then redesign each other's subject on an instrument you define. Name the subject and the split.</p>
      </div>
      {busy ? (
        <div className="mt-8"><BuildProgress chars={progress.chars} name={progress.name} stage={progress.stage} fallbackLabel="Building the interview and the instrument" /></div>
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
