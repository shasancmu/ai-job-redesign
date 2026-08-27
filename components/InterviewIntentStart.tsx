"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ModuleBuilder from "@/components/ModuleBuilder";

// The interview-family front door: describe the module (and the framework it
// should apply), optionally ground it in a document, and get a working draft in
// the builder. Mirrors the role-play intent bar.

const EXAMPLES = [
  { label: "Five Forces", text: "A Porter's Five Forces analysis: the AI interviews a founder about their industry, then drafts the five forces with a verdict on structural attractiveness." },
  { label: "Jobs-to-be-Done", text: "A Jobs-to-be-Done discovery: interview a product manager about their users, then draft the core job, the current alternatives, and the unmet outcomes." },
  { label: "Pre-mortem", text: "A project pre-mortem: interview the owner about a plan, then draft the top failure modes, early warning signs, and mitigations, scored by risk." },
  { label: "Balanced Scorecard", text: "A Balanced Scorecard for a team: interview the lead, then draft objectives and measures across financial, customer, process, and learning, each with a metric and a target." },
];
const LOADING = ["Choosing the format…", "Writing the interview…", "Designing the canvas fields…", "Grounding it in the framework…"];

export default function InterviewIntentStart({ canGlobal, orgName }: { canGlobal: boolean; orgName: string | null }) {
  const [phase, setPhase] = useState<"intent" | "editor">("intent");
  const [spec, setSpec] = useState<any>(null);
  const [intent, setIntent] = useState("");
  const [framework, setFramework] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [loadStep, setLoadStep] = useState(0);

  useEffect(() => {
    if (busy !== "build") return;
    const t = setInterval(() => setLoadStep((s) => (s + 1) % LOADING.length), 1800);
    return () => clearInterval(t);
  }, [busy]);

  async function onPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { setErr("PDF is too large (max 15MB)."); return; }
    setBusy("pdf"); setErr("");
    try {
      const b64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = () => rej(new Error("read failed")); r.readAsDataURL(file); });
      const resp = await fetch("/api/mechanics/pdf-source", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pdf: b64, name: file.name }) });
      const d = await resp.json().catch(() => ({}));
      if (!resp.ok || !d.summary) setErr(d.error || "Couldn't read that PDF.");
      else setSource((s) => (s.trim() ? s + "\n\n" + d.summary : d.summary));
    } catch (e: any) { setErr(e?.message || "PDF upload failed."); }
    finally { setBusy(""); }
  }

  async function build() {
    if (!intent.trim()) return;
    setBusy("build"); setErr(""); setLoadStep(0);
    try {
      const res = await fetch("/api/mechanics/interview-copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent, framework, sourceText: source }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.spec) setErr(d.error || "Couldn't build a draft. Try describing the subject and the framework to apply.");
      else { setSpec(d.spec); setPhase("editor"); }
    } catch (e: any) { setErr(e?.message || "Something went wrong."); }
    finally { setBusy(""); }
  }

  if (phase === "editor" && spec) {
    return (
      <div>
        <div className="mb-3 rounded-xl border border-sage/30 bg-sage-soft px-4 py-2.5 text-sm text-sage">
          Here's your first draft. Refine the interview and the canvas below, then Publish. You can start over from an idea anytime.
        </div>
        <ModuleBuilder initialSpec={spec} canGlobal={canGlobal} orgName={orgName} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <div className="text-3xl">✨</div>
        <h1 className="mt-2 font-serif text-3xl text-ink">Describe the module you want to build</h1>
        <p className="mt-2 text-slate2">An AI will interview the learner about a subject, then draft a structured canvas. Name the framework it should apply and it does the rest. You refine from there.</p>
      </div>

      {busy === "build" ? (
        <div className="mt-8 rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-ai" />
          <div className="mt-4 font-serif text-lg text-ink">Designing your module</div>
          <div className="mt-1 text-sm text-slate-500">{LOADING[loadStep]}</div>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <textarea className="field w-full text-base" style={{ minHeight: "8rem" }} value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="e.g. Interview a founder about their go-to-market, then draft a positioning canvas with a verdict on whether the wedge is sharp enough." autoFocus />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Try:</span>
              {EXAMPLES.map((ex) => (
                <button key={ex.label} onClick={() => setIntent(ex.text)} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-sage hover:bg-sage-soft">{ex.label}</button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <label className="lbl">Framework to apply (optional but recommended)</label>
            <input className="field text-sm" value={framework} onChange={(e) => setFramework(e.target.value)} placeholder="e.g. Porter's Five Forces, Jobs-to-be-Done, your own rubric" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className={`cursor-pointer rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium shadow-sm ${busy === "pdf" ? "text-slate-400" : "text-ink hover:text-ai"}`}>
              {busy === "pdf" ? "Reading PDF…" : "＋ Ground it in a PDF"}
              <input type="file" accept="application/pdf" className="hidden" onChange={onPdf} disabled={busy === "pdf"} />
            </label>
            {source && <span className="text-xs text-sage">Source added ✓ (the file isn't stored)</span>}
          </div>

          <button onClick={build} disabled={!intent.trim()} className="btn-primary mt-6 w-full text-base disabled:opacity-50">Build it →</button>
          {err && <p className="mt-3 text-sm text-red-700">{err}</p>}

          <div className="mt-6 text-center text-sm text-slate-400">
            Prefer to fill it in yourself? <Link href="/build/new" className="text-slate2 underline hover:text-ink">Open the blank builder</Link>
          </div>
        </>
      )}
    </div>
  );
}
