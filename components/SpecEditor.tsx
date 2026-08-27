"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { validateSpec } from "@/lib/mechanics/roleplay";
import SpecPreview from "@/components/SpecPreview";
import ComponentLibrary from "@/components/ComponentLibrary";

// The authoring canvas: a structured, section-by-section editor over the spec
// OBJECT (never raw JSON, except the advanced escape hatch), with the Copilot
// inline and a live preview beside it. Create -> preview -> iterate, no code.

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "situation", label: "Situation" },
  { id: "character", label: "Character" },
  { id: "probes", label: "Probes" },
  { id: "scenarios", label: "Scenarios" },
  { id: "assessment", label: "Assessment" },
  { id: "insights", label: "📈 Insights" },
  { id: "ai", label: "✨ Copilot" },
  { id: "advanced", label: "Advanced" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const VALUES = ["high", "med", "low"] as const;
const STANCES = ["affirm", "hedge", "deny", "noncommittal"] as const;
const STANCE_HINT: Record<string, string> = {
  affirm: "True + favorable → states it plainly",
  hedge: "True + unfavorable → softens, won't quantify",
  deny: "False → truthfully denies",
  noncommittal: "Won't confirm or deny",
};

export default function SpecEditor({ me, initial, insights, initialStatus, cohorts, cohort }: { me: string; initial: any; insights?: any; initialStatus?: string; cohorts?: string[]; cohort?: string }) {
  const supabase = createClient();
  const [spec, setSpec] = useState<any>(initial);
  const [tab, setTab] = useState<TabId>("overview");
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState(initialStatus || "draft");

  // ---- immutable updaters -------------------------------------------------
  const patch = (p: any) => setSpec((s: any) => ({ ...s, ...p }));
  const setMeta = (p: any) => setSpec((s: any) => ({ ...s, meta: { ...(s.meta || {}), ...p } }));
  const setObjective = (p: any) => setSpec((s: any) => ({ ...s, objective: { ...(s.objective || {}), ...p } }));

  const charIdx = (spec.roles || []).findIndex((r: any) => r.kind === "character" || r.kind === "interviewer");
  const char = charIdx >= 0 ? spec.roles[charIdx] : null;
  const setChar = (p: any) => setSpec((s: any) => {
    const roles = [...(s.roles || [])];
    const i = roles.findIndex((r: any) => r.kind === "character" || r.kind === "interviewer");
    if (i >= 0) roles[i] = { ...roles[i], ...p };
    return { ...s, roles };
  });

  const probes: any[] = spec.probes || [];
  const setProbe = (i: number, p: any) => setSpec((s: any) => { const a = [...(s.probes || [])]; a[i] = { ...a[i], ...p }; return { ...s, probes: a }; });
  const addProbe = () => setSpec((s: any) => ({ ...s, probes: [...(s.probes || []), { key: `probe${(s.probes || []).length + 1}`, label: "" }] }));
  const removeProbe = (i: number) => setSpec((s: any) => ({ ...s, probes: (s.probes || []).filter((_: any, j: number) => j !== i) }));

  const scenarios: any[] = spec.scenarios || [];
  const setScn = (i: number, p: any) => setSpec((s: any) => { const a = [...(s.scenarios || [])]; a[i] = { ...a[i], ...p }; return { ...s, scenarios: a }; });
  const addScn = () => setSpec((s: any) => ({ ...s, scenarios: [...(s.scenarios || []), { id: `scenario${(s.scenarios || []).length + 1}`, label: "", truth: "", narrative: "", tell: "", foil: "", dimensions: [] }] }));
  const removeScn = (i: number) => setSpec((s: any) => ({ ...s, scenarios: (s.scenarios || []).filter((_: any, j: number) => j !== i) }));
  // set one dimension (keyed by probe) inside a scenario, creating it if absent
  const setDim = (si: number, probeKey: string, p: any) => setSpec((s: any) => {
    const a = [...(s.scenarios || [])];
    const dims = [...(a[si].dimensions || [])];
    const di = dims.findIndex((d: any) => d.probe === probeKey);
    if (di >= 0) dims[di] = { ...dims[di], ...p };
    else dims.push({ probe: probeKey, value: "med", stance: "hedge", answer: "", ...p });
    a[si] = { ...a[si], dimensions: dims };
    return { ...s, scenarios: a };
  });
  const dimFor = (scn: any, probeKey: string) => (scn.dimensions || []).find((d: any) => d.probe === probeKey) || {};

  // verdict lives inside the flow step of kind "verdict"
  const verdictStepIdx = (spec.flow || []).findIndex((p: any) => p.kind === "verdict");
  const verdictFields: any[] = verdictStepIdx >= 0 ? (spec.flow[verdictStepIdx].verdict || []) : [];
  const choiceField = verdictFields.find((f: any) => f.type === "choice");
  const setChoiceOption = (oi: number, p: any) => setSpec((s: any) => {
    const flow = [...(s.flow || [])];
    const vf = [...(flow[verdictStepIdx].verdict || [])];
    const ci = vf.findIndex((f: any) => f.type === "choice");
    const opts = [...(vf[ci].options || [])]; opts[oi] = { ...opts[oi], ...p };
    vf[ci] = { ...vf[ci], options: opts }; flow[verdictStepIdx] = { ...flow[verdictStepIdx], verdict: vf };
    return { ...s, flow };
  });
  const addChoiceOption = () => setSpec((s: any) => {
    const flow = [...(s.flow || [])];
    const vf = [...(flow[verdictStepIdx].verdict || [])];
    const ci = vf.findIndex((f: any) => f.type === "choice");
    vf[ci] = { ...vf[ci], options: [...(vf[ci].options || []), { value: "", label: "" }] };
    flow[verdictStepIdx] = { ...flow[verdictStepIdx], verdict: vf };
    return { ...s, flow };
  });
  const setRubric = (p: any) => setSpec((s: any) => ({ ...s, rubric: { ...(s.rubric || {}), ...p } }));

  // ---- actions ------------------------------------------------------------
  function validate() { const e = validateSpec(spec); setErrors(e); setMsg(e.length ? "" : "Valid ✓"); return e; }

  const [intent, setIntent] = useState("");
  const [source, setSource] = useState("");

  async function onPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { setErrors(["PDF is too large (max 15MB)."]); return; }
    setBusy("pdf"); setMsg(""); setErrors([]);
    try {
      const b64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = () => rej(new Error("read failed")); r.readAsDataURL(file); });
      const resp = await fetch("/api/mechanics/pdf-source", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pdf: b64, name: file.name }) });
      const d = await resp.json().catch(() => ({}));
      if (!resp.ok || !d.summary) { setErrors([d.error || "Couldn't read that PDF."]); }
      else { setSource((s) => (s.trim() ? s + "\n\n" + d.summary : d.summary)); setMsg(`Summarized ${file.name} ✓ (the file isn't stored)`); }
    } catch (err: any) { setErrors([err?.message || "PDF upload failed."]); }
    finally { setBusy(""); }
  }
  async function copilot() {
    if (!intent.trim()) return;
    setBusy("copilot"); setMsg(""); setErrors([]);
    try {
      const res = await fetch("/api/mechanics/copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent, sourceText: source, currentSpec: spec }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.spec) setErrors([d.error || "The copilot couldn't produce a spec."]);
      else { setSpec(d.spec); setErrors(d.errors || []); setMsg(d.errors?.length ? "Draft ready (warnings below)" : "Draft ready ✓"); setIntent(""); setTab("overview"); }
    } catch (e: any) { setErrors([e?.message || "Copilot failed."]); }
    finally { setBusy(""); }
  }

  async function save(nextStatus?: string) {
    const e = validate(); if (e.length) { setMsg(""); return; }
    const st = nextStatus ?? status;
    setBusy(nextStatus === "published" ? "publish" : nextStatus === "draft" ? "unpublish" : "save"); setMsg("");
    const { error } = await supabase.from("module_specs").upsert({ slug: spec.slug, version: 1, owner_id: me, status: st, spec, updated_at: new Date().toISOString() }, { onConflict: "slug,version" });
    setBusy("");
    if (!error) setStatus(st);
    setMsg(error ? `Save failed: ${error.message}` : nextStatus === "published" ? "Published ✓ — now assignable to a class" : nextStatus === "draft" ? "Unpublished" : "Saved ✓");
  }

  // advanced raw JSON, kept in sync
  const [rawText, setRawText] = useState<string | null>(null);
  const rawValue = rawText ?? JSON.stringify(spec, null, 2);
  function onRaw(v: string) {
    setRawText(v);
    try { const parsed = JSON.parse(v); setSpec(parsed); setErrors([]); } catch { setErrors(["The JSON is invalid — the form and preview show the last valid version."]); }
  }

  const slug = spec?.slug || "";

  return (
    <div className="mt-5">
      {/* action bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <button onClick={validate} className="btn-ghost text-sm">Validate</button>
        <button onClick={() => save()} disabled={busy === "save"} className="btn-primary text-sm">{busy === "save" ? "Saving..." : "Save"}</button>
        {status === "published"
          ? <button onClick={() => save("draft")} disabled={!!busy} className="btn-ghost text-sm">{busy === "unpublish" ? "..." : "Unpublish"}</button>
          : <button onClick={() => save("published")} disabled={!!busy} className="btn-ghost text-sm text-sage">{busy === "publish" ? "Publishing..." : "Publish"}</button>}
        {status === "published" && <span className="rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-semibold text-sage">Published</span>}
        {slug && <Link href={`/m/${slug}`} target="_blank" className="btn-ghost text-sm">Open full run →</Link>}
        {msg && <span className="text-sm text-sage">{msg}</span>}
        <span className="ml-auto text-xs text-slate-400">{scenarios.length} scenario{scenarios.length === 1 ? "" : "s"} · {probes.length} probe{probes.length === 1 ? "" : "s"}</span>
      </div>

      {errors.length > 0 && (
        <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <div className="font-semibold">{errors.length} thing{errors.length === 1 ? "" : "s"} to fix:</div>
          <ul className="mt-1 list-disc pl-5">{errors.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}

      {/* tabs */}
      <div className="mt-3 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-full px-3 py-1 text-sm transition ${tab === t.id ? "bg-ink text-white" : "text-slate2 hover:bg-mist"}`}>{t.label}</button>
        ))}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          {/* ---------------- OVERVIEW ---------------- */}
          {tab === "overview" && (
            <>
              <div className="grid grid-cols-[70px_1fr] gap-3">
                <div><label className="lbl">Emoji</label><input className="field text-center text-2xl" value={spec.meta?.emoji || ""} onChange={(e) => setMeta({ emoji: e.target.value })} /></div>
                <div><label className="lbl">Name</label><input className="field" value={spec.meta?.name || ""} onChange={(e) => setMeta({ name: e.target.value })} placeholder="The Earnings Call" /></div>
              </div>
              <div><label className="lbl">Tagline</label><input className="field" value={spec.meta?.tagline || ""} onChange={(e) => setMeta({ tagline: e.target.value })} placeholder="One line on what the learner does and why it matters." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="lbl">Audience</label><input className="field" value={spec.meta?.audience || ""} onChange={(e) => setMeta({ audience: e.target.value })} placeholder="MBA / exec finance" /></div>
                <div><label className="lbl">Minutes</label><input type="number" className="field" value={spec.meta?.minutes ?? ""} onChange={(e) => setMeta({ minutes: Number(e.target.value) || undefined })} /></div>
              </div>
              <div><label className="lbl">Slug (the URL, lowercase-with-dashes)</label><input className="field font-mono text-sm" value={spec.slug || ""} onChange={(e) => patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="earnings-call" /></div>
              <div><label className="lbl">Learning goal — what they get better at</label><textarea className="field text-sm" rows={2} value={spec.objective?.goal || ""} onChange={(e) => setObjective({ goal: e.target.value })} /></div>
              <div><label className="lbl">The aha — the transferable lesson</label><textarea className="field text-sm" rows={2} value={spec.objective?.aha || ""} onChange={(e) => setObjective({ aha: e.target.value })} /></div>
            </>
          )}

          {/* ---------------- SITUATION ---------------- */}
          {tab === "situation" && (
            <>
              <div>
                <label className="lbl">The situation (everyone sees this)</label>
                <p className="mb-1 text-xs text-slate-400">The public setup: the company, the person, the numbers on the table. No hidden truth here.</p>
                <textarea className="field text-sm" rows={12} value={spec.world || ""} onChange={(e) => patch({ world: e.target.value })} />
              </div>
              {(spec.flow || []).filter((p: any) => p.kind === "brief").map((b: any) => {
                const bi = spec.flow.indexOf(b);
                return (
                  <div key={bi}>
                    <label className="lbl">The assignment (the learner's task)</label>
                    <textarea className="field text-sm" rows={4} value={b.intro || ""} onChange={(e) => setSpec((s: any) => { const flow = [...s.flow]; flow[bi] = { ...flow[bi], intro: e.target.value }; return { ...s, flow }; })} />
                  </div>
                );
              })}
            </>
          )}

          {/* ---------------- CHARACTER ---------------- */}
          {tab === "character" && char && (
            <>
              <ComponentLibrary me={me} kind="character" label="character"
                summarize={(d) => d?.name || d?.persona || "character"}
                getData={() => ({ name: char.name, persona: char.persona, behavior: char.behavior })}
                onInsert={(d) => setChar({ name: d.name ?? char.name, persona: d.persona, behavior: d.behavior })} />
              <div><label className="lbl">Character name</label><input className="field" value={char.name || ""} onChange={(e) => setChar({ name: e.target.value })} placeholder="Daniel Voss" /></div>
              <div><label className="lbl">Persona — voice and personality</label><textarea className="field text-sm" rows={3} value={char.persona || ""} onChange={(e) => setChar({ persona: e.target.value })} placeholder="Confident, media-trained founder-CEO who believes in the company." /></div>
              <div>
                <label className="lbl">Behavior contract — the immutable rules</label>
                <p className="mb-1 text-xs text-slate-400">How the character handles the truth. The engine enforces this. Never lies; affirms true-favorable facts, hedges true-unfavorable ones, declines what isn't true.</p>
                <textarea className="field text-sm" rows={8} value={char.behavior || ""} onChange={(e) => setChar({ behavior: e.target.value })} />
              </div>
            </>
          )}
          {tab === "character" && !char && <p className="text-sm text-slate-500">No character role defined. Use the Copilot or the Advanced tab to add one.</p>}

          {/* ---------------- PROBES ---------------- */}
          {tab === "probes" && (
            <>
              <p className="text-sm text-slate-500">The cuts a learner can probe — the same set of topics across every scenario. The <em>answer</em> to each moves per scenario; that's what makes it un-memorizable.</p>
              {probes.map((p, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-line p-2">
                  <input className="field w-32 font-mono text-xs" value={p.key || ""} onChange={(e) => setProbe(i, { key: e.target.value.replace(/[^a-zA-Z0-9]/g, "") })} placeholder="key" />
                  <input className="field flex-1 text-sm" value={p.label || ""} onChange={(e) => setProbe(i, { label: e.target.value })} placeholder="The question a sharp learner would ask" />
                  <button onClick={() => removeProbe(i)} className="mt-1 text-slate-300 hover:text-red-500" title="Remove">✕</button>
                </div>
              ))}
              <button onClick={addProbe} className="btn-ghost text-sm">+ Add probe</button>
            </>
          )}

          {/* ---------------- SCENARIOS ---------------- */}
          {tab === "scenarios" && (
            <>
              <ComponentLibrary me={me} kind="scenario-set" label="scenario set"
                summarize={(d) => `${d?.probes?.length || 0} probes · ${d?.scenarios?.length || 0} scenarios`}
                getData={() => ({ probes: spec.probes || [], scenarios: spec.scenarios || [] })}
                onInsert={(d) => setSpec((s: any) => ({ ...s, probes: d.probes || [], scenarios: d.scenarios || [] }))} />
              <p className="text-sm text-slate-500">The hidden truths. Learners are assigned one at random from the session code and never told which. Give each the same probes, with different answers, and include one that's genuinely ambiguous.</p>
              {probes.length === 0 && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Define your probes first — scenarios answer them.</div>}
              {scenarios.map((scn, si) => (
                <details key={si} className="rounded-xl border border-line" open={scenarios.length <= 2}>
                  <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-ink">
                    <span className="mr-2">🎭</span>{scn.label || scn.id || `Scenario ${si + 1}`}
                    <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-[11px] font-normal text-slate-500">truth: {scn.truth || "—"}</span>
                    <button onClick={(e) => { e.preventDefault(); removeScn(si); }} className="float-right text-slate-300 hover:text-red-500">✕</button>
                  </summary>
                  <div className="space-y-3 border-t border-line p-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div><label className="lbl">Id</label><input className="field font-mono text-xs" value={scn.id || ""} onChange={(e) => setScn(si, { id: e.target.value.replace(/[^a-zA-Z0-9]/g, "") })} /></div>
                      <div><label className="lbl">Label</label><input className="field text-sm" value={scn.label || ""} onChange={(e) => setScn(si, { label: e.target.value })} /></div>
                      <div><label className="lbl">Truth (the correct call)</label><input className="field text-sm" value={scn.truth || ""} onChange={(e) => setScn(si, { truth: e.target.value })} placeholder="stuffing / clean / cant_tell" /></div>
                    </div>
                    <div><label className="lbl">Hidden narrative (character + examiner only)</label><textarea className="field text-sm" rows={3} value={scn.narrative || ""} onChange={(e) => setScn(si, { narrative: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="lbl">The tell — what actually discriminated it</label><textarea className="field text-xs" rows={2} value={scn.tell || ""} onChange={(e) => setScn(si, { tell: e.target.value })} /></div>
                      <div><label className="lbl">The naive-AI wrong read</label><textarea className="field text-xs" rows={2} value={scn.foil || ""} onChange={(e) => setScn(si, { foil: e.target.value })} /></div>
                    </div>
                    {/* dimensions keyed to probes */}
                    <div>
                      <div className="lbl">How the character answers each probe here</div>
                      <div className="mt-1 space-y-2">
                        {probes.map((p) => { const d = dimFor(scn, p.key); return (
                          <div key={p.key} className="rounded-lg bg-mist/60 p-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-ink">{p.label || p.key}</span>
                              <select className="field h-7 w-24 py-0 text-xs" value={d.value || ""} onChange={(e) => setDim(si, p.key, { value: e.target.value })}>
                                <option value="">value</option>{VALUES.map((v) => <option key={v} value={v}>{v}</option>)}
                              </select>
                              <select className="field h-7 w-36 py-0 text-xs" value={d.stance || ""} onChange={(e) => setDim(si, p.key, { stance: e.target.value })} title={STANCE_HINT[d.stance] || ""}>
                                <option value="">stance</option>{STANCES.map((v) => <option key={v} value={v}>{v}</option>)}
                              </select>
                              {d.stance && <span className="text-[10px] text-slate-400">{STANCE_HINT[d.stance]}</span>}
                            </div>
                            <textarea className="field mt-1 text-xs" rows={2} value={d.answer || ""} onChange={(e) => setDim(si, p.key, { answer: e.target.value })} placeholder="The character's private truth and exactly how to deliver it." />
                          </div>
                        ); })}
                        {probes.length === 0 && <p className="text-xs text-slate-400">Add probes to fill in answers.</p>}
                      </div>
                    </div>
                  </div>
                </details>
              ))}
              <button onClick={addScn} className="btn-ghost text-sm">+ Add scenario</button>
            </>
          )}

          {/* ---------------- ASSESSMENT ---------------- */}
          {tab === "assessment" && (
            <>
              <div>
                <div className="lbl">The verdict the learner commits to</div>
                {choiceField ? (
                  <div className="mt-1 space-y-2">
                    {(choiceField.options || []).map((o: any, oi: number) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input className="field w-40 font-mono text-xs" value={o.value || ""} onChange={(e) => setChoiceOption(oi, { value: e.target.value })} placeholder="value" />
                        <input className="field flex-1 text-sm" value={o.label || ""} onChange={(e) => setChoiceOption(oi, { label: e.target.value })} placeholder="What the learner sees" />
                      </div>
                    ))}
                    <button onClick={addChoiceOption} className="btn-ghost text-sm">+ Add option</button>
                  </div>
                ) : <p className="text-xs text-slate-400">No choice field in the verdict step. Edit it in Advanced.</p>}
              </div>
              <ComponentLibrary me={me} kind="rubric" label="rubric"
                summarize={(d) => (d?.output?.length ? `${d.output.length} graded fields` : "rubric")}
                getData={() => spec.rubric || {}}
                onInsert={(d) => setSpec((s: any) => ({ ...s, rubric: d }))} />
              <div>
                <label className="lbl">How the examiner grades (performance, not the guess)</label>
                <p className="mb-1 text-xs text-slate-400">Grade the quality of their questions and the calibration of their verdict, not whether they guessed the label.</p>
                <textarea className="field text-sm" rows={6} value={spec.rubric?.instructions || ""} onChange={(e) => setRubric({ instructions: e.target.value })} />
              </div>
            </>
          )}

          {/* ---------------- INSIGHTS ---------------- */}
          {tab === "insights" && (
            <>
              <p className="text-sm text-slate-500">How learners actually do on this module. Every graded run feeds this, so you can see where the experience is landing and fix it.</p>
              {cohorts && cohorts.length > 0 && slug && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-400">Class:</span>
                  <a href={`/studio/roleplay/${slug}`} className={`rounded-full px-2 py-0.5 ${!cohort ? "bg-ink text-white" : "bg-mist text-slate-600"}`}>All</a>
                  {cohorts.map((c) => (
                    <a key={c} href={`/studio/roleplay/${slug}?cohort=${encodeURIComponent(c)}`} className={`rounded-full px-2 py-0.5 ${cohort === c ? "bg-ink text-white" : "bg-mist text-slate-600"}`}>{c}</a>
                  ))}
                </div>
              )}
              {!insights || insights.runs === 0 ? (
                <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-slate-400">
                  No graded runs yet.{insights === null || insights === undefined ? " Save the module first, then share it." : ""} Once learners run it, you'll see their scores, calibration, and which probes they miss.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-line bg-white p-3 text-center"><div className="text-2xl font-bold text-ink">{insights.runs}</div><div className="text-[11px] text-slate-500">runs</div></div>
                    <div className="rounded-xl border border-line bg-white p-3 text-center"><div className="text-2xl font-bold text-ink">{insights.avgScore ?? "—"}</div><div className="text-[11px] text-slate-500">avg score</div></div>
                    <div className="rounded-xl border border-line bg-white p-3 text-center"><div className="text-2xl font-bold text-ink">{insights.correctPct != null ? `${insights.correctPct}%` : "—"}</div><div className="text-[11px] text-slate-500">right call</div></div>
                  </div>

                  {insights.weakest && insights.weakest.askRate < 50 && (
                    <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                      <span className="font-semibold">Only {insights.weakest.askRate}% of learners probed “{insights.weakest.label}”</span>, even though it's decisive in at least one scenario. If the tell is too buried, learners can't find it. Sharpen the brief, the character's opener, or that scenario's answers.
                      <button onClick={() => setTab("scenarios")} className="mt-2 block text-amber-900 underline">Improve the scenarios →</button>
                    </div>
                  )}

                  {insights.calibration?.length > 0 && (
                    <div>
                      <div className="lbl">Calibration</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {insights.calibration.map((c: any) => (
                          <span key={c.label} className="rounded-full bg-mist px-2 py-1 text-xs text-slate-600">{c.label}: <span className="font-semibold">{c.count}</span></span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="lbl">Probe coverage — how often learners ask each cut</div>
                    <div className="mt-2 space-y-1.5">
                      {insights.probes.map((p: any) => (
                        <div key={p.key} className="flex items-center gap-2">
                          <div className="w-40 shrink-0 truncate text-xs text-slate-600" title={p.label}>{p.label}{p.highValue && <span className="ml-1 text-[10px] font-semibold text-clay">key</span>}</div>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist"><div className={`h-full rounded-full ${p.highValue && p.askRate < 50 ? "bg-clay" : "bg-sage"}`} style={{ width: `${p.askRate}%` }} /></div>
                          <div className="w-9 shrink-0 text-right text-xs tabular-nums text-slate-500">{p.askRate}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ---------------- COPILOT ---------------- */}
          {tab === "ai" && (
            <div className="card p-4">
              <div className="text-sm font-semibold text-ink">✨ Build or edit with AI</div>
              <p className="mt-1 text-xs text-slate-500">Describe the module you want, or tell it what to change. It drafts or edits the whole spec, and the form and preview update in place.</p>
              <textarea className="field mt-2 text-sm" rows={4} value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="Build an earnings-call-style module where students detect channel stuffing at a pharma company. Or: make the CEO hedge harder on the allowance question." />
              <div className="mt-3 flex items-center justify-between gap-2">
                <label className="lbl mb-0">Source material (optional)</label>
                <label className={`cursor-pointer rounded-full bg-white px-2.5 py-1 text-xs font-medium shadow-sm ${busy === "pdf" ? "text-slate-400" : "text-ink hover:text-ai"}`}>
                  {busy === "pdf" ? "Reading PDF..." : "＋ Upload a PDF"}
                  <input type="file" accept="application/pdf" className="hidden" onChange={onPdf} disabled={busy === "pdf"} />
                </label>
              </div>
              <textarea className="field text-xs" rows={5} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Paste a case, framework, or rubric, or upload a PDF above." />
              <p className="mt-1 text-[11px] text-slate-400">A PDF is converted to a short summary with a fast model and added above. The file and its full text are never stored.</p>
              <button onClick={copilot} disabled={busy === "copilot" || !intent.trim()} className="btn-primary mt-3 w-full text-sm disabled:opacity-50">{busy === "copilot" ? "Drafting..." : "Draft with AI"}</button>
            </div>
          )}

          {/* ---------------- ADVANCED ---------------- */}
          {tab === "advanced" && (
            <>
              <p className="text-sm text-slate-500">The full spec as JSON — for guardrails, flow, report layout, and rubric output fields. Edits here flow back to the form.</p>
              <textarea className="field font-mono text-xs" style={{ minHeight: "58vh" }} value={rawValue} onChange={(e) => onRaw(e.target.value)} spellCheck={false} onBlur={() => setRawText(null)} />
            </>
          )}
        </div>

        {/* live preview */}
        <SpecPreview spec={spec} />
      </div>
    </div>
  );
}
