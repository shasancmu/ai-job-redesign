"use client";

import { streamSpec } from "@/lib/specStreamClient";
import SaveState from "@/components/SaveState";
import { useDraftAutosave } from "@/components/useDraftAutosave";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { validateAnalyticalSpec } from "@/lib/mechanics/analyticalStore";

export default function AnalyticalEditor({ me, initial, initialStatus }: { me: string; initial: any; initialStatus?: string }) {
  const supabase = createClient();
  const [spec, setSpec] = useState<any>(initial);
  // Autosave the draft as it changes, so work is never lost to a stray click.
  const autosave = useDraftAutosave({ table: "analytical_specs", slug: spec?.slug, ownerId: me, spec: spec });
  const [status, setStatus] = useState(initialStatus || "draft");
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [intent, setIntent] = useState("");

  const set = (p: any) => setSpec((s: any) => ({ ...s, ...p }));
  const levels: any[] = spec.levels || [];
  const setLevel = (i: number, p: any) => setSpec((s: any) => { const a = [...(s.levels || [])]; a[i] = { ...a[i], ...p }; return { ...s, levels: a }; });
  const addLevel = () => setSpec((s: any) => ({ ...s, levels: [...(s.levels || []), { key: `L${(s.levels || []).length}`, label: "", desc: "", value: 50 }] }));

  function validate() { const e = validateAnalyticalSpec(spec); setErrors(e); setMsg(e.length ? "" : "Valid ✓"); return e; }

  async function copilot() {
    if (!intent.trim()) return;
    setBusy("copilot"); setMsg(""); setErrors([]);
    try {
      const draft = await streamSpec("/api/mechanics/analytical-copilot", { intent, currentSpec: spec });
      setSpec(draft); setErrors([]); setMsg("Draft ready ✓"); setIntent("");
    } catch (e: any) { setErrors([e?.message || "Copilot failed."]); }
    finally { setBusy(""); }
  }

  async function save(nextStatus?: string) {
    const e = validate(); if (e.length) { setMsg(""); return; }
    const st = nextStatus ?? status;
    setBusy("save"); setMsg("");
    const { error } = await supabase.from("analytical_specs").upsert({ slug: spec.slug, version: 1, owner_id: me, status: st, spec, updated_at: new Date().toISOString() }, { onConflict: "slug,version" });
    setBusy("");
    if (error) { const missing = /does not exist|relation|schema cache/i.test(error.message || ""); setErrors([missing ? "Nothing saved: the analytical_specs table isn't set up yet. An admin needs to run the setup migration." : `Save failed: ${error.message}`]); return; }
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
        {spec.slug && <Link href={`/x/${spec.slug}`} target="_blank" className="btn-ghost text-sm">Open full run →</Link>}
        {msg && <span className="text-sm text-sage">{msg}</span>}
      </div>
      {errors.length > 0 && <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"><div className="font-semibold">{errors.length} to fix:</div><ul className="mt-1 list-disc pl-5">{errors.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-[60px_1fr_140px] gap-2">
            <div><label className="lbl">Emoji</label><input className="field text-center text-xl" value={spec.emoji || ""} onChange={(e) => set({ emoji: e.target.value })} /></div>
            <div><label className="lbl">Name</label><input className="field" value={spec.name || ""} onChange={(e) => set({ name: e.target.value })} /></div>
            <div><label className="lbl">Slug</label><input className="field font-mono text-sm" value={spec.slug || ""} onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="lbl">Subject (what's analyzed)</label><input className="field text-sm" value={spec.subject || ""} onChange={(e) => set({ subject: e.target.value })} placeholder="a job / a strategy memo" /></div>
            <div><label className="lbl">Unit label</label><input className="field text-sm" value={spec.unitLabel || ""} onChange={(e) => set({ unitLabel: e.target.value })} placeholder="task / claim / risk" /></div>
          </div>
          <div><label className="lbl">What the learner provides</label><input className="field text-sm" value={spec.setupLabel || ""} onChange={(e) => set({ setupLabel: e.target.value })} placeholder="Paste the job description" /><input className="field mt-1 text-xs" value={spec.setupPlaceholder || ""} onChange={(e) => set({ setupPlaceholder: e.target.value })} placeholder="placeholder / example" /></div>
          <div><label className="lbl">How to decompose into units</label><textarea className="field text-sm" rows={2} value={spec.decompose || ""} onChange={(e) => set({ decompose: e.target.value })} placeholder="Break the role into its distinct tasks." /></div>
          <div><label className="lbl">The lens / rubric (optional)</label><textarea className="field text-sm" rows={2} value={spec.lens || ""} onChange={(e) => set({ lens: e.target.value })} placeholder="Score each task by how exposed it is to current AI: could a model do it well today?" /></div>
          <div><label className="lbl">Aggregate label</label><input className="field text-sm w-64" value={spec.aggregateLabel || ""} onChange={(e) => set({ aggregateLabel: e.target.value })} placeholder="Overall AI exposure" /></div>
          <div>
            <label className="lbl">Scoring levels (low value → high value)</label>
            <div className="mt-1 space-y-1.5">
              {levels.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className="field w-16 font-mono text-xs" value={l.key || ""} onChange={(e) => setLevel(i, { key: e.target.value.replace(/[^a-zA-Z0-9]/g, "") })} placeholder="key" />
                  <input className="field w-28 text-sm" value={l.label || ""} onChange={(e) => setLevel(i, { label: e.target.value })} placeholder="label" />
                  <input className="field flex-1 text-xs" value={l.desc || ""} onChange={(e) => setLevel(i, { desc: e.target.value })} placeholder="what this level means" />
                  <input type="number" className="field w-16 text-right text-xs" value={l.value ?? ""} onChange={(e) => setLevel(i, { value: Number(e.target.value) || 0 })} />
                  <button onClick={() => setSpec((s: any) => ({ ...s, levels: s.levels.filter((_: any, k: number) => k !== i) }))} className="text-slate-300 hover:text-red-500">✕</button>
                </div>
              ))}
              <button onClick={addLevel} className="btn-ghost text-sm">+ Add level</button>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="card p-4">
            <div className="text-sm font-semibold text-ink">✨ Copilot</div>
            <p className="mt-1 text-xs text-slate-500">Describe what to analyze and the scale. It writes the decomposition + levels.</p>
            <textarea className="field mt-2 text-sm" rows={4} value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="e.g. An AI-exposure X-ray of a job: break it into tasks and score each None / Assisted / Automatable." />
            <button onClick={copilot} disabled={busy === "copilot" || !intent.trim()} className="btn-primary mt-3 w-full text-sm disabled:opacity-50">{busy === "copilot" ? "Drafting..." : "Draft with AI"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
