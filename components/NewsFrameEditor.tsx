"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { validateNewsSpec } from "@/lib/mechanics/newsStore";

export default function NewsFrameEditor({ me, initial, initialStatus }: { me: string; initial: any; initialStatus?: string }) {
  const supabase = createClient();
  const [spec, setSpec] = useState<any>(initial);
  const [status, setStatus] = useState(initialStatus || "draft");
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [intent, setIntent] = useState("");

  const set = (p: any) => setSpec((s: any) => ({ ...s, ...p }));
  const fields: any[] = spec.fields || [];
  const setF = (i: number, p: any) => setSpec((s: any) => { const a = [...(s.fields || [])]; a[i] = { ...a[i], ...p }; return { ...s, fields: a }; });
  const addF = () => setSpec((s: any) => ({ ...s, fields: [...(s.fields || []), { key: `f${(s.fields || []).length + 1}`, label: "", hint: "" }] }));
  const opts: any[] = spec.verdict?.options || [];
  const setOpt = (i: number, p: any) => setSpec((s: any) => { const v = { ...(s.verdict || { label: "", options: [] }) }; const o = [...(v.options || [])]; o[i] = { ...o[i], ...p }; v.options = o; return { ...s, verdict: v }; });
  const addOpt = () => setSpec((s: any) => { const v = { ...(s.verdict || { label: "The call", options: [] }) }; v.options = [...(v.options || []), { value: "", label: "" }]; return { ...s, verdict: v }; });

  function validate() { const e = validateNewsSpec(spec); setErrors(e); setMsg(e.length ? "" : "Valid ✓"); return e; }

  async function copilot() {
    if (!intent.trim()) return;
    setBusy("copilot"); setMsg(""); setErrors([]);
    try {
      const res = await fetch("/api/mechanics/newsframe-copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent, currentSpec: spec }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.spec) setErrors([d.error || "The copilot couldn't produce a module."]);
      else { setSpec(d.spec); setErrors(d.errors || []); setMsg(d.errors?.length ? "Draft ready (warnings)" : "Draft ready ✓"); setIntent(""); }
    } catch (e: any) { setErrors([e?.message || "Copilot failed."]); }
    finally { setBusy(""); }
  }

  async function save(nextStatus?: string) {
    const e = validate(); if (e.length) { setMsg(""); return; }
    const st = nextStatus ?? status;
    setBusy("save"); setMsg("");
    const { error } = await supabase.from("newsframe_specs").upsert({ slug: spec.slug, version: 1, owner_id: me, status: st, spec, updated_at: new Date().toISOString() }, { onConflict: "slug,version" });
    setBusy("");
    if (error) { const missing = /does not exist|relation|schema cache/i.test(error.message || ""); setErrors([missing ? "Nothing saved: the newsframe_specs table isn't set up yet. An admin needs to run the setup migration." : `Save failed: ${error.message}`]); return; }
    setStatus(st); setErrors([]); setMsg(nextStatus === "published" ? "Published ✓" : nextStatus === "draft" ? "Unpublished" : "Saved ✓");
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <button onClick={validate} className="btn-ghost text-sm">Validate</button>
        <button onClick={() => save()} disabled={busy === "save"} className="btn-primary text-sm">{busy === "save" ? "Saving..." : "Save"}</button>
        {status === "published" ? <button onClick={() => save("draft")} disabled={!!busy} className="btn-ghost text-sm">Unpublish</button> : <button onClick={() => save("published")} disabled={!!busy} className="btn-ghost text-sm text-sage">Publish</button>}
        {status === "published" && <span className="rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-semibold text-sage">Published</span>}
        {spec.slug && <Link href={`/nf/${spec.slug}`} target="_blank" className="btn-ghost text-sm">Open full run →</Link>}
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
            <div><label className="lbl">News topic (the search query)</label><input className="field text-sm" value={spec.topic || ""} onChange={(e) => set({ topic: e.target.value })} placeholder="artificial intelligence business strategy" /></div>
            <div><label className="lbl">Framework</label><input className="field text-sm" value={spec.framework || ""} onChange={(e) => set({ framework: e.target.value })} placeholder="Porter's Five Forces" /></div>
          </div>
          <div><label className="lbl">How to apply the framework</label><textarea className="field text-sm" rows={3} value={spec.frameworkLogic || ""} onChange={(e) => set({ frameworkLogic: e.target.value })} placeholder="The five forces and what a rigorous read of each looks like." /></div>
          <div>
            <label className="lbl">Analysis fields (the framework's dimensions)</label>
            <div className="mt-1 space-y-1.5">
              {fields.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <input className="field w-24 font-mono text-xs" value={f.key || ""} onChange={(e) => setF(i, { key: e.target.value.replace(/[^a-zA-Z0-9]/g, "") })} placeholder="key" />
                  <input className="field w-40 text-sm" value={f.label || ""} onChange={(e) => setF(i, { label: e.target.value })} placeholder="label" />
                  <input className="field flex-1 text-xs" value={f.hint || ""} onChange={(e) => setF(i, { hint: e.target.value })} placeholder="what to look for" />
                  <button onClick={() => setSpec((s: any) => ({ ...s, fields: s.fields.filter((_: any, k: number) => k !== i) }))} className="text-slate-300 hover:text-red-500">✕</button>
                </div>
              ))}
              <button onClick={addF} className="btn-ghost text-sm">+ Add field</button>
            </div>
          </div>
          <div>
            <label className="lbl">The call (optional)</label>
            <input className="field text-sm" value={spec.verdict?.label || ""} onChange={(e) => setSpec((s: any) => ({ ...s, verdict: { ...(s.verdict || { options: [] }), label: e.target.value } }))} placeholder="Is this industry structurally attractive?" />
            <div className="mt-1 space-y-1">
              {opts.map((o, i) => (
                <div key={i} className="flex gap-2"><input className="field w-32 font-mono text-xs" value={o.value || ""} onChange={(e) => setOpt(i, { value: e.target.value })} placeholder="value" /><input className="field flex-1 text-sm" value={o.label || ""} onChange={(e) => setOpt(i, { label: e.target.value })} placeholder="what the learner sees" /></div>
              ))}
              <button onClick={addOpt} className="text-xs font-semibold text-ai hover:underline">+ option</button>
            </div>
          </div>
          <div><label className="lbl">Grading note</label><input className="field text-sm" value={spec.grading || ""} onChange={(e) => set({ grading: e.target.value })} placeholder="A strong application is specific to the story; a weak one is generic." /></div>
        </div>
        <div className="space-y-3">
          <div className="card p-4">
            <div className="text-sm font-semibold text-ink">✨ Copilot</div>
            <p className="mt-1 text-xs text-slate-500">Name a framework and a news beat; it writes the fields and the call.</p>
            <textarea className="field mt-2 text-sm" rows={4} value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="e.g. Apply Porter's Five Forces to current AI-industry news, ending in a call on whether the space is structurally attractive." />
            <button onClick={copilot} disabled={busy === "copilot" || !intent.trim()} className="btn-primary mt-3 w-full text-sm disabled:opacity-50">{busy === "copilot" ? "Drafting..." : "Draft with AI"}</button>
          </div>
          <div className="rounded-xl bg-mist p-4 text-xs leading-relaxed text-slate-500">Stories are pulled live each run, so this module never goes stale. Keyless by default; set NEWS_API_KEY for fuller article text.</div>
        </div>
      </div>
    </div>
  );
}
