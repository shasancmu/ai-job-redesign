"use client";

import { streamSpec } from "@/lib/specStreamClient";
import SaveState from "@/components/SaveState";
import { useDraftAutosave } from "@/components/useDraftAutosave";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { validateNegScenario } from "@/lib/mechanics/negStore";

// Structured editor for an authored negotiation, with the copilot inline.
export default function NegEditor({ me, initial, initialStatus }: { me: string; initial: any; initialStatus?: string }) {
  const supabase = createClient();
  const [scn, setScn] = useState<any>(initial);
  // Autosave the draft as it changes, so work is never lost to a stray click.
  const autosave = useDraftAutosave({ table: "negotiation_specs", slug: scn?.slug, ownerId: me, spec: scn });
  const [status, setStatus] = useState(initialStatus || "draft");
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [intent, setIntent] = useState("");

  const set = (p: any) => setScn((s: any) => ({ ...s, ...p }));
  const multi = scn.kind === "multi-issue";
  const issues: any[] = scn.issues || [];
  const setIssue = (i: number, p: any) => setScn((s: any) => { const a = [...(s.issues || [])]; a[i] = { ...a[i], ...p }; return { ...s, issues: a }; });
  const setOpt = (ii: number, oi: number, p: any) => setScn((s: any) => { const a = [...(s.issues || [])]; const opts = [...(a[ii].options || [])]; opts[oi] = { ...opts[oi], ...p }; a[ii] = { ...a[ii], options: opts }; return { ...s, issues: a }; });
  const addIssue = () => setScn((s: any) => ({ ...s, issues: [...(s.issues || []), { key: `issue${(s.issues || []).length + 1}`, label: "", options: [{ label: "", you: 0, them: 0 }, { label: "", you: 0, them: 0 }] }] }));
  const addOpt = (ii: number) => setScn((s: any) => { const a = [...(s.issues || [])]; a[ii] = { ...a[ii], options: [...(a[ii].options || []), { label: "", you: 0, them: 0 }] }; return { ...s, issues: a }; });

  function validate() { const e = validateNegScenario(scn); setErrors(e); setMsg(e.length ? "" : "Valid ✓"); return e; }

  async function copilot() {
    if (!intent.trim()) return;
    setBusy("copilot"); setMsg(""); setErrors([]);
    try {
      const draft = await streamSpec("/api/mechanics/negotiation-copilot", { intent, currentSpec: scn });
      setScn(draft); setErrors([]); setMsg("Draft ready ✓"); setIntent("");
    } catch (e: any) { setErrors([e?.message || "Copilot failed."]); }
    finally { setBusy(""); }
  }

  async function save(nextStatus?: string) {
    const e = validate(); if (e.length) { setMsg(""); return; }
    const st = nextStatus ?? status;
    setBusy("save"); setMsg("");
    const { error } = await supabase.from("negotiation_specs").upsert({ slug: scn.slug, version: 1, owner_id: me, status: st, spec: scn, updated_at: new Date().toISOString() }, { onConflict: "slug,version" });
    setBusy("");
    if (error) { const missing = /does not exist|relation|schema cache/i.test(error.message || ""); setErrors([missing ? "Nothing saved: the negotiation_specs table isn't set up yet. An admin needs to run the setup migration." : `Save failed: ${error.message}`]); return; }
    setStatus(st); setErrors([]);
    setMsg(nextStatus === "published" ? "Published ✓" : nextStatus === "draft" ? "Unpublished" : "Saved ✓");
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <button onClick={validate} className="btn-ghost text-sm">Validate</button>
        <button onClick={() => save()} disabled={busy === "save"} className="btn-primary text-sm">{busy === "save" ? "Saving..." : "Save"}</button>
        <SaveState state={autosave.state} savedAt={autosave.savedAt} />
        {status === "published"
          ? <button onClick={() => save("draft")} disabled={!!busy} className="btn-ghost text-sm">Unpublish</button>
          : <button onClick={() => save("published")} disabled={!!busy} className="btn-ghost text-sm text-sage">Publish</button>}
        {status === "published" && <span className="rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-semibold text-sage">Published</span>}
        {scn.slug && <Link href={`/n/${scn.slug}`} target="_blank" className="btn-ghost text-sm">Open full run →</Link>}
        {msg && <span className="text-sm text-sage">{msg}</span>}
      </div>

      {errors.length > 0 && (
        <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <div className="font-semibold">{errors.length} thing{errors.length === 1 ? "" : "s"} to fix:</div>
          <ul className="mt-1 list-disc pl-5">{errors.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div><label className="lbl">Name</label><input className="field" value={scn.name || ""} onChange={(e) => set({ name: e.target.value })} /></div>
            <div><label className="lbl">Slug</label><input className="field font-mono text-sm" value={scn.slug || ""} onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="lbl">Counterpart</label><input className="field text-sm" value={scn.counterpartName || ""} onChange={(e) => set({ counterpartName: e.target.value })} /></div>
            <div><label className="lbl">Your role</label><input className="field text-sm" value={scn.youRole || ""} onChange={(e) => set({ youRole: e.target.value })} placeholder="the Candidate" /></div>
            <div><label className="lbl">Their role</label><input className="field text-sm" value={scn.themRole || ""} onChange={(e) => set({ themRole: e.target.value })} placeholder="the Hiring Manager" /></div>
          </div>
          <div><label className="lbl">The situation (the learner sees this)</label><textarea className="field text-sm" rows={4} value={scn.scenario || ""} onChange={(e) => set({ scenario: e.target.value })} /></div>

          {multi ? (
            <>
              <div><label className="lbl">Your BATNA (walk-away score)</label><input type="number" className="field w-40 text-sm" value={scn.yourBatna ?? ""} onChange={(e) => set({ yourBatna: Number(e.target.value) || 0 })} /></div>
              <div>
                <label className="lbl">Issues & payoffs (your points / their points)</label>
                <p className="mb-1 text-xs text-slate-400">Vary the structure: some issues both want the same (compatible), some pure win-lose (distributive), some weighted oppositely so trading creates value (integrative).</p>
                <div className="space-y-2">
                  {issues.map((iss, ii) => (
                    <div key={ii} className="rounded-xl border border-line p-2">
                      <div className="flex gap-2">
                        <input className="field w-28 font-mono text-xs" value={iss.key || ""} onChange={(e) => setIssue(ii, { key: e.target.value.replace(/[^a-zA-Z0-9]/g, "") })} placeholder="key" />
                        <input className="field flex-1 text-sm" value={iss.label || ""} onChange={(e) => setIssue(ii, { label: e.target.value })} placeholder="Issue label, e.g. Base salary" />
                        <button onClick={() => setScn((s: any) => ({ ...s, issues: s.issues.filter((_: any, k: number) => k !== ii) }))} className="text-slate-300 hover:text-red-500">✕</button>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400"><span className="flex-1">Option</span><span className="w-16 text-right">You</span><span className="w-16 text-right">Them</span></div>
                        {(iss.options || []).map((o: any, oi: number) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input className="field flex-1 text-xs" value={o.label || ""} onChange={(e) => setOpt(ii, oi, { label: e.target.value })} placeholder="e.g. $120k" />
                            <input type="number" className="field w-16 text-right text-xs" value={o.you ?? ""} onChange={(e) => setOpt(ii, oi, { you: Number(e.target.value) || 0 })} />
                            <input type="number" className="field w-16 text-right text-xs" value={o.them ?? ""} onChange={(e) => setOpt(ii, oi, { them: Number(e.target.value) || 0 })} />
                          </div>
                        ))}
                        <button onClick={() => addOpt(ii)} className="text-xs font-semibold text-ai hover:underline">+ option</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={addIssue} className="btn-ghost text-sm">+ Add issue</button>
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div><label className="lbl">Learner role</label><select className="field text-sm" value={scn.role || "buyer"} onChange={(e) => set({ role: e.target.value })}><option value="buyer">buyer</option><option value="seller">seller</option></select></div>
              <div><label className="lbl">Item</label><input className="field text-sm" value={scn.item || ""} onChange={(e) => set({ item: e.target.value })} /></div>
              <div><label className="lbl">Your reservation</label><input type="number" className="field text-sm" value={scn.yourReservation ?? ""} onChange={(e) => set({ yourReservation: Number(e.target.value) || 0 })} /></div>
              <div><label className="lbl">Their reservation (hidden)</label><input type="number" className="field text-sm" value={scn.theirReservation ?? ""} onChange={(e) => set({ theirReservation: Number(e.target.value) || 0 })} /></div>
              <div><label className="lbl">List price</label><input type="number" className="field text-sm" value={scn.listPrice ?? ""} onChange={(e) => set({ listPrice: Number(e.target.value) || 0 })} /></div>
              <div><label className="lbl">Unit</label><input className="field text-sm" value={scn.unit || "$"} onChange={(e) => set({ unit: e.target.value })} /></div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="card p-4">
            <div className="text-sm font-semibold text-ink">✨ Copilot</div>
            <p className="mt-1 text-xs text-slate-500">Describe the negotiation, or ask for a change. It writes the payoff tables.</p>
            <textarea className="field mt-2 text-sm" rows={4} value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="e.g. A procurement negotiation over price, volume, payment terms, warranty, and delivery, where the buyer and seller weight terms oppositely so trades pay off." />
            <button onClick={copilot} disabled={busy === "copilot" || !intent.trim()} className="btn-primary mt-3 w-full text-sm disabled:opacity-50">{busy === "copilot" ? "Drafting..." : "Draft with AI"}</button>
          </div>
          <div className="rounded-xl bg-mist p-4 text-xs leading-relaxed text-slate-500">
            The counterpart's points are the hidden scoresheet the AI plays to. Learners never see them; the reveal comes in the score. Publish to make it assignable.
          </div>
        </div>
      </div>
    </div>
  );
}
