"use client";

// Living Case authoring, in the studio: name a business + the decision to teach,
// the studio drafts a full interactive case, then hands it to the editor to
// verify, add media, publish, and assign to a class — one continuous flow.

import { useState } from "react";
import Link from "next/link";
import CaseEditor from "@/components/CaseEditor";
import Logo from "@/components/Logo";
import type { CaseGenome } from "@/lib/cases/types";

const EXAMPLES = [
  { idea: "Duolingo", decision: "kill the paid subscription and go fully free-with-ads, or don't" },
  { idea: "A robotaxi startup in 2021", decision: "raise a mega-round to scale now, or stay lean until the tech is ready" },
  { idea: "Liquid Death canned water", decision: "spend the whole budget on absurd branding, or on distribution" },
];

export default function StudioCasePage() {
  const [idea, setIdea] = useState("");
  const [decision, setDecision] = useState("");
  const [protagonist, setProtagonist] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [genome, setGenome] = useState<CaseGenome | null>(null);

  async function generate() {
    if (!idea.trim() || !decision.trim()) { setErr("Fill in the idea and the decision."); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/cases/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea, decision, protagonist }) });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't generate."); setBusy(false); return; }
      setGenome(j.genome);
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 60);
    } catch { setErr("Couldn't reach the generator."); }
    setBusy(false);
  }

  if (genome) {
    return (
      <main className="min-h-screen bg-paper text-ink">
        <div className="mx-auto max-w-3xl px-5 pt-6">
          <button onClick={() => setGenome(null)} className="text-sm text-slate2 hover:text-ink">← Draft a different case</button>
        </div>
        <div className="mt-3"><CaseEditor spec={genome} /></div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <Link href="/studio/create" className="text-sm text-slate2 hover:text-ink">← Studio</Link>
      </header>

      <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">Author a living case</h1>
      <p className="mt-2 text-slate2">Name a business and the decision worth teaching. The studio drafts a full interactive case, then you verify, add media, publish, and assign it to a class. Or <Link href="/studio/upload" className="font-medium text-ai hover:underline">start from documents</Link> instead.</p>

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
        <button onClick={generate} disabled={busy} className="btn-primary w-full">{busy ? "Drafting the case… (~20s)" : "Draft the case →"}</button>
        <p className="text-center text-xs text-slate-400">AI-drafted from public knowledge. You verify and add real media before publishing.</p>
      </div>
    </main>
  );
}
