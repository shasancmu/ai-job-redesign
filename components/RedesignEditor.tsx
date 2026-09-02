"use client";

import SaveState from "@/components/SaveState";
import { useDraftAutosave } from "@/components/useDraftAutosave";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { validateRedesignSpec } from "@/lib/mechanics/redesignStore";

export default function RedesignEditor({ me, initial, initialStatus }: { me: string; initial: any; initialStatus?: string }) {
  const supabase = createClient();
  const [spec, setSpec] = useState<any>(initial);
  // Autosave the draft as it changes, so work is never lost to a stray click.
  const autosave = useDraftAutosave({ table: "redesign_specs", slug: spec?.slug, ownerId: me, spec: spec });
  const [status, setStatus] = useState(initialStatus || "draft");
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [intent, setIntent] = useState("");

  const set = (p: any) => setSpec((s: any) => ({ ...s, ...p }));
  const buckets: any[] = spec.buckets || [];
  const setB = (i: number, p: any) => setSpec((s: any) => { const a = [...(s.buckets || [])]; a[i] = { ...a[i], ...p }; return { ...s, buckets: a }; });
  const addB = (role: string) => setSpec((s: any) => ({ ...s, buckets: [...(s.buckets || []), { key: `b${(s.buckets || []).length + 1}`, label: "", role, hint: "" }] }));

  function validate() { const e = validateRedesignSpec(spec); setErrors(e); setMsg(e.length ? "" : "Valid ✓"); return e; }

  async function copilot() {
    if (!intent.trim()) return;
    setBusy("copilot"); setMsg(""); setErrors([]);
    try {
      const res = await fetch("/api/mechanics/redesign-copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent, currentSpec: spec }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.spec) setErrors([d.error || "The copilot couldn't produce a spec."]);
      else { setSpec(d.spec); setErrors(d.errors || []); setMsg(d.errors?.length ? "Draft ready (warnings)" : "Draft ready ✓"); setIntent(""); }
    } catch (e: any) { setErrors([e?.message || "Copilot failed."]); }
    finally { setBusy(""); }
  }

  async function save(nextStatus?: string) {
    const e = validate(); if (e.length) { setMsg(""); return; }
    const st = nextStatus ?? status;
    setBusy("save"); setMsg("");
    const { error } = await supabase.from("redesign_specs").upsert({ slug: spec.slug, version: 1, owner_id: me, status: st, spec, updated_at: new Date().toISOString() }, { onConflict: "slug,version" });
    setBusy("");
    if (error) { const missing = /does not exist|relation|schema cache/i.test(error.message || ""); setErrors([missing ? "Nothing saved: the redesign_specs table isn't set up yet. An admin needs to run the setup migration." : `Save failed: ${error.message}`]); return; }
    setStatus(st); setErrors([]); setMsg(nextStatus === "published" ? "Published ✓" : nextStatus === "draft" ? "Unpublished" : "Saved ✓");
  }

  const aiB = buckets.map((b, i) => ({ b, i })).filter((x) => x.b.role === "ai");
  const humanB = buckets.map((b, i) => ({ b, i })).filter((x) => x.b.role === "human");

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <button onClick={validate} className="btn-ghost text-sm">Validate</button>
        <button onClick={() => save()} disabled={busy === "save"} className="btn-primary text-sm">{busy === "save" ? "Saving..." : "Save"}</button>
        <SaveState state={autosave.state} savedAt={autosave.savedAt} />
        {status === "published" ? <button onClick={() => save("draft")} disabled={!!busy} className="btn-ghost text-sm">Unpublish</button> : <button onClick={() => save("published")} disabled={!!busy} className="btn-ghost text-sm text-sage">Publish</button>}
        {status === "published" && <span className="rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-semibold text-sage">Published</span>}
        {spec.slug && <Link href={`/rd/${spec.slug}`} target="_blank" className="btn-ghost text-sm">Open (pair up) →</Link>}
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
          <div><label className="lbl">Subject (what gets redesigned)</label><input className="field text-sm w-64" value={spec.subject || ""} onChange={(e) => set({ subject: e.target.value })} placeholder="job / workflow / research plan" /></div>
          <div><label className="lbl">Setup prompt (what each writes about their own)</label><textarea className="field text-sm" rows={2} value={spec.setupPrompt || ""} onChange={(e) => set({ setupPrompt: e.target.value })} /></div>
          <div><label className="lbl">Interview prompt (what the interviewer draws out)</label><textarea className="field text-sm" rows={2} value={spec.interviewPrompt || ""} onChange={(e) => set({ interviewPrompt: e.target.value })} /></div>
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <div><label className="lbl">Instrument title</label><input className="field text-sm" value={spec.splitTitle || ""} onChange={(e) => set({ splitTitle: e.target.value })} placeholder="The AI × Human split" /></div>
            <div><label className="lbl">Instrument intro (the framework)</label><input className="field text-sm" value={spec.splitIntro || ""} onChange={(e) => set({ splitIntro: e.target.value })} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[["ai", "Lean into AI", aiB], ["human", "Stay human", humanB]].map(([role, title, list]: any) => (
              <div key={role}>
                <div className="lbl">{title}</div>
                <div className="mt-1 space-y-1.5">
                  {list.map(({ b, i }: any) => (
                    <div key={i} className="rounded-lg border border-line p-2">
                      <div className="flex gap-2">
                        <input className="field w-20 font-mono text-xs" value={b.key || ""} onChange={(e) => setB(i, { key: e.target.value.replace(/[^a-zA-Z0-9]/g, "") })} placeholder="key" />
                        <input className="field flex-1 text-sm" value={b.label || ""} onChange={(e) => setB(i, { label: e.target.value })} placeholder="label" />
                        <button onClick={() => setSpec((s: any) => ({ ...s, buckets: s.buckets.filter((_: any, k: number) => k !== i) }))} className="text-slate-300 hover:text-red-500">✕</button>
                      </div>
                      <input className="field mt-1 text-xs" value={b.hint || ""} onChange={(e) => setB(i, { hint: e.target.value })} placeholder="one-line hint" />
                    </div>
                  ))}
                  <button onClick={() => addB(role)} className="text-xs font-semibold text-ai hover:underline">+ add {title}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="card p-4">
            <div className="text-sm font-semibold text-ink">✨ Copilot</div>
            <p className="mt-1 text-xs text-slate-500">Describe the redesign and its framework; it writes the prompts + buckets.</p>
            <textarea className="field mt-2 text-sm" rows={4} value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="e.g. Partners redesign each other's research workflow: what to delegate to AI (search, structure, draft) vs. keep human (judge, own, decide)." />
            <button onClick={copilot} disabled={busy === "copilot" || !intent.trim()} className="btn-primary mt-3 w-full text-sm disabled:opacity-50">{busy === "copilot" ? "Drafting..." : "Draft with AI"}</button>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">This is a live two-person experience. Test it with two browsers (start a room in one, join the code in the other) before assigning it.</div>
        </div>
      </div>
    </div>
  );
}
