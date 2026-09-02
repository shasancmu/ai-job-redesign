"use client";

import SaveState from "@/components/SaveState";
import { useDraftAutosave } from "@/components/useDraftAutosave";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { validateBenchConfig } from "@/lib/mechanics/benchStore";

const KEYS = ["A", "B", "C", "D", "E", "F"];

export default function BenchEditor({ me, initial, initialStatus }: { me: string; initial: any; initialStatus?: string }) {
  const supabase = createClient();
  const [cfg, setCfg] = useState<any>(initial);
  // Autosave the draft as it changes, so work is never lost to a stray click.
  const autosave = useDraftAutosave({ table: "benchmark_specs", slug: cfg?.slug, ownerId: me, spec: cfg });
  const [status, setStatus] = useState(initialStatus || "draft");
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [intent, setIntent] = useState("");

  const set = (p: any) => setCfg((c: any) => ({ ...c, ...p }));
  const qs: any[] = cfg.questions || [];
  const setQ = (i: number, p: any) => setCfg((c: any) => { const a = [...(c.questions || [])]; a[i] = { ...a[i], ...p }; return { ...c, questions: a }; });
  const setOpt = (qi: number, oi: number, text: string) => setCfg((c: any) => { const a = [...(c.questions || [])]; const opts = [...(a[qi].options || [])]; opts[oi] = { ...opts[oi], text }; a[qi] = { ...a[qi], options: opts }; return { ...c, questions: a }; });
  const addQ = () => setCfg((c: any) => ({ ...c, questions: [...(c.questions || []), { id: (c.questions?.length || 0) + 1, prompt: "", options: [{ key: "A", text: "" }, { key: "B", text: "" }, { key: "C", text: "" }, { key: "D", text: "" }], answer: "A" }] }));
  const addOpt = (qi: number) => setCfg((c: any) => { const a = [...(c.questions || [])]; const opts = [...(a[qi].options || [])]; opts.push({ key: KEYS[opts.length] || `${opts.length}`, text: "" }); a[qi] = { ...a[qi], options: opts }; return { ...c, questions: a }; });

  function validate() { const e = validateBenchConfig(cfg); setErrors(e); setMsg(e.length ? "" : "Valid ✓"); return e; }

  async function copilot() {
    if (!intent.trim()) return;
    setBusy("copilot"); setMsg(""); setErrors([]);
    try {
      const res = await fetch("/api/mechanics/benchmark-copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent, currentSpec: cfg }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.spec) setErrors([d.error || "The copilot couldn't produce a quiz."]);
      else { setCfg(d.spec); setErrors(d.errors || []); setMsg(d.errors?.length ? "Draft ready (warnings below)" : "Draft ready ✓"); setIntent(""); }
    } catch (e: any) { setErrors([e?.message || "Copilot failed."]); }
    finally { setBusy(""); }
  }

  async function save(nextStatus?: string) {
    const e = validate(); if (e.length) { setMsg(""); return; }
    const st = nextStatus ?? status;
    setBusy("save"); setMsg("");
    const { error } = await supabase.from("benchmark_specs").upsert({ slug: cfg.slug, version: 1, owner_id: me, status: st, spec: cfg, updated_at: new Date().toISOString() }, { onConflict: "slug,version" });
    setBusy("");
    if (error) { const missing = /does not exist|relation|schema cache/i.test(error.message || ""); setErrors([missing ? "Nothing saved: the benchmark_specs table isn't set up yet. An admin needs to run the setup migration." : `Save failed: ${error.message}`]); return; }
    setStatus(st); setErrors([]); setMsg(nextStatus === "published" ? "Published ✓" : nextStatus === "draft" ? "Unpublished" : "Saved ✓");
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <button onClick={validate} className="btn-ghost text-sm">Validate</button>
        <button onClick={() => save()} disabled={busy === "save"} className="btn-primary text-sm">{busy === "save" ? "Saving..." : "Save"}</button>
        <SaveState state={autosave.state} savedAt={autosave.savedAt} />
        {status === "published" ? <button onClick={() => save("draft")} disabled={!!busy} className="btn-ghost text-sm">Unpublish</button> : <button onClick={() => save("published")} disabled={!!busy} className="btn-ghost text-sm text-sage">Publish</button>}
        {status === "published" && <span className="rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-semibold text-sage">Published</span>}
        {cfg.slug && <Link href={`/b/${cfg.slug}`} target="_blank" className="btn-ghost text-sm">Open full run →</Link>}
        {msg && <span className="text-sm text-sage">{msg}</span>}
      </div>
      {errors.length > 0 && <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"><div className="font-semibold">{errors.length} to fix:</div><ul className="mt-1 list-disc pl-5">{errors.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-[1fr_140px_120px] gap-2">
            <div><label className="lbl">Name</label><input className="field" value={cfg.name || ""} onChange={(e) => set({ name: e.target.value })} /></div>
            <div><label className="lbl">Slug</label><input className="field font-mono text-sm" value={cfg.slug || ""} onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></div>
            <div><label className="lbl">Minutes</label><input type="number" className="field text-sm" value={Math.round((cfg.timeLimitSec || 300) / 60)} onChange={(e) => set({ timeLimitSec: Math.max(30, (Number(e.target.value) || 5) * 60) })} /></div>
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-white p-3">
            <input type="checkbox" checked={cfg.askConfidence !== false} onChange={(e) => set({ askConfidence: e.target.checked })} className="mt-0.5" />
            <span className="text-sm">
              <span className="font-semibold text-ink">Ask for confidence, and score calibration</span>
              <span className="mt-0.5 block text-xs text-slate-500">For each answer, the learner says how sure they are. The result shows how well their confidence matched being right, the core of good judgment.</span>
            </span>
          </label>
          <div className="space-y-3">
            {qs.map((q, qi) => (
              <div key={qi} className="rounded-xl border border-line p-3">
                <div className="flex gap-2">
                  <span className="mt-2 text-xs font-semibold text-slate-400">{qi + 1}.</span>
                  <textarea className="field flex-1 text-sm" rows={2} value={q.prompt || ""} onChange={(e) => setQ(qi, { prompt: e.target.value })} placeholder="The question" />
                  <button onClick={() => setCfg((c: any) => ({ ...c, questions: c.questions.filter((_: any, k: number) => k !== qi) }))} className="text-slate-300 hover:text-red-500">✕</button>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Options (select the correct one)</div>
                  {(q.options || []).map((o: any, oi: number) => (
                    <label key={oi} className="flex items-center gap-2">
                      <input type="radio" name={`ans${qi}`} checked={q.answer === o.key} onChange={() => setQ(qi, { answer: o.key })} title="Correct answer" />
                      <span className="w-4 text-xs font-semibold text-slate-500">{o.key}</span>
                      <input className="field flex-1 text-sm" value={o.text || ""} onChange={(e) => setOpt(qi, oi, e.target.value)} placeholder="option text" />
                    </label>
                  ))}
                  <button onClick={() => addOpt(qi)} className="text-xs font-semibold text-ai hover:underline">+ option</button>
                </div>
              </div>
            ))}
            <button onClick={addQ} className="btn-ghost text-sm">+ Add question</button>
          </div>
        </div>
        <div className="space-y-3">
          <div className="card p-4">
            <div className="text-sm font-semibold text-ink">✨ Copilot</div>
            <p className="mt-1 text-xs text-slate-500">Describe the topic and difficulty; it writes the questions and the answer key.</p>
            <textarea className="field mt-2 text-sm" rows={4} value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="e.g. 8 questions on basic statistical reasoning for managers: base rates, correlation vs causation, sampling." />
            <button onClick={copilot} disabled={busy === "copilot" || !intent.trim()} className="btn-primary mt-3 w-full text-sm disabled:opacity-50">{busy === "copilot" ? "Drafting..." : "Draft with AI"}</button>
          </div>
          <div className="rounded-xl bg-mist p-4 text-xs leading-relaxed text-slate-500">The answer key stays on the server; learners are scored server-side. Publish to make it runnable.</div>
        </div>
      </div>
    </div>
  );
}
