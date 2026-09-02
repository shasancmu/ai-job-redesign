"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BuildProgress from "@/components/BuildProgress";
import DraftReview from "@/components/DraftReview";
import { streamSpec } from "@/lib/specStreamClient";
import { saveNewDraft } from "@/lib/saveNewDraft";
import NegEditor from "@/components/NegEditor";

const EXAMPLES = [
  { label: "Job offer", text: "A candidate negotiates a job offer over base, bonus, equity, remote days, start date, and title, where the two sides weight the issues oppositely so trades create value." },
  { label: "Procurement", text: "A buyer and a vendor negotiate price, volume, payment terms, warranty length, and delivery date, with some compatible and some distributive issues." },
  { label: "Partnership split", text: "Two co-founders negotiate equity split, roles, vesting, and decision rights, each caring more about different terms." },
  { label: "Buy a used van", text: "A single-price haggle: the learner is buying a used van with a clear walk-away, and the seller has a hidden floor." },
];

export default function NegIntentStart({ me }: { me: string }) {
  const [phase, setPhase] = useState<"intent" | "review" | "editor">("intent");
  const [scn, setScn] = useState<any>(null);
  const [intent, setIntent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [progress, setProgress] = useState<{ chars: number; name: string; stage?: string }>({ chars: 0, name: "" });
  const [saved, setSaved] = useState(false);

  async function build() {
    if (!intent.trim()) return;
    setBusy(true); setErr(""); setProgress({ chars: 0, name: "" });
    try {
      const spec = await streamSpec("/api/mechanics/negotiation-copilot", { intent }, setProgress);
      // Write it down before the editor opens — the author has had no chance
      // to save, and a minute of generation shouldn't die with a stray click.
      setSaved(await saveNewDraft("negotiation", spec, me));
      setScn(spec); setPhase("review");
    } catch (e: any) { setErr(e?.message || "Something went wrong."); }
    finally { setBusy(false); }
  }

  if (phase === "review" && scn) {
    return (
      <DraftReview
        formatId="negotiation"
        spec={scn}
        onChange={setScn}
        onDone={() => setPhase("editor")}
      />
    );
  }

  if (phase === "editor" && scn) {
    return (
      <div>
        <div className="mb-3 rounded-xl border border-sage/30 bg-sage-soft px-4 py-2.5 text-sm text-sage">{saved ? "Saved to Your modules as a draft. " : ""}Here's your first draft. Tune the payoffs, Validate, then Publish. The counterpart's points are the hidden scoresheet.</div>
        <NegEditor me={me} initial={scn} initialStatus="draft" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <div className="text-3xl">🤝</div>
        <h1 className="mt-2 font-serif text-3xl text-ink">Describe the negotiation to build</h1>
        <p className="mt-2 text-slate2">Say who's negotiating and over what. The copilot writes the hidden payoff tables that make trades pay off. You tune from there.</p>
      </div>
      {busy ? (
        <div className="mt-8"><BuildProgress chars={progress.chars} name={progress.name} stage={progress.stage} fallbackLabel="Setting up the two sides and their hidden payoff tables" /></div>
      ) : (
        <>
          <textarea className="field mt-6 w-full text-base" style={{ minHeight: "8rem" }} value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="e.g. A candidate and a hiring manager negotiate an offer over six issues, weighted oppositely so smart trades beat a split-the-difference deal." autoFocus />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Try:</span>
            {EXAMPLES.map((ex) => <button key={ex.label} onClick={() => setIntent(ex.text)} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-sage hover:bg-sage-soft">{ex.label}</button>)}
          </div>
          <button onClick={build} disabled={!intent.trim()} className="btn-primary mt-6 w-full text-base disabled:opacity-50">Build it →</button>
          {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
          <div className="mt-6 text-center text-sm text-slate-400">Prefer to fill it in yourself? <Link href="/studio/negotiation/new" className="text-slate2 underline hover:text-ink">Open the blank builder</Link></div>
        </>
      )}
    </div>
  );
}
