"use client";

import { useEffect, useRef, useState } from "react";
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
  { id: "critique", label: "🔍 Critique" },
  { id: "playtest", label: "🧪 Playtest" },
  { id: "history", label: "🕘 History" },
  { id: "ai", label: "✨ Copilot" },
  { id: "advanced", label: "Advanced" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const STORY_TOOLS = [
  { id: "ai", label: "✨ Copilot" },
  { id: "critique", label: "🔍 Critique" },
  { id: "playtest", label: "🧪 Playtest" },
  { id: "insights", label: "📈 Insights" },
  { id: "history", label: "🕘 History" },
] as const;
const PLAYTEST_COLS = [
  { k: "strong", label: "Strong learner" },
  { k: "weak", label: "Weak learner" },
] as const;

const VALUES = ["high", "med", "low"] as const;
const STANCES = ["affirm", "hedge", "deny", "noncommittal"] as const;
const STANCE_HINT: Record<string, string> = {
  affirm: "True + favorable → states it plainly",
  hedge: "True + unfavorable → softens, won't quantify",
  deny: "False → truthfully denies",
  noncommittal: "Won't confirm or deny",
};

export default function SpecEditor({ me, initial, insights, initialStatus, cohorts, cohort, tier }: { me: string; initial: any; insights?: any; initialStatus?: string; cohorts?: string[]; cohort?: string; tier?: string }) {
  const supabase = createClient();
  const [spec, setSpecRaw] = useState<any>(initial);
  // Undo/redo: every structural change is reversible, so authors experiment
  // without fear. Field-level text undo still works inside inputs (we don't
  // hijack Cmd+Z there).
  const past = useRef<any[]>([]);
  const future = useRef<any[]>([]);
  const setSpec = (updater: any) => setSpecRaw((prev: any) => {
    const next = typeof updater === "function" ? updater(prev) : updater;
    if (next !== prev) { past.current.push(prev); if (past.current.length > 60) past.current.shift(); future.current = []; }
    return next;
  });
  const undo = () => setSpecRaw((cur: any) => { if (!past.current.length) return cur; future.current.push(cur); return past.current.pop(); });
  const redo = () => setSpecRaw((cur: any) => { if (!future.current.length) return cur; past.current.push(cur); return future.current.pop(); });
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return; // let fields keep native undo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [tab, setTab] = useState<TabId>("overview");
  const [view, setView] = useState<"story" | "fields">("story");
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState(initialStatus || "draft");
  const [history, setHistory] = useState<any[] | null>(null);

  useEffect(() => {
    if (tab === "history" && history === null && spec?.slug) {
      supabase.from("module_spec_versions").select("id, spec, label, created_at").eq("slug", spec.slug).order("created_at", { ascending: false }).limit(50).then(({ data }) => setHistory(data || []));
    }
    // Proactive: the critic runs itself the first time you open Critique, and
    // whenever the spec has meaningfully changed since the last critique.
    if (tab === "critique" && !busy && (critique === null || critiqueStamp.current !== specStamp())) runCritique();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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
  // Flow-step conveniences for the storyboard beats.
  const convBudget = ((spec.flow || []).find((f: any) => f.kind === "converse") || {}).budget;
  const setBudget = (v: number) => setSpec((s: any) => { const flow = [...(s.flow || [])]; const i = flow.findIndex((f: any) => f.kind === "converse"); if (i >= 0) flow[i] = { ...flow[i], budget: v }; return { ...s, flow }; });
  const briefIntro = ((spec.flow || []).find((f: any) => f.kind === "brief") || {}).intro;
  const setBriefIntro = (v: string) => setSpec((s: any) => { const flow = [...(s.flow || [])]; const i = flow.findIndex((f: any) => f.kind === "brief"); if (i >= 0) { flow[i] = { ...flow[i], intro: v }; return { ...s, flow }; } return s; });

  // ---- actions ------------------------------------------------------------
  function validate() { const e = validateSpec(spec); setErrors(e); setMsg(e.length ? "" : "Valid ✓"); return e; }

  const [intent, setIntent] = useState("");
  const [source, setSource] = useState("");
  const [critique, setCritique] = useState<any>(null);
  const critiqueStamp = useRef<string>("");
  const specStamp = () => `${JSON.stringify(spec).length}:${spec.scenarios?.length || 0}:${spec.probes?.length || 0}`;

  async function runCritique() {
    setBusy("critique"); setMsg("");
    const stamp = specStamp();
    try {
      const res = await fetch("/api/mechanics/critic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.result) setErrors([d.error || "The critic couldn't finish."]);
      else { setCritique(d.result); critiqueStamp.current = stamp; }
    } catch (e: any) { setErrors([e?.message || "Critique failed."]); }
    finally { setBusy(""); }
  }

  // ---- Deployment scope (the visibility ladder) ---------------------------
  const [promoteMsg, setPromoteMsg] = useState("");
  const [promoteMissing, setPromoteMissing] = useState<string[]>([]);
  async function nominate(t: "org" | "global") {
    setPromoteMsg(""); setPromoteMissing([]); setBusy("promote");
    try {
      const res = await fetch("/api/mechanics/promote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "roleplay", slug: spec.slug, tier: t, criticReady: critique?.readiness === "ready", playtestSeparates: !!playtest?.separates }) });
      const d = await res.json().catch(() => ({}));
      if (res.status === 422) { setPromoteMissing(d.missing || ["Not eligible yet."]); }
      else if (!res.ok) { setPromoteMissing([d.error || "Couldn't submit."]); }
      else { setPromoteMsg(t === "global" ? "Submitted for global review ✓ — a curator will decide." : "Submitted for org-wide review ✓ — a director will decide."); }
    } catch (e: any) { setPromoteMissing([e?.message || "Failed."]); }
    finally { setBusy(""); }
  }

  const [playtest, setPlaytest] = useState<any>(null);
  async function runPlaytest() {
    setBusy("playtest"); setMsg(""); setErrors([]);
    try {
      const res = await fetch("/api/mechanics/playtest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.strong) setErrors([d.error || "The playtest couldn't finish."]);
      else setPlaytest(d);
    } catch (e: any) { setErrors([e?.message || "Playtest failed."]); }
    finally { setBusy(""); }
  }

  // The matrix + per-scenario editors, shared by the Scenarios tab and the
  // storyboard's hidden-layer track.
  function scenarioEditors() {
    return (
      <>
        {probes.length > 0 && scenarios.length > 0 && <ScenarioMatrix probes={probes} scenarios={scenarios} />}
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
    );
  }

  // Findings whose text touches a given section, so the critique comes to you.
  function sectionFindings(re: RegExp): any[] {
    return (critique?.findings || []).filter((f: any) => re.test(`${f.area} ${f.title} ${f.detail}`.toLowerCase()));
  }
  function SectionCritique({ re }: { re: RegExp }) {
    const fs = sectionFindings(re);
    if (!fs.length) return null;
    return (
      <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
        <span className="font-semibold">🔍 The critic flagged {fs.length} issue{fs.length > 1 ? "s" : ""} here:</span>
        <ul className="mt-1 list-disc pl-4">{fs.map((f, i) => <li key={i}>{f.title}{f.fix ? <> — <span className="text-amber-800">{f.fix}</span></> : null}</li>)}</ul>
      </div>
    );
  }

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
    // Proactive gate: don't let a module ship over known high-severity critique.
    if (nextStatus === "published") {
      const highs = (critique?.findings || []).filter((f: any) => f.severity === "high");
      if (highs.length && !window.confirm(`The Critique flagged ${highs.length} high-severity issue${highs.length > 1 ? "s" : ""}:\n\n${highs.map((f: any) => "• " + f.title).join("\n")}\n\nPublish anyway?`)) { setMsg(""); return; }
    }
    const st = nextStatus ?? status;
    setBusy(nextStatus === "published" ? "publish" : nextStatus === "draft" ? "unpublish" : "save"); setMsg("");
    const { error } = await supabase.from("module_specs").upsert({ slug: spec.slug, version: 1, owner_id: me, status: st, spec, updated_at: new Date().toISOString() }, { onConflict: "slug,version" });
    setBusy(""); setMsg("");
    if (error) {
      const missing = /does not exist|relation|schema cache/i.test(error.message || "");
      setErrors([missing
        ? "Nothing was saved: the role-play tables aren't set up in the database yet. An admin needs to run the setup migration in Supabase. Until then your changes won't persist."
        : `Save failed: ${error.message}`]);
      return;
    }
    setStatus(st); setErrors([]);
    // Snapshot this save into version history (best effort), and refresh the tab.
    supabase.from("module_spec_versions").insert({ slug: spec.slug, owner_id: me, spec, label: nextStatus === "published" ? "published" : null }).then(() => setHistory(null), () => {});
    setMsg(nextStatus === "published" ? "Published ✓ — now assignable to a class" : nextStatus === "draft" ? "Unpublished" : "Saved ✓");
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
        <button onClick={undo} disabled={past.current.length === 0} title="Undo (⌘Z)" className="btn-ghost text-sm disabled:opacity-40">↶</button>
        <button onClick={redo} disabled={future.current.length === 0} title="Redo (⇧⌘Z)" className="btn-ghost text-sm disabled:opacity-40">↷</button>
        <button onClick={validate} className="btn-ghost text-sm">Validate</button>
        <button onClick={() => save()} disabled={busy === "save"} className="btn-primary text-sm">{busy === "save" ? "Saving..." : "Save"}</button>
        {status === "published"
          ? <button onClick={() => save("draft")} disabled={!!busy} className="btn-ghost text-sm">{busy === "unpublish" ? "..." : "Unpublish"}</button>
          : <button onClick={() => save("published")} disabled={!!busy} className="btn-ghost text-sm text-sage">{busy === "publish" ? "Publishing..." : "Publish"}</button>}
        {status === "published" && <span className="rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-semibold text-sage">Published</span>}
        {spec.lineage?.forkedFromName && <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] text-slate-500">Adapted from {spec.lineage.forkedFromName}</span>}
        {slug && <Link href={`/m/${slug}`} target="_blank" className="btn-ghost text-sm">Open full run →</Link>}
        {msg && <span className="text-sm text-sage">{msg}</span>}
        <span className="ml-auto text-xs text-slate-400">{scenarios.length} scenario{scenarios.length === 1 ? "" : "s"} · {probes.length} probe{probes.length === 1 ? "" : "s"}</span>
      </div>

      {/* Deployment scope — the visibility ladder */}
      {status === "published" && slug && (
        <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Deployment</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tier === "global" ? "bg-ai/10 text-ai" : tier === "org" ? "bg-sage-soft text-sage" : "bg-mist text-slate-600"}`}>{tier === "global" ? "🌐 Everywhere" : tier === "org" ? "🏢 Your organization" : "👤 Your own classes"}</span>
            <span className="text-xs text-slate-400">Published modules stay in your own classes until promoted.</span>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => nominate("org")} disabled={!!busy} className="btn-ghost text-sm">Promote org-wide</button>
              <button onClick={() => nominate("global")} disabled={!!busy} className="btn-ghost text-sm text-ai">Nominate for everyone</button>
            </div>
          </div>
          {promoteMsg && <p className="mt-2 text-sm text-sage">{promoteMsg}</p>}
          {promoteMissing.length > 0 && (
            <div className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
              <div className="font-semibold">To reach everyone, clear these first:</div>
              <ul className="mt-1 list-disc pl-4">{promoteMissing.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <div className="font-semibold">{errors.length} thing{errors.length === 1 ? "" : "s"} to fix:</div>
          <ul className="mt-1 list-disc pl-5">{errors.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}

      {/* view toggle + quick tools */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-line p-0.5 text-sm">
          <button onClick={() => setView("story")} className={`rounded-full px-3 py-1 ${view === "story" ? "bg-ink text-white" : "text-slate2"}`}>Storyboard</button>
          <button onClick={() => setView("fields")} className={`rounded-full px-3 py-1 ${view === "fields" ? "bg-ink text-white" : "text-slate2"}`}>Fields</button>
        </div>
        {view === "story" && (
          <div className="flex flex-wrap gap-1">
            {STORY_TOOLS.map((tt) => (
              <button key={tt.id} onClick={() => { setView("fields"); setTab(tt.id as TabId); }} className="rounded-full px-2.5 py-1 text-xs text-slate2 hover:bg-mist">
                {tt.label}{tt.id === "critique" && (critique?.findings?.length || 0) > 0 && <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${(critique?.findings || []).some((f: any) => f.severity === "high") ? "bg-red-500 text-white" : "bg-amber-soft text-amber"}`}>{critique.findings.length}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === "fields" && (
      <>
      {/* tabs */}
      <div className="mt-3 flex flex-wrap gap-1">
        {TABS.map((t) => {
          const n = t.id === "critique" ? (critique?.findings?.length || 0) : 0;
          const hasHigh = t.id === "critique" && (critique?.findings || []).some((f: any) => f.severity === "high");
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-full px-3 py-1 text-sm transition ${tab === t.id ? "bg-ink text-white" : "text-slate2 hover:bg-mist"}`}>
              {t.label}{n > 0 && <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${hasHigh ? "bg-red-500 text-white" : "bg-amber-soft text-amber"}`}>{n}</span>}
            </button>
          );
        })}
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
              <SectionCritique re={/character|behavior|contract|persona|leak|lie/} />
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
              <SectionCritique re={/scenario|probe|tell|discrimin|ambig|separate|leak/} />
              <ComponentLibrary me={me} kind="scenario-set" label="scenario set"
                summarize={(d) => `${d?.probes?.length || 0} probes · ${d?.scenarios?.length || 0} scenarios`}
                getData={() => ({ probes: spec.probes || [], scenarios: spec.scenarios || [] })}
                onInsert={(d) => setSpec((s: any) => ({ ...s, probes: d.probes || [], scenarios: d.scenarios || [] }))} />
              <p className="text-sm text-slate-500">The hidden truths. Learners are assigned one at random from the session code and never told which. Give each the same probes, with different answers, and include one that's genuinely ambiguous.</p>
              {probes.length === 0 && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Define your probes first — scenarios answer them.</div>}
              {scenarioEditors()}
            </>
          )}

          {/* ---------------- ASSESSMENT ---------------- */}
          {tab === "assessment" && (
            <>
              <SectionCritique re={/rubric|grade|grading|verdict|calibrat|objective|score/} />
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
              {insights?.funnel?.some((s: any) => s.count > 0) && (
                <div className="rounded-2xl border border-line bg-white p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Where learners drop off</div>
                  <div className="mt-2 space-y-1.5">
                    {insights.funnel.map((s: any, i: number) => {
                      const start = insights.funnel[0]?.count || 0;
                      const pct = start ? Math.round((s.count / start) * 100) : 0;
                      const prev = i > 0 ? insights.funnel[i - 1].count : s.count;
                      const drop = prev - s.count;
                      return (
                        <div key={s.key} className="flex items-center gap-2">
                          <div className="w-28 shrink-0 truncate text-xs text-slate-600" title={s.label}>{s.label}</div>
                          <div className="h-3 flex-1 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full bg-ai" style={{ width: `${pct}%` }} /></div>
                          <div className="w-24 shrink-0 text-right text-xs tabular-nums text-slate-500">{s.count} · {pct}%{i > 0 && drop > 0 && <span className="text-clay"> (-{drop})</span>}</div>
                        </div>
                      );
                    })}
                  </div>
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

          {/* ---------------- CRITIQUE ---------------- */}
          {tab === "critique" && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-500">An adversarial read of your design before you publish: leaked tells, scenarios that don't separate, a rubric that grades the guess instead of the thinking.</p>
                <button onClick={runCritique} disabled={busy === "critique"} className="btn-primary shrink-0 text-sm">{busy === "critique" ? "Reading..." : "Run critique"}</button>
              </div>
              {critique && (
                <>
                  <div className={`rounded-xl p-3 text-sm ${critique.readiness === "ready" ? "bg-sage-soft text-sage" : critique.readiness === "not-ready" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-900"}`}>
                    <span className="font-semibold">{critique.readiness === "ready" ? "Looks ready ✓" : critique.readiness === "not-ready" ? "Not ready" : "Needs work"}</span>
                    {critique.summary && <span> — {critique.summary}</span>}
                  </div>
                  <div className="space-y-2">
                    {(critique.findings || []).length === 0 ? (
                      <p className="text-sm text-slate-500">No issues flagged. Nicely designed.</p>
                    ) : (critique.findings || []).map((f: any, i: number) => {
                      const sev = f.severity === "high" ? "border-red-300 bg-red-50" : f.severity === "medium" ? "border-amber-300 bg-amber-50" : "border-line bg-mist/50";
                      const dot = f.severity === "high" ? "bg-red-500" : f.severity === "medium" ? "bg-amber-500" : "bg-slate-400";
                      return (
                        <div key={i} className={`rounded-xl border p-3 ${sev}`}>
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{f.area || f.severity}</span>
                            <span className="text-sm font-semibold text-ink">{f.title}</span>
                          </div>
                          {f.detail && <p className="mt-1 text-sm text-slate-600">{f.detail}</p>}
                          {f.fix && <p className="mt-1 text-sm text-ink"><span className="font-semibold">Fix:</span> {f.fix}</p>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {!critique && busy !== "critique" && <p className="text-xs text-slate-400">Runs on the full spec, including the hidden scenarios, so it can check whether the tell actually holds.</p>}
            </>
          )}

          {/* ---------------- PLAYTEST ---------------- */}
          {tab === "playtest" && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-500">Watch a strong and a weak learner run your module, graded by the real rubric. If the module works, the strong run scores well and the weak run doesn't. If they land close, it isn't rewarding good questioning.</p>
                <button onClick={runPlaytest} disabled={busy === "playtest"} className="btn-primary shrink-0 text-sm">{busy === "playtest" ? "Running..." : "Run playtest"}</button>
              </div>
              {busy === "playtest" && <p className="text-xs text-slate-400">Simulating two runs and grading each. This takes 20-40 seconds.</p>}
              {playtest && (
                <>
                  <div className={`rounded-xl p-3 text-sm ${playtest.separates ? "bg-sage-soft text-sage" : "bg-amber-50 text-amber-900"}`}>
                    <span className="font-semibold">{playtest.separates ? "The module discriminates ✓" : "Weak signal"}</span> — {playtest.note}
                    <div className="mt-1 text-[11px] opacity-80">Tested on scenario “{playtest.scenario?.id}” (truth: {playtest.scenario?.truth}) · {playtest.budget} questions</div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PLAYTEST_COLS.map((col) => {
                      const r = playtest[col.k]; if (!r) return null;
                      return (
                        <div key={col.k} className="rounded-xl border border-line bg-white p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-ink">{col.label}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.score >= 60 ? "bg-sage-soft text-sage" : "bg-mist text-slate-500"}`}>{r.score}</span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">Called <b className="text-ink">{r.verdict?.call || "—"}</b> at {r.verdict?.confidence ?? "—"}% · {r.correct ? <span className="text-sage">right call</span> : <span className="text-clay">wrong call</span>}</div>
                          {Array.isArray(r.report?.questions) && r.report.questions.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {r.report.questions.slice(0, 5).map((q: any, i: number) => (
                                <div key={i} className="flex items-start gap-1.5 text-[11px]"><span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${q.value === "high" ? "bg-sage" : q.value === "med" ? "bg-amber" : "bg-slate-300"}`} /><span className="text-slate-600">{q.text}</span></div>
                              ))}
                            </div>
                          )}
                          <details className="mt-2"><summary className="cursor-pointer text-[11px] text-slate-400">Transcript</summary><pre className="mt-1 whitespace-pre-wrap rounded-lg bg-mist p-2 text-[11px] leading-relaxed text-slate-600">{r.transcript}</pre></details>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400">A simulation, not real learners: it estimates whether your design rewards good questioning. Use it to catch problems early, then confirm with a live cohort.</p>
                </>
              )}
            </>
          )}

          {/* ---------------- HISTORY ---------------- */}
          {tab === "history" && (
            <>
              <p className="text-sm text-slate-500">Every save is snapshotted here. Restore any version to bring it back into the editor, then Save to make it current.</p>
              {history === null ? (
                <p className="text-xs text-slate-400">Loading…</p>
              ) : history.length === 0 ? (
                <p className="text-xs text-slate-400">No saved versions yet. Save the module to start its history.</p>
              ) : (
                <div className="space-y-1.5">
                  {history.map((h, i) => (
                    <div key={h.id} className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-ink">{new Date(h.created_at).toLocaleString()}{i === 0 && <span className="ml-2 rounded-full bg-mist px-1.5 py-0.5 text-[10px] text-slate-500">latest</span>}{h.label && <span className="ml-1 rounded-full bg-sage-soft px-1.5 py-0.5 text-[10px] font-semibold text-sage">{h.label}</span>}</div>
                        <div className="truncate text-[11px] text-slate-400">{h.spec?.meta?.name} · {h.spec?.scenarios?.length || 0} scenarios · {h.spec?.probes?.length || 0} probes</div>
                      </div>
                      <button onClick={() => { setSpec(h.spec); setMsg("Restored — Save to keep it"); setTab("overview"); }} className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink shadow-sm hover:text-ai">Restore</button>
                    </div>
                  ))}
                </div>
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
      </>
      )}

      {view === "story" && (
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-4">
            {/* Header / identity */}
            <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <input className="field w-14 text-center text-2xl" value={spec.meta?.emoji || ""} onChange={(e) => setMeta({ emoji: e.target.value })} />
                <div className="min-w-0 flex-1 space-y-2">
                  <input className="field text-lg font-bold" value={spec.meta?.name || ""} onChange={(e) => setMeta({ name: e.target.value })} placeholder="Module name" />
                  <input className="field text-sm" value={spec.meta?.tagline || ""} onChange={(e) => setMeta({ tagline: e.target.value })} placeholder="One line on what the learner does and why it matters." />
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div><label className="lbl">Learning goal</label><textarea className="field text-xs" rows={2} value={spec.objective?.goal || ""} onChange={(e) => setObjective({ goal: e.target.value })} /></div>
                <div><label className="lbl">The aha</label><textarea className="field text-xs" rows={2} value={spec.objective?.aha || ""} onChange={(e) => setObjective({ aha: e.target.value })} /></div>
              </div>
              <div className="mt-2"><label className="lbl">Slug (the URL)</label><input className="field font-mono text-xs" value={spec.slug || ""} onChange={(e) => patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="earnings-call" /></div>
            </div>

            {/* Beat 1: the brief */}
            <Beat n="1" title="The brief" hint="What every learner sees">
              <div><label className="lbl">The situation</label><textarea className="field text-sm" rows={6} value={spec.world || ""} onChange={(e) => patch({ world: e.target.value })} placeholder="The public setup: the company, the person, the numbers on the table. No hidden truth here." /></div>
              <div><label className="lbl">The assignment (the learner's task)</label><textarea className="field text-sm" rows={3} value={briefIntro || ""} onChange={(e) => setBriefIntro(e.target.value)} /></div>
            </Beat>

            {/* Beat 2: the conversation */}
            <Beat n="2" title="The conversation" hint="Who they question, and for how long">
              <SectionCritique re={/character|behavior|contract|persona|leak|lie/} />
              <div className="grid gap-2 sm:grid-cols-2">
                <div><label className="lbl">Character name</label><input className="field text-sm" value={char?.name || ""} onChange={(e) => setChar({ name: e.target.value })} placeholder="Daniel Voss" /></div>
                <div><label className="lbl">Questions the learner gets</label><input type="number" className="field text-sm" value={convBudget ?? ""} onChange={(e) => setBudget(Number(e.target.value) || 0)} /></div>
              </div>
              <div><label className="lbl">Persona — voice and personality</label><input className="field text-sm" value={char?.persona || ""} onChange={(e) => setChar({ persona: e.target.value })} placeholder="Confident, media-trained founder-CEO who believes in the company." /></div>
              <details><summary className="cursor-pointer text-xs font-semibold text-slate-500">Behavior contract — how they handle the truth</summary><textarea className="field mt-1 text-sm" rows={5} value={char?.behavior || ""} onChange={(e) => setChar({ behavior: e.target.value })} /></details>
              <div>
                <label className="lbl">The cuts a learner can probe</label>
                <div className="mt-1 space-y-1.5">
                  {probes.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input className="field w-28 font-mono text-xs" value={p.key || ""} onChange={(e) => setProbe(i, { key: e.target.value.replace(/[^a-zA-Z0-9]/g, "") })} placeholder="key" />
                      <input className="field flex-1 text-sm" value={p.label || ""} onChange={(e) => setProbe(i, { label: e.target.value })} placeholder="The question a sharp learner would ask" />
                      <button onClick={() => removeProbe(i)} className="text-slate-300 hover:text-red-500">✕</button>
                    </div>
                  ))}
                  <button onClick={addProbe} className="btn-ghost text-sm">+ Add probe</button>
                </div>
              </div>
            </Beat>

            {/* Hidden layer */}
            <div className="rounded-2xl border-2 border-dashed border-line bg-mist/30 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">🎭 Hidden layer — learners never see this</div>
              <p className="mt-0.5 text-[11px] text-slate-400">The scenarios behind the conversation. One is chosen at random each run; the character and examiner know it, the learner never does. Keep the same probes with different answers, and include one that's genuinely ambiguous.</p>
              <div className="mt-3 space-y-3">
                <SectionCritique re={/scenario|probe|tell|discrimin|ambig|separate/} />
                {probes.length === 0 && <div className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">Add probes above first — scenarios answer them.</div>}
                {scenarioEditors()}
              </div>
            </div>

            {/* Beat 3: the decision */}
            <Beat n="3" title="The decision" hint="The call the learner commits to">
              {choiceField ? (
                <div className="space-y-2">
                  {(choiceField.options || []).map((o: any, oi: number) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input className="field w-40 font-mono text-xs" value={o.value || ""} onChange={(e) => setChoiceOption(oi, { value: e.target.value })} placeholder="value" />
                      <input className="field flex-1 text-sm" value={o.label || ""} onChange={(e) => setChoiceOption(oi, { label: e.target.value })} placeholder="What the learner sees" />
                    </div>
                  ))}
                  <button onClick={addChoiceOption} className="btn-ghost text-sm">+ Add option</button>
                </div>
              ) : <p className="text-xs text-slate-400">No choice field here. Edit it in Fields → Assessment.</p>}
            </Beat>

            {/* Beat 4: the debrief */}
            <Beat n="4" title="The debrief" hint="How they're graded and what they get back">
              <SectionCritique re={/rubric|grade|grading|verdict|calibrat|objective|score/} />
              <div><label className="lbl">How the examiner grades (performance, not the guess)</label><textarea className="field text-sm" rows={4} value={spec.rubric?.instructions || ""} onChange={(e) => setRubric({ instructions: e.target.value })} /></div>
              {(spec.report || []).length > 0 && <div><label className="lbl">The report shows</label><div className="mt-1 flex flex-wrap gap-1">{(spec.report || []).map((b: any, i: number) => <span key={i} className="rounded-full bg-mist px-2 py-0.5 text-[11px] text-slate-500">{b.title || b.source}</span>)}</div></div>}
              <p className="text-[11px] text-slate-400">Fine-tune the grading fields and report layout in Fields → Assessment / Advanced.</p>
            </Beat>
          </div>

          <SpecPreview spec={spec} />
        </div>
      )}
    </div>
  );
}

// A read-only heatmap of stance/value per probe (rows) x scenario (columns), so
// discriminability is visible: a probe answered the same way everywhere teaches
// nothing, and two scenarios with identical answers can't be told apart.
function ScenarioMatrix({ probes, scenarios }: { probes: any[]; scenarios: any[] }) {
  const stanceCls: Record<string, string> = {
    affirm: "bg-sage-soft text-sage", hedge: "bg-amber-soft text-amber",
    deny: "bg-red-50 text-red-700", noncommittal: "bg-mist text-slate-500",
  };
  const dimOf = (scn: any, key: string) => (scn.dimensions || []).find((d: any) => d.probe === key) || {};
  const sig = (scn: any) => probes.map((p) => { const d = dimOf(scn, p.key); return `${d.stance || "-"}:${d.value || "-"}`; }).join("|");
  const sigs = scenarios.map(sig);
  const dup = new Set<number>();
  for (let i = 0; i < sigs.length; i++) for (let j = i + 1; j < sigs.length; j++) if (sigs[i] === sigs[j]) { dup.add(i); dup.add(j); }
  const flat = (p: any) => {
    const cells = scenarios.map((s) => { const d = dimOf(s, p.key); return d.stance ? `${d.stance}:${d.value || ""}` : null; });
    return cells.every(Boolean) && new Set(cells).size === 1;
  };
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Discriminability matrix</div>
        <div className="text-[10px] text-slate-400">how each probe is answered across scenarios</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-1"></th>
              {scenarios.map((s, ci) => (
                <th key={ci} className="p-1 text-left align-bottom">
                  <div className="font-semibold text-ink">{s.label || s.id}</div>
                  <div className="text-[10px] font-normal text-slate-400">truth: {s.truth || "—"}</div>
                  {dup.has(ci) && <div className="mt-0.5 inline-block rounded bg-clay-soft px-1 text-[9px] font-semibold text-clay">duplicate</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {probes.map((p) => (
              <tr key={p.key} className="border-t border-line">
                <td className="p-1 pr-2 align-top">
                  <div className="max-w-[11rem] text-slate-600">{p.label || p.key}</div>
                  {flat(p) && <div className="mt-0.5 inline-block rounded bg-clay-soft px-1 text-[9px] font-semibold text-clay">same everywhere</div>}
                </td>
                {scenarios.map((s, ci) => { const d = dimOf(s, p.key); return (
                  <td key={ci} className="p-1 align-top">
                    {d.stance ? <span className={"inline-block rounded px-1.5 py-0.5 " + (stanceCls[d.stance] || "bg-mist text-slate-500")}>{d.stance}{d.value ? ` · ${d.value}` : ""}</span> : <span className="text-slate-300">—</span>}
                  </td>
                ); })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-400">A probe marked <span className="font-semibold text-clay">same everywhere</span> can't help a learner tell scenarios apart; a <span className="font-semibold text-clay">duplicate</span> scenario is indistinguishable from another. Vary the stance or value to fix it.</p>
    </div>
  );
}

// One storyboard beat: a numbered, titled card the author edits in place.
function Beat({ n, title, hint, children }: { n: string; title: string; hint?: string; children: any }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-baseline gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{n}</span>
        <div>
          <div className="text-sm font-bold text-ink">{title}</div>
          {hint && <div className="text-[11px] text-slate-400">{hint}</div>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
