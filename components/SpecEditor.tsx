"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { validateSpec } from "@/lib/mechanics/roleplay";

export default function SpecEditor({ me, initial }: { me: string; initial: any }) {
  const supabase = createClient();
  const [json, setJson] = useState(() => JSON.stringify(initial, null, 2));
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  // Copilot
  const [intent, setIntent] = useState("");
  const [source, setSource] = useState("");

  function parse(): any | null { try { return JSON.parse(json); } catch { setErrors(["The JSON is invalid — check for a missing comma or brace."]); return null; } }

  function validate() {
    const s = parse(); if (!s) return;
    const e = validateSpec(s); setErrors(e); setMsg(e.length ? "" : "Valid ✓");
  }

  async function copilot() {
    if (!intent.trim()) return;
    setBusy("copilot"); setMsg(""); setErrors([]);
    let current: any = null; try { current = JSON.parse(json); } catch {}
    try {
      const res = await fetch("/api/mechanics/copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent, sourceText: source, currentSpec: current }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.spec) { setErrors([d.error || "The copilot couldn't produce a spec."]); }
      else { setJson(JSON.stringify(d.spec, null, 2)); setErrors(d.errors || []); setMsg(d.errors?.length ? "Draft ready (with warnings below)" : "Draft ready ✓"); setIntent(""); }
    } catch (e: any) { setErrors([e?.message || "Copilot failed."]); }
    finally { setBusy(""); }
  }

  async function save() {
    const s = parse(); if (!s) return;
    const e = validateSpec(s); setErrors(e);
    if (e.length) { setMsg(""); return; }
    setBusy("save"); setMsg("");
    const { error } = await supabase.from("module_specs").upsert({ slug: s.slug, version: 1, owner_id: me, status: "draft", spec: s, updated_at: new Date().toISOString() }, { onConflict: "slug,version" });
    setBusy("");
    setMsg(error ? `Save failed: ${error.message}` : "Saved ✓");
  }

  let slug = ""; try { slug = JSON.parse(json).slug; } catch {}

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button onClick={validate} className="btn-ghost text-sm">Validate</button>
          <button onClick={save} disabled={busy === "save"} className="btn-primary text-sm">{busy === "save" ? "Saving..." : "Save"}</button>
          {slug && <Link href={`/m/${slug}`} target="_blank" className="btn-ghost text-sm">Preview →</Link>}
          {msg && <span className="text-sm text-sage">{msg}</span>}
        </div>
        <textarea className="field font-mono text-xs" style={{ minHeight: "62vh" }} value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} />
        {errors.length > 0 && (
          <div className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <div className="font-semibold">{errors.length} issue{errors.length === 1 ? "" : "s"}:</div>
            <ul className="mt-1 list-disc pl-5">{errors.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="card p-4">
          <div className="text-sm font-semibold text-ink">✨ Copilot</div>
          <p className="mt-1 text-xs text-slate-500">Describe what you want, or tell it what to change. It drafts or edits the whole spec.</p>
          <textarea className="field mt-2 text-sm" rows={4} value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="e.g. Build an earnings-call-style module where students detect channel stuffing at a pharma company. Or: make the CEO hedge more on the allowance question." />
          <label className="lbl mt-3">Source material (optional)</label>
          <textarea className="field text-xs" rows={4} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Paste a case, framework, or rubric to ground it in." />
          <button onClick={copilot} disabled={busy === "copilot" || !intent.trim()} className="btn-primary mt-3 w-full text-sm disabled:opacity-50">{busy === "copilot" ? "Drafting..." : "Draft with AI"}</button>
        </div>
        <div className="rounded-xl bg-mist p-4 text-xs leading-relaxed text-slate-500">
          Flow: describe it to the Copilot → it drafts the spec → Validate → Save → Preview. Iterate by telling the Copilot what to change. Uploads of PDFs come next; for now paste the source text.
        </div>
      </div>
    </div>
  );
}
