"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BuildProgress from "@/components/BuildProgress";
import { streamSpec } from "@/lib/specStreamClient";
import { saveNewDraft } from "@/lib/saveNewDraft";
import NewsFrameEditor from "@/components/NewsFrameEditor";

const EXAMPLES = [
  { label: "Five Forces on AI", text: "Apply Porter's Five Forces to current AI-industry news. The learner picks a fresh story and reads each force, then calls whether the space is structurally attractive." },
  { label: "Disruption watch", text: "Use Christensen's disruptive-innovation lens on current retail and consumer-tech news. End with a call on whether the move is sustaining or disruptive." },
  { label: "Moat check", text: "Apply the 7 Powers framework to current earnings and strategy news, ending in a call on whether the company has a durable moat." },
];

export default function NewsFrameIntentStart({ me }: { me: string }) {
  const [phase, setPhase] = useState<"intent" | "editor">("intent");
  const [spec, setSpec] = useState<any>(null);
  const [intent, setIntent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [progress, setProgress] = useState({ chars: 0, name: "" });
  const [saved, setSaved] = useState(false);

  async function build() {
    if (!intent.trim()) return;
    setBusy(true); setErr(""); setProgress({ chars: 0, name: "" });
    try {
      const spec = await streamSpec("/api/mechanics/newsframe-copilot", { intent }, setProgress);
      // Write it down before the editor opens — the author has had no chance
      // to save, and a minute of generation shouldn't die with a stray click.
      setSaved(await saveNewDraft("newsframe", spec, me));
      setSpec(spec); setPhase("editor");
    } catch (e: any) { setErr(e?.message || "Something went wrong."); }
    finally { setBusy(false); }
  }

  if (phase === "editor" && spec) return <div><div className="mb-3 rounded-xl border border-sage/30 bg-sage-soft px-4 py-2.5 text-sm text-sage">{saved ? "Saved to Your modules as a draft. " : ""}Here&apos;s your first draft. Tune the fields and the call, Validate, then Publish.</div><NewsFrameEditor me={me} initial={spec} initialStatus="draft" /></div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <div className="text-3xl">🗞️</div>
        <h1 className="mt-2 font-serif text-3xl text-ink">Describe your framework desk</h1>
        <p className="mt-2 text-slate2">Name a framework and a news beat. Each run pulls real, current stories, and the learner applies the framework to one of them.</p>
      </div>
      {busy ? (
        <div className="mt-8"><BuildProgress chars={progress.chars} name={progress.name} fallbackLabel="Mapping your framework onto a live news beat" /></div>
      ) : (
        <>
          <textarea className="field mt-6 w-full text-base" style={{ minHeight: "7rem" }} value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="e.g. Apply Porter's Five Forces to current AI-industry news, ending in a call on whether the space is structurally attractive." autoFocus />
          <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-xs text-slate-400">Try:</span>{EXAMPLES.map((ex) => <button key={ex.label} onClick={() => setIntent(ex.text)} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-sage hover:bg-sage-soft">{ex.label}</button>)}</div>
          <button onClick={build} disabled={!intent.trim()} className="btn-primary mt-6 w-full text-base disabled:opacity-50">Build it →</button>
          {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
          <div className="mt-6 text-center text-sm text-slate-400">Prefer to fill it in yourself? <Link href="/studio/news/new" className="text-slate2 underline hover:text-ink">Open the blank builder</Link></div>
        </>
      )}
    </div>
  );
}
