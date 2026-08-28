"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SpecEditor from "@/components/SpecEditor";
import ModuleBuilder from "@/components/ModuleBuilder";
import NegEditor from "@/components/NegEditor";
import BenchEditor from "@/components/BenchEditor";
import AnalyticalEditor from "@/components/AnalyticalEditor";
import RedesignEditor from "@/components/RedesignEditor";

const KINDS: Record<string, { label: string; emoji: string; endpoint: string }> = {
  roleplay: { label: "Role-play", emoji: "🎭", endpoint: "/api/mechanics/copilot" },
  interview: { label: "Guided interview", emoji: "🗂️", endpoint: "/api/mechanics/interview-copilot" },
  negotiation: { label: "Negotiation", emoji: "🤝", endpoint: "/api/mechanics/negotiation-copilot" },
  benchmark: { label: "Timed benchmark", emoji: "⏱️", endpoint: "/api/mechanics/benchmark-copilot" },
  analytical: { label: "Analytical instrument", emoji: "📊", endpoint: "/api/mechanics/analytical-copilot" },
  redesign: { label: "Paired redesign", emoji: "🤝", endpoint: "/api/mechanics/redesign-copilot" },
};
const LOADING = ["Reading your materials…", "Finding the interactive core…", "Choosing the best format…", "Drafting your module…"];

export default function AutoBuild({ me, canGlobal, orgName }: { me: string; canGlobal: boolean; orgName: string | null }) {
  const [phase, setPhase] = useState<"upload" | "routed" | "editor">("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [routed, setRouted] = useState<any>(null);
  const [kind, setKind] = useState("");
  const [spec, setSpec] = useState<any>(null);
  const [step, setStep] = useState(0);

  useEffect(() => { if (!busy) return; const t = setInterval(() => setStep((s) => (s + 1) % LOADING.length), 1700); return () => clearInterval(t); }, [busy]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const ok = Array.from(list).filter((f) => /\.(pdf|docx|txt|md|markdown)$/i.test(f.name) && f.size < 20 * 1024 * 1024);
    setFiles((prev) => [...prev, ...ok].slice(0, 12));
  }

  async function analyze() {
    if (!files.length) return;
    setBusy("analyze"); setErr(""); setStep(0);
    try {
      const payload = await Promise.all(files.map((f) => new Promise<any>((res, rej) => { const r = new FileReader(); r.onload = () => res({ name: f.name, b64: String(r.result).split(",")[1] || "" }); r.onerror = () => rej(new Error("read failed")); r.readAsDataURL(f); })));
      const res = await fetch("/api/mechanics/autobuild", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ files: payload }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.kind) { setErr(d.error || "Couldn't read those materials."); }
      else { setRouted(d); setKind(KINDS[d.kind] ? d.kind : "roleplay"); setPhase("routed"); }
    } catch (e: any) { setErr(e?.message || "Something went wrong."); }
    finally { setBusy(""); }
  }

  async function build(k: string) {
    setBusy("build"); setErr(""); setStep(0);
    try {
      const res = await fetch(KINDS[k].endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent: routed.concept, sourceText: routed.source }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.spec) { setErr(d.error || "Couldn't draft the module. Try a different type."); }
      else { setSpec(d.spec); setKind(k); setPhase("editor"); }
    } catch (e: any) { setErr(e?.message || "Something went wrong."); }
    finally { setBusy(""); }
  }

  if (phase === "editor" && spec) {
    return (
      <div>
        <div className="mb-3 rounded-xl border border-sage/30 bg-sage-soft px-4 py-2.5 text-sm text-sage">Drafted from your materials. Make a few edits, then Publish. You can start over from new files anytime.</div>
        {kind === "roleplay" && <SpecEditor me={me} initial={spec} initialStatus="draft" />}
        {kind === "interview" && <ModuleBuilder initialSpec={spec} canGlobal={canGlobal} orgName={orgName} />}
        {kind === "negotiation" && <NegEditor me={me} initial={spec} initialStatus="draft" />}
        {kind === "benchmark" && <BenchEditor me={me} initial={spec} initialStatus="draft" />}
        {kind === "analytical" && <AnalyticalEditor me={me} initial={spec} initialStatus="draft" />}
        {kind === "redesign" && <RedesignEditor me={me} initial={spec} initialStatus="draft" />}
      </div>
    );
  }

  if (busy === "analyze" || busy === "build") {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-ai" />
          <div className="mt-4 font-serif text-lg text-ink">{busy === "analyze" ? "Reading your materials" : "Drafting your module"}</div>
          <div className="mt-1 text-sm text-slate-500">{LOADING[step]}</div>
        </div>
      </div>
    );
  }

  if (phase === "routed" && routed) {
    const k = KINDS[kind];
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">From your materials, this looks like</div>
          <div className="mt-2 flex items-center gap-2 text-lg font-bold text-ink">{k.emoji} {k.label}{routed.title ? <span className="text-slate-400">·</span> : null} {routed.title}</div>
          {routed.rationale && <p className="mt-1 text-sm text-slate-600">{routed.rationale}</p>}
          {routed.concept && <p className="mt-3 rounded-lg bg-mist p-3 text-sm leading-relaxed text-slate-700">{routed.concept}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={() => build(kind)} className="btn-primary">Build this module →</button>
            {routed.alternate && KINDS[routed.alternate] && routed.alternate !== kind && (
              <button onClick={() => { setKind(routed.alternate); }} className="btn-ghost text-sm">Try {KINDS[routed.alternate].label} instead</button>
            )}
          </div>
          <div className="mt-3 text-xs text-slate-400">Or pick a type: {Object.entries(KINDS).map(([kk, v]) => <button key={kk} onClick={() => setKind(kk)} className={`ml-1 rounded-full px-2 py-0.5 ${kind === kk ? "bg-ink text-white" : "bg-mist text-slate-600"}`}>{v.label}</button>)}</div>
          {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
        </div>
        <div className="mt-3 text-center"><button onClick={() => { setPhase("upload"); setRouted(null); }} className="text-sm text-slate-400 hover:text-ink">← Start over with different files</button></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="text-center">
        <div className="text-3xl">📎</div>
        <h1 className="mt-2 font-serif text-3xl text-ink">Turn your teaching materials into a module</h1>
        <p className="mt-2 text-slate2">Drop your slides, readings, or notes. It reads them, picks the best interactive format, and drafts a module you can edit and launch.</p>
      </div>
      <label className="mt-6 block cursor-pointer rounded-2xl border-2 border-dashed border-line bg-white p-8 text-center transition hover:border-ai/40">
        <input type="file" multiple accept=".pdf,.docx,.txt,.md,.markdown" className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <div className="text-sm font-semibold text-ink">Choose files</div>
        <div className="mt-1 text-xs text-slate-400">PDF, Word (.docx), or text · up to 12 files</div>
      </label>
      {files.length > 0 && (
        <div className="mt-3 space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-line bg-white px-3 py-1.5 text-sm">
              <span className="truncate text-slate-700">📄 {f.name}</span>
              <button onClick={() => setFiles((p) => p.filter((_, k) => k !== i))} className="text-slate-300 hover:text-red-500">✕</button>
            </div>
          ))}
        </div>
      )}
      <button onClick={analyze} disabled={!files.length} className="btn-primary mt-5 w-full text-base disabled:opacity-50">Generate my module →</button>
      {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
      <p className="mt-4 text-center text-xs text-slate-400">Files are read for this draft only and never stored. Scanned PDFs (images) aren't supported.</p>
    </div>
  );
}
