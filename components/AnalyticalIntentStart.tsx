"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BuildProgress from "@/components/BuildProgress";
import DraftReview from "@/components/DraftReview";
import { streamSpec } from "@/lib/specStreamClient";
import { saveNewDraft } from "@/lib/saveNewDraft";
import AnalyticalEditor from "@/components/AnalyticalEditor";

const EXAMPLES = [
  { label: "AI-exposure X-ray", text: "An AI-exposure X-ray of a job: paste a job description, break it into tasks, and score each None / Assisted / Automatable by today's AI." },
  { label: "Argument strength", text: "Analyze a strategy memo: break it into its claims, and score each by evidence strength: Unsupported / Weak / Solid." },
  { label: "Risk register", text: "Turn a project plan into a risk register: extract the risks and rate each Low / Medium / High severity." },
];

export default function AnalyticalIntentStart({ me }: { me: string }) {
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
      const spec = await streamSpec("/api/mechanics/analytical-copilot", { intent }, setProgress);
      // Write it down before the editor opens — the author has had no chance
      // to save, and a minute of generation shouldn't die with a stray click.
      setSaved(await saveNewDraft("analytical", spec, me));
      setSpec(spec); setPhase("review");
    } catch (e: any) { setErr(e?.message || "Something went wrong."); }
    finally { setBusy(false); }
  }

  if (phase === "review" && spec) {
    return (
      <DraftReview
        formatId="analytical"
        spec={spec}
        onChange={setSpec}
        onDone={() => setPhase("editor")}
      />
    );
  }

  if (phase === "editor" && spec) return <div><div className="mb-3 rounded-xl border border-sage/30 bg-sage-soft px-4 py-2.5 text-sm text-sage">{saved ? "Saved to Your modules as a draft. " : ""}Here's your first draft. Tune the levels and the lens, Validate, then Publish.</div><AnalyticalEditor me={me} initial={spec} initialStatus="draft" /></div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <div className="text-3xl">📊</div>
        <h1 className="mt-2 font-serif text-3xl text-ink">Describe the instrument to build</h1>
        <p className="mt-2 text-slate2">It breaks a subject into units and scores each against a scale you define. Name what to analyze and the scale.</p>
      </div>
      {busy ? (
        <div className="mt-8"><BuildProgress chars={progress.chars} name={progress.name} stage={progress.stage} fallbackLabel="Breaking your subject into units and building the scale" /></div>
      ) : (
        <>
          <textarea className="field mt-6 w-full text-base" style={{ minHeight: "7rem" }} value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="e.g. An AI-exposure X-ray: paste a job, break it into tasks, score each None / Assisted / Automatable." autoFocus />
          <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-xs text-slate-400">Try:</span>{EXAMPLES.map((ex) => <button key={ex.label} onClick={() => setIntent(ex.text)} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-sage hover:bg-sage-soft">{ex.label}</button>)}</div>
          <button onClick={build} disabled={!intent.trim()} className="btn-primary mt-6 w-full text-base disabled:opacity-50">Build it →</button>
          {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
          <div className="mt-6 text-center text-sm text-slate-400">Prefer to fill it in yourself? <Link href="/studio/analytical/new" className="text-slate2 underline hover:text-ink">Open the blank builder</Link></div>
        </>
      )}
    </div>
  );
}
