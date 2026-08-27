"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validateLiveSpec } from "@/lib/mechanics/liveStore";

const KINDS = [
  { key: "wordcloud", label: "Word cloud", hint: "Short phrases build into a live cloud." },
  { key: "poll", label: "Poll", hint: "Pick one option; results shown as live bars." },
  { key: "responses", label: "Open responses", hint: "Longer answers; the AI can synthesize the room." },
];

export default function LiveEditor({ me, initial, initialStatus }: { me: string; initial: any; initialStatus?: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [spec, setSpec] = useState<any>(initial);
  const [status, setStatus] = useState(initialStatus || "draft");
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  const set = (p: any) => setSpec((s: any) => ({ ...s, ...p }));
  const options: string[] = spec.options || [];

  function validate() { const e = validateLiveSpec(spec); setErrors(e); setMsg(e.length ? "" : "Valid ✓"); return e; }

  async function save(nextStatus?: string) {
    const e = validate(); if (e.length) { setMsg(""); return; }
    const st = nextStatus ?? status;
    setBusy("save"); setMsg("");
    const { error } = await supabase.from("live_specs").upsert({ slug: spec.slug, version: 1, owner_id: me, status: st, spec, updated_at: new Date().toISOString() }, { onConflict: "slug,version" });
    setBusy("");
    if (error) { const missing = /does not exist|relation|schema cache/i.test(error.message || ""); setErrors([missing ? "Nothing saved: the live_specs table isn't set up yet. An admin needs to run the setup migration." : `Save failed: ${error.message}`]); return; }
    setStatus(st); setErrors([]); setMsg(nextStatus === "published" ? "Published ✓" : nextStatus === "draft" ? "Unpublished" : "Saved ✓");
  }

  async function runLive() {
    const e = validate(); if (e.length) return;
    setBusy("run");
    // ensure saved so the run can resolve the spec
    await supabase.from("live_specs").upsert({ slug: spec.slug, version: 1, owner_id: me, status, spec, updated_at: new Date().toISOString() }, { onConflict: "slug,version" });
    const res = await fetch("/api/live/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: spec.slug }) });
    const d = await res.json().catch(() => ({}));
    setBusy("");
    if (d.code) router.push(`/live/host/${d.code}`);
    else setErrors([d.error || "Couldn't open a room."]);
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <button onClick={validate} className="btn-ghost text-sm">Validate</button>
        <button onClick={() => save()} disabled={busy === "save"} className="btn-primary text-sm">{busy === "save" ? "Saving..." : "Save"}</button>
        {status === "published" ? <button onClick={() => save("draft")} disabled={!!busy} className="btn-ghost text-sm">Unpublish</button> : <button onClick={() => save("published")} disabled={!!busy} className="btn-ghost text-sm text-sage">Publish</button>}
        {status === "published" && <span className="rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-semibold text-sage">Published</span>}
        <button onClick={runLive} disabled={!!busy} className="btn-ghost text-sm text-ai">{busy === "run" ? "Opening…" : "▶ Run live"}</button>
        {msg && <span className="text-sm text-sage">{msg}</span>}
      </div>
      {errors.length > 0 && <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"><div className="font-semibold">{errors.length} to fix:</div><ul className="mt-1 list-disc pl-5">{errors.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}

      <div className="mt-4 max-w-2xl space-y-4">
        <div className="grid grid-cols-[60px_1fr_140px] gap-2">
          <div><label className="lbl">Emoji</label><input className="field text-center text-xl" value={spec.emoji || ""} onChange={(e) => set({ emoji: e.target.value })} /></div>
          <div><label className="lbl">Name</label><input className="field" value={spec.name || ""} onChange={(e) => set({ name: e.target.value })} /></div>
          <div><label className="lbl">Slug</label><input className="field font-mono text-sm" value={spec.slug || ""} onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></div>
        </div>
        <div>
          <label className="lbl">Activity type</label>
          <div className="mt-1 grid gap-2 sm:grid-cols-3">
            {KINDS.map((k) => (
              <button key={k.key} onClick={() => set({ kind: k.key })} className={`rounded-xl border p-3 text-left text-sm ${spec.kind === k.key ? "border-ink bg-ink/5" : "border-line hover:bg-mist"}`}>
                <div className="font-semibold text-ink">{k.label}</div><div className="text-xs text-slate-500">{k.hint}</div>
              </button>
            ))}
          </div>
        </div>
        <div><label className="lbl">The prompt the room sees</label><textarea className="field text-sm" rows={2} value={spec.prompt || ""} onChange={(e) => set({ prompt: e.target.value })} placeholder="e.g. In one word, how does AI make you feel about your job?" /></div>
        {spec.kind === "poll" && (
          <div>
            <label className="lbl">Options</label>
            <div className="mt-1 space-y-1">
              {options.map((o, i) => (
                <div key={i} className="flex gap-2"><input className="field flex-1 text-sm" value={o} onChange={(e) => set({ options: options.map((x, k) => (k === i ? e.target.value : x)) })} placeholder={`Option ${i + 1}`} /><button onClick={() => set({ options: options.filter((_, k) => k !== i) })} className="text-slate-300 hover:text-red-500">✕</button></div>
              ))}
              <button onClick={() => set({ options: [...options, ""] })} className="text-xs font-semibold text-ai hover:underline">+ option</button>
            </div>
          </div>
        )}
        {(spec.kind === "responses" || spec.kind === "wordcloud") && (
          <div>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={spec.synthesize !== false} onChange={(e) => set({ synthesize: e.target.checked })} /> Offer an AI synthesis of the room</label>
            {spec.synthesize !== false && <textarea className="field mt-1 text-sm" rows={2} value={spec.synthesizePrompt || ""} onChange={(e) => set({ synthesizePrompt: e.target.value })} placeholder="How the AI should read the room (optional)" />}
          </div>
        )}
      </div>
    </div>
  );
}
