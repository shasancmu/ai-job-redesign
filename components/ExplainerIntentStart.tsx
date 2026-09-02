"use client";

import { useState } from "react";
import Link from "next/link";
import BuildProgress from "@/components/BuildProgress";
import DraftReview from "@/components/DraftReview";
import { streamSpec } from "@/lib/specStreamClient";
import { saveNewDraft } from "@/lib/saveNewDraft";
import ExplainerEditor from "@/components/ExplainerEditor";

// The explainer was the one format with no describe-it flow: authors landed in
// a blank editor with a copilot panel off to the side, which meant a wall of
// empty boxes and no review of what the AI came back with — the exact problem
// the review exists to solve. This gives it the same front door as the rest.
const EXAMPLES = [
  { label: "How diffusion models work", text: "A plain-language walkthrough of how a diffusion model generates an image, for non-technical managers." },
  { label: "Reading a P&L", text: "Walk a first-time manager through reading a P&L: what each line means, and which ones actually move." },
  { label: "What a confound is", text: "Explain confounding in causal inference, section by section, for people who have never taken statistics." },
];

export default function ExplainerIntentStart({ me }: { me: string }) {
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
      const draft = await streamSpec("/api/mechanics/explainer-copilot", { intent }, setProgress);
      // Write it down before the editor opens — the author has had no chance
      // to save, and this is the slowest format to generate.
      setSaved(await saveNewDraft("explainer", draft, me));
      setSpec(draft); setPhase("review");
    } catch (e: any) { setErr(e?.message || "Something went wrong."); }
    finally { setBusy(false); }
  }

  if (phase === "review" && spec) {
    return <DraftReview formatId="explainer" spec={spec} onChange={setSpec} onDone={() => setPhase("editor")} />;
  }

  if (phase === "editor" && spec) {
    return (
      <div>
        <div className="mb-3 rounded-xl border border-sage/30 bg-sage-soft px-4 py-2.5 text-sm text-sage">
          {saved ? "Saved to Your modules as a draft. " : ""}Here&apos;s your first draft. Tighten the sections and the takeaway, Validate, then Publish.
        </div>
        <ExplainerEditor me={me} initial={spec} initialStatus="draft" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <div className="text-3xl">📖</div>
        <h1 className="mt-2 font-serif text-3xl text-ink">Describe what you want to explain</h1>
        <p className="mt-2 text-slate2">
          It writes a guided walkthrough, section by section. Name the topic and who it&apos;s for.
        </p>
      </div>
      {busy ? (
        <div className="mt-8">
          <BuildProgress
            chars={progress.chars}
            name={progress.name}
            stage={progress.stage}
            fallbackLabel="Structuring the walkthrough, section by section"
          />
        </div>
      ) : (
        <>
          <textarea
            className="field mt-6 w-full text-base"
            style={{ minHeight: "7rem" }}
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g. Explain how a diffusion model turns noise into an image, for managers with no technical background."
            autoFocus
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Try:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => setIntent(ex.text)}
                className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-sage hover:bg-sage-soft"
              >
                {ex.label}
              </button>
            ))}
          </div>
          <button onClick={build} disabled={!intent.trim()} className="btn-primary mt-6 w-full text-base disabled:opacity-50">
            Build it →
          </button>
          {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
          <div className="mt-6 text-center text-sm text-slate-400">
            Prefer to fill it in yourself?{" "}
            <Link href="/studio/explainer/new" className="text-slate2 underline hover:text-ink">Open the blank builder</Link>
          </div>
        </>
      )}
    </div>
  );
}
