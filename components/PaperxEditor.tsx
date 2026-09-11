"use client";

import { useState } from "react";
import Link from "next/link";
import PaperxReader from "@/components/PaperxReader";
import DeleteModuleButton from "@/components/DeleteModuleButton";
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
  function upPredict(i: number, field: "prompt" | "reveal", v: string) {
    setG((p) => { const preds = [...p.predicts]; preds[i] = { ...preds[i], [field]: v }; return { ...p, predicts: preds }; });
  }
  function upChoice(i: number, ci: number, v: string) {
    setG((p) => { const preds = [...p.predicts]; const ch = [...preds[i].choices]; ch[ci] = v; preds[i] = { ...preds[i], choices: ch }; return { ...p, predicts: preds }; });
  }
  function setAnswer(i: number, ci: number) {
    setG((p) => { const preds = [...p.predicts]; preds[i] = { ...preds[i], answer: ci }; return { ...p, predicts: preds }; });
  }
  function setStat(i: number, field: "value" | "label" | "tone" | "icon", v: string) {
    setG((p) => {
      const info = p.evidence.infographic; if (!info) return p;
      const stats = [...info.stats]; stats[i] = { ...stats[i], [field]: v };
      return { ...p, evidence: { ...p.evidence, infographic: { ...info, stats } } };
    });
  }
  function setPicto(field: "total" | "filled" | "label" | "icon" | "tone", v: string | number) {
    setG((p) => {
      const info = p.evidence.infographic; const pic = info?.pictograph; if (!info || !pic) return p;
      let next: any = { ...pic, [field]: v };
      // Keep the counts sane: 1–20 total, filled within [0, total].
      if (field === "total") { const total = Math.max(1, Math.min(20, Number(v) || 1)); next = { ...pic, total, filled: Math.min(pic.filled, total) }; }
      if (field === "filled") { next = { ...pic, filled: Math.max(0, Math.min(pic.total, Number(v) || 0)) }; }
      return { ...p, evidence: { ...p.evidence, infographic: { ...info, pictograph: next } } };
    });
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
          {savedSlug && <DeleteModuleButton kind="paper-explainer" slug={savedSlug} name={g.title} redirectTo="/studio/paper" />}
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
          <div className="rounded-xl border border-line p-3"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">The core idea</div>
            <div className="mt-2"><Field label="The idea, in one or two plain sentences" value={g.ideaStatement} onChange={(v) => up("ideaStatement", v)} area /></div></div>
          <div className="rounded-xl border border-line p-3"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Evidence</div>
            <div className="mt-2 space-y-2">
              <Field label="Headline" value={g.evidence.headline} onChange={(v) => setG((p) => ({ ...p, evidence: { ...p.evidence, headline: v } }))} />
              <Field label="Takeaway" value={g.evidence.takeaway} onChange={(v) => setG((p) => ({ ...p, evidence: { ...p.evidence, takeaway: v } }))} area />
            </div>
            {g.evidence.infographic && g.evidence.infographic.stats.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-slate-500">Infographic numbers: verify each against the paper</div>
                <div className="mt-2 space-y-2">
                  {g.evidence.infographic.stats.map((s, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <input value={s.value} onChange={(e) => setStat(i, "value", e.target.value)} className="field w-24 text-sm" placeholder="+42%" />
                      <input value={s.label} onChange={(e) => setStat(i, "label", e.target.value)} className="field min-w-[8rem] flex-1 text-sm" placeholder="what it measures" />
                      <input value={s.icon || ""} onChange={(e) => setStat(i, "icon", e.target.value)} className="field w-14 text-center text-sm" placeholder="📄" aria-label="Icon (emoji)" maxLength={4} />
                      <select value={s.tone || "neutral"} onChange={(e) => setStat(i, "tone", e.target.value)} className="field w-28 text-sm" aria-label="Direction">
                        <option value="up">↑ up</option>
                        <option value="down">↓ down</option>
                        <option value="neutral">– neutral</option>
                      </select>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Icon is one emoji. Direction sets the arrow and color (up = green, down = clay).</p>
              </div>
            )}
            {g.evidence.infographic?.pictograph && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-slate-500">Pictograph: a proportion made of icons</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="text-xs text-slate-500">Filled
                    <input type="number" min={0} max={g.evidence.infographic.pictograph.total} value={g.evidence.infographic.pictograph.filled} onChange={(e) => setPicto("filled", e.target.value)} className="field mt-1 w-16 text-sm" />
                  </label>
                  <label className="text-xs text-slate-500">of Total
                    <input type="number" min={1} max={20} value={g.evidence.infographic.pictograph.total} onChange={(e) => setPicto("total", e.target.value)} className="field mt-1 w-16 text-sm" />
                  </label>
                  <input value={g.evidence.infographic.pictograph.icon || ""} onChange={(e) => setPicto("icon", e.target.value)} className="field w-14 text-center text-sm" placeholder="📄" aria-label="Pictograph icon" maxLength={4} />
                  <select value={g.evidence.infographic.pictograph.tone || "neutral"} onChange={(e) => setPicto("tone", e.target.value)} className="field w-28 text-sm" aria-label="Pictograph direction">
                    <option value="up">↑ up</option>
                    <option value="down">↓ down</option>
                    <option value="neutral">– neutral</option>
                  </select>
                </div>
                <input value={g.evidence.infographic.pictograph.label} onChange={(e) => setPicto("label", e.target.value)} className="field mt-2 w-full text-sm" placeholder="what the filled share represents" />
              </div>
            )}
            <p className="mt-2 text-xs text-slate-400">The numbers come from the paper. Double-check each one before publishing.</p></div>
          <div className="rounded-xl border border-line p-3"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Why it happens</div>
            <div className="mt-2 space-y-2"><Field label="Headline" value={g.mechanism.headline} onChange={(v) => upSection("mechanism", "headline", v)} /><Field label="Body" value={g.mechanism.body} onChange={(v) => upSection("mechanism", "body", v)} area /></div></div>
          <div className="rounded-xl border border-line p-3"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">So what</div>
            <div className="mt-2 space-y-2"><Field label="Headline" value={g.soWhat.headline} onChange={(v) => upSection("soWhat", "headline", v)} /><Field label="Body" value={g.soWhat.body} onChange={(v) => upSection("soWhat", "body", v)} area /></div></div>
          {g.predicts.length > 0 && (
            <div className="rounded-xl border border-line p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Predict questions</div>
              <p className="mt-1 text-xs text-slate-400">Check the logic: the option you mark correct must actually be correct, and the reveal must match it.</p>
              <div className="mt-3 space-y-4">
                {g.predicts.map((pr, i) => (
                  <div key={i} className="rounded-lg bg-mist/50 p-3">
                    <Field label={`Question ${i + 1}`} value={pr.prompt} onChange={(v) => upPredict(i, "prompt", v)} />
                    <div className="mt-2 text-xs font-semibold text-slate-500">Choices: select the correct one</div>
                    <div className="mt-1 space-y-1.5">
                      {pr.choices.map((c, ci) => (
                        <label key={ci} className="flex items-center gap-2">
                          <input type="radio" name={`ans-${i}`} checked={pr.answer === ci} onChange={() => setAnswer(i, ci)} className="shrink-0 accent-sage" />
                          <input value={c} onChange={(e) => upChoice(i, ci, e.target.value)} className={"field w-full text-sm " + (pr.answer === ci ? "border-sage" : "")} />
                        </label>
                      ))}
                    </div>
                    <div className="mt-2"><Field label="Reveal (why the answer is right)" value={pr.reveal} onChange={(v) => upPredict(i, "reveal", v)} area /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
