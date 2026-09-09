"use client";

import { useState } from "react";
import Link from "next/link";
import PaperxReader from "@/components/PaperxReader";
import type { PxGenome } from "@/lib/paperx/types";

// Hoisted so inputs keep focus across keystrokes (a component defined inside the
// render body would remount on every change).
function Field({ label, value, onChange, area }: { label: string; value: string; onChange: (v: string) => void; area?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      {area
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="field mt-1 w-full text-sm" />
        : <input value={value} onChange={(e) => onChange(e.target.value)} className="field mt-1 w-full text-sm" />}
    </label>
  );
}

// The authoring editor: a live preview of the explainer plus an edit panel to
// fix the AI's text before publishing. The generator is forbidden from inventing
// numbers, but the author should still verify every fact against their paper.
export default function PaperxEditor({ spec, editSlug }: { spec: PxGenome; editSlug?: string }) {
  const [g, setG] = useState<PxGenome>(spec);
  const [tab, setTab] = useState<"preview" | "edit">("preview");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(editSlug || null);

  function up<K extends keyof PxGenome>(k: K, v: PxGenome[K]) { setG((p) => ({ ...p, [k]: v })); }
  function upSection(k: "hook" | "nullBelief" | "mechanism" | "soWhat", field: "headline" | "body", v: string) {
    setG((p) => ({ ...p, [k]: { ...p[k], [field]: v } }));
  }

  async function save(publish: boolean) {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/paperx/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec: g, publish, editSlug: savedSlug || undefined }) });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't save."); setBusy(false); return; }
      setSavedSlug(j.slug);
      if (publish) { window.location.href = `/px/${j.slug}`; return; }
    } catch { setErr("Couldn't reach the server."); }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24">
      <div className="sticky top-0 z-20 -mx-5 flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper/95 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-1 rounded-full bg-mist p-1">
          <button onClick={() => setTab("preview")} className={`rounded-full px-3 py-1 text-sm ${tab === "preview" ? "bg-white font-semibold text-ink shadow-sm" : "text-slate2"}`}>Preview</button>
          <button onClick={() => setTab("edit")} className={`rounded-full px-3 py-1 text-sm ${tab === "edit" ? "bg-white font-semibold text-ink shadow-sm" : "text-slate2"}`}>Edit text</button>
        </div>
        <div className="flex items-center gap-2">
          {savedSlug && <Link href={`/px/${savedSlug}/insights`} className="text-sm text-slate2 hover:text-ink">Insights</Link>}
          {savedSlug && <Link href={`/px/${savedSlug}`} className="text-sm text-slate2 hover:text-ink">Open →</Link>}
          <button onClick={() => save(false)} disabled={busy} className="btn-ghost text-sm">{busy ? "…" : "Save draft"}</button>
          <button onClick={() => save(true)} disabled={busy} className="btn-primary text-sm">{busy ? "…" : "Publish"}</button>
        </div>
      </div>
      {err && <p className="mt-3 text-sm text-clay">{err}</p>}

      {tab === "preview" ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-line">
          <PaperxReader g={g} preview />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-500">Fix anything the AI got wrong. Numbers and claims should match your paper exactly.</p>
          <Field label="Explainer title" value={g.title} onChange={(v) => up("title", v)} />
          <Field label="Paper title" value={g.paperTitle} onChange={(v) => up("paperTitle", v)} />
          <Field label="Authors" value={g.authors} onChange={(v) => up("authors", v)} />
          <Field label="Hook (the dek)" value={g.dek} onChange={(v) => up("dek", v)} area />
          <Field label="The big question" value={g.bigQuestion} onChange={(v) => up("bigQuestion", v)} />
          <div className="rounded-xl border border-line p-3"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Why it matters</div>
            <div className="mt-2 space-y-2"><Field label="Headline" value={g.hook.headline} onChange={(v) => upSection("hook", "headline", v)} /><Field label="Body" value={g.hook.body} onChange={(v) => upSection("hook", "body", v)} area /></div></div>
          <div className="rounded-xl border border-line p-3"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">What everyone assumes (the null)</div>
            <div className="mt-2 space-y-2"><Field label="Headline" value={g.nullBelief.headline} onChange={(v) => upSection("nullBelief", "headline", v)} /><Field label="Body" value={g.nullBelief.body} onChange={(v) => upSection("nullBelief", "body", v)} area /></div></div>
          <div className="rounded-xl border border-line p-3"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">The puzzle</div>
            <div className="mt-2 space-y-2">
              <Field label="We believe…" value={g.puzzle.believe} onChange={(v) => setG((p) => ({ ...p, puzzle: { ...p.puzzle, believe: v } }))} />
              <Field label="So we'd expect…" value={g.puzzle.expect} onChange={(v) => setG((p) => ({ ...p, puzzle: { ...p.puzzle, expect: v } }))} />
              <Field label="But we observe…" value={g.puzzle.observe} onChange={(v) => setG((p) => ({ ...p, puzzle: { ...p.puzzle, observe: v } }))} />
            </div></div>
          <div className="rounded-xl border border-line p-3"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">The idea (interaction)</div>
            <div className="mt-2 space-y-2">
              <Field label="IF" value={g.idea.if_} onChange={(v) => setG((p) => ({ ...p, idea: { ...p.idea, if_: v } }))} />
              <Field label="THEN" value={g.idea.then_} onChange={(v) => setG((p) => ({ ...p, idea: { ...p.idea, then_: v } }))} />
              <Field label="ESPECIALLY/EXCEPT WHEN" value={g.idea.whenZ} onChange={(v) => setG((p) => ({ ...p, idea: { ...p.idea, whenZ: v } }))} />
              <Field label="BECAUSE" value={g.idea.because} onChange={(v) => setG((p) => ({ ...p, idea: { ...p.idea, because: v } }))} />
            </div></div>
          <div className="rounded-xl border border-line p-3"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Evidence takeaway</div>
            <div className="mt-2"><Field label="Takeaway" value={g.evidence.takeaway} onChange={(v) => setG((p) => ({ ...p, evidence: { ...p.evidence, takeaway: v } }))} area /></div>
            <p className="mt-2 text-xs text-slate-400">The chart is generated from the paper's numbers. If it looks wrong, verify the figures against your paper before publishing.</p></div>
          <div className="rounded-xl border border-line p-3"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Why it happens</div>
            <div className="mt-2 space-y-2"><Field label="Headline" value={g.mechanism.headline} onChange={(v) => upSection("mechanism", "headline", v)} /><Field label="Body" value={g.mechanism.body} onChange={(v) => upSection("mechanism", "body", v)} area /></div></div>
          <div className="rounded-xl border border-line p-3"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">So what</div>
            <div className="mt-2 space-y-2"><Field label="Headline" value={g.soWhat.headline} onChange={(v) => upSection("soWhat", "headline", v)} /><Field label="Body" value={g.soWhat.body} onChange={(v) => upSection("soWhat", "body", v)} area /></div></div>
          <div className="rounded-xl border border-line p-3"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Teach-back</div>
            <div className="mt-2 space-y-2">
              <Field label="Prompt (use <audience> as a placeholder)" value={g.teachBack.prompt} onChange={(v) => setG((p) => ({ ...p, teachBack: { ...p.teachBack, prompt: v } }))} />
              <Field label="Audience" value={g.teachBack.audience} onChange={(v) => setG((p) => ({ ...p, teachBack: { ...p.teachBack, audience: v } }))} />
            </div></div>
        </div>
      )}
    </div>
  );
}
