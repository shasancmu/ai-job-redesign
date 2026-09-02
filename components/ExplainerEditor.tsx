"use client";

import { streamSpec } from "@/lib/specStreamClient";
import SaveState from "@/components/SaveState";
import { useDraftAutosave } from "@/components/useDraftAutosave";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { validateExplainerSpec } from "@/lib/mechanics/explainerStore";

export default function ExplainerEditor({ me, initial, initialStatus }: { me: string; initial: any; initialStatus?: string }) {
  const supabase = createClient();
  const [spec, setSpec] = useState<any>(initial);
  // Autosave the draft as it changes, so work is never lost to a stray click.
  const autosave = useDraftAutosave({ table: "explainer_specs", slug: spec?.slug, ownerId: me, spec: spec });
  const [status, setStatus] = useState(initialStatus || "draft");
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [intent, setIntent] = useState("");

  const set = (p: any) => setSpec((s: any) => ({ ...s, ...p }));
  const sections: any[] = spec.sections || [];
  const setSec = (i: number, p: any) => setSpec((s: any) => { const a = [...(s.sections || [])]; a[i] = { ...a[i], ...p }; return { ...s, sections: a }; });
  const addSec = () => setSpec((s: any) => ({ ...s, sections: [...(s.sections || []), { title: "", body: "", key: [] }] }));

  function validate() { const e = validateExplainerSpec(spec); setErrors(e); setMsg(e.length ? "" : "Valid ✓"); return e; }

  async function copilot() {
    if (!intent.trim()) return;
    setBusy("copilot"); setMsg(""); setErrors([]);
    try {
      const draft = await streamSpec("/api/mechanics/explainer-copilot", { intent, currentSpec: spec });
      setSpec(draft); setErrors([]); setMsg("Draft ready ✓"); setIntent("");
    } catch (e: any) { setErrors([e?.message || "Copilot failed."]); }
    finally { setBusy(""); }
  }

  async function save(nextStatus?: string) {
    const e = validate(); if (e.length) { setMsg(""); return; }
    const st = nextStatus ?? status;
    setBusy("save"); setMsg("");
    const { error } = await supabase.from("explainer_specs").upsert({ slug: spec.slug, version: 1, owner_id: me, status: st, spec, updated_at: new Date().toISOString() }, { onConflict: "slug,version" });
    setBusy("");
    if (error) { const missing = /does not exist|relation|schema cache/i.test(error.message || ""); setErrors([missing ? "Nothing saved: the explainer_specs table isn't set up yet. An admin needs to run the setup migration." : `Save failed: ${error.message}`]); return; }
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
        {spec.slug && <Link href={`/e/${spec.slug}`} target="_blank" className="btn-ghost text-sm">Open full run →</Link>}
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
          <div><label className="lbl">Subject</label><input className="field text-sm" value={spec.subject || ""} onChange={(e) => set({ subject: e.target.value })} /></div>
          <div><label className="lbl">Intro (the hook)</label><textarea className="field text-sm" rows={2} value={spec.intro || ""} onChange={(e) => set({ intro: e.target.value })} /></div>
          <div>
            <label className="lbl">Sections</label>
            <div className="mt-1 space-y-2">
              {sections.map((s, i) => (
                <div key={i} className="rounded-xl border border-line p-3">
                  <div className="flex gap-2">
                    <input className="field flex-1 text-sm font-semibold" value={s.title || ""} onChange={(e) => setSec(i, { title: e.target.value })} placeholder="Section title" />
                    <button onClick={() => setSpec((sp: any) => ({ ...sp, sections: sp.sections.filter((_: any, k: number) => k !== i) }))} className="text-slate-300 hover:text-red-500">✕</button>
                  </div>
                  <textarea className="field mt-2 text-sm" rows={3} value={s.body || ""} onChange={(e) => setSec(i, { body: e.target.value })} placeholder="Teach the idea plainly, with an example." />
                  <input className="field mt-2 text-xs" value={(s.key || []).join(" · ")} onChange={(e) => setSec(i, { key: e.target.value.split("·").map((x: string) => x.trim()).filter(Boolean) })} placeholder="Key points, separated by ·" />
                  <input className="field mt-1 text-xs" value={s.check || ""} onChange={(e) => setSec(i, { check: e.target.value })} placeholder="A think-about-it question (optional)" />
                </div>
              ))}
              <button onClick={addSec} className="btn-ghost text-sm">+ Add section</button>
            </div>
          </div>
          <div><label className="lbl">Takeaway</label><input className="field text-sm" value={spec.takeaway || ""} onChange={(e) => set({ takeaway: e.target.value })} /></div>
        </div>
        <div className="space-y-3">
          <div className="card p-4">
            <div className="text-sm font-semibold text-ink">✨ Copilot</div>
            <p className="mt-1 text-xs text-slate-500">Describe the topic or paste notes; it structures the walkthrough.</p>
            <textarea className="field mt-2 text-sm" rows={4} value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="e.g. Explain how channel stuffing works and how to spot it, in 5 sections." />
            <button onClick={copilot} disabled={busy === "copilot" || !intent.trim()} className="btn-primary mt-3 w-full text-sm disabled:opacity-50">{busy === "copilot" ? "Drafting..." : "Draft with AI"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
