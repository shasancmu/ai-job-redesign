"use client";

// The authoring surface: type a business idea + the decision you want to teach,
// and the studio drafts a full interactive "living case" you preview instantly.
// AI-drafted (grounded in what the model knows); you verify and add real media
// at the gate before teaching it.

import { useState } from "react";
import Link from "next/link";
import LivingCaseReader from "@/components/LivingCaseReader";
import type { CaseGenome } from "@/lib/cases/types";

const EXAMPLES = [
  { idea: "Duolingo", decision: "kill the paid subscription and go fully free-with-ads, or don't" },
  { idea: "A robotaxi startup in 2021", decision: "raise a mega-round to scale now, or stay lean until the tech is ready" },
  { idea: "Liquid Death canned water", decision: "spend the whole budget on absurd branding, or on distribution" },
];

export default function NewCasePage() {
  const [idea, setIdea] = useState("");
  const [decision, setDecision] = useState("");
  const [protagonist, setProtagonist] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [genome, setGenome] = useState<CaseGenome | null>(null);

  async function generate() {
    if (!idea.trim() || !decision.trim()) { setErr("Fill in the idea and the decision."); return; }
    setBusy(true); setErr(null); setGenome(null);
    try {
      const res = await fetch("/api/cases/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea, decision, protagonist }) });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't generate."); setBusy(false); return; }
      setGenome(j.genome);
      setTimeout(() => window.scrollTo({ top: document.getElementById("preview")?.offsetTop ?? 0, behavior: "smooth" }), 100);
    } catch { setErr("Couldn't reach the generator."); }
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Superadditive</Link>
          <span className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Case Studio · draft</span>
        </div>

        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">Author a living case</h1>
        <p className="mt-2 text-slate2">Name a business and the decision worth teaching. The studio drafts a full interactive case — decision-first, with a hidden reveal — that you preview instantly and refine. You bring the pedagogy; it does the labor.</p>

        <div className="card mt-6 space-y-4 p-5">
          <div>
            <label className="lbl">Business idea or company</label>
            <input className="field mt-1" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. Netflix in 2007 · a vertical-farming startup · Shopify" />
          </div>
          <div>
            <label className="lbl">The decision to teach</label>
            <input className="field mt-1" value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="e.g. cannibalize the DVD business with streaming, or protect it" onKeyDown={(e) => { if (e.key === "Enter" && !busy) generate(); }} />
          </div>
          <div>
            <label className="lbl">Protagonist <span className="font-normal text-slate-400">(optional)</span></label>
            <input className="field mt-1" value={protagonist} onChange={(e) => setProtagonist(e.target.value)} placeholder="e.g. Reed Hastings, CEO — or leave blank" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="mr-1 self-center text-xs text-slate-400">Try:</span>
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => { setIdea(ex.idea); setDecision(ex.decision); setProtagonist(""); }} className="rounded-full bg-mist px-2.5 py-1 text-xs text-slate2 hover:bg-slate-200">{ex.idea}</button>
            ))}
          </div>

          {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          <button onClick={generate} disabled={busy} className="btn-primary w-full">{busy ? "Drafting the case… (~20s)" : genome ? "Draft another" : "Draft the case"}</button>
          <p className="text-center text-xs text-slate-400">AI-drafted from public knowledge. Verify every claim and add real videos + sources before teaching it.</p>
        </div>
      </div>

      {genome && (
        <div id="preview" className="border-t-4 border-sage/30">
          <LivingCaseReader genome={genome} preview />
        </div>
      )}
    </main>
  );
}
