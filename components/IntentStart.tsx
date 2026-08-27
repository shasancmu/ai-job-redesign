"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SpecEditor from "@/components/SpecEditor";

// The authoring front door: describe the experience you want, optionally ground
// it in a document, and get a complete working draft dropped straight into the
// editor. Intent in, not a form.

const EXAMPLES = [
  { label: "An earnings call", text: "Students interrogate a CEO who may be hiding channel stuffing to hit their quarter. They get 7 questions and don't know if the company is guilty. Grade how well they question and how calibrated their verdict is, not whether they guess the label." },
  { label: "A reference check", text: "A manager calls a candidate's former boss, who won't lie but won't defame either. The real signal is in what the reference won't say plainly. The learner must decide whether to hire." },
  { label: "A salary negotiation", text: "A new grad negotiates a job offer with a recruiter who has hidden flexibility on signing bonus but not base. The learner must uncover where the give is without leaving value on the table." },
  { label: "A vendor's claims", text: "A buyer evaluates a SaaS vendor whose account exec spins but won't state a falsehood. The hidden truth is whether the product actually scales to the buyer's size. Grade the diligence questions." },
];

const LOADING = [
  "Choosing the right mechanic…",
  "Writing the situation your learners will see…",
  "Designing the hidden scenarios and the tell…",
  "Building a rubric that grades the thinking…",
  "Setting the guardrails…",
];

export default function IntentStart({ me }: { me: string }) {
  const [phase, setPhase] = useState<"intent" | "editor">("intent");
  const [spec, setSpec] = useState<any>(null);
  const [intent, setIntent] = useState("");
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
      const res = await fetch("/api/mechanics/copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent, sourceText: source }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.spec) setErr(d.error || "Couldn't build a draft from that. Try describing the situation and what learners should walk away able to do.");
      else { setSpec(d.spec); setPhase("editor"); }
    } catch (e: any) { setErr(e?.message || "Something went wrong."); }
    finally { setBusy(""); }
  }

  if (phase === "editor" && spec) {
    return (
      <div>
        <div className="mb-3 rounded-xl border border-sage/30 bg-sage-soft px-4 py-2.5 text-sm text-sage">
          Here's your first draft. Refine any section, run the Critique, then Save and Publish. You can always start over from an idea.
        </div>
        <SpecEditor me={me} initial={spec} initialStatus="draft" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <div className="text-3xl">✨</div>
        <h1 className="mt-2 font-serif text-3xl text-ink">Describe the experience you want to create</h1>
        <p className="mt-2 text-slate2">Tell it the situation and what learners should walk away able to do. It designs the characters, the hidden truth, the decision, and the grading. You refine from there.</p>
      </div>

      {busy === "build" ? (
        <div className="mt-8 rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-ai" />
          <div className="mt-4 font-serif text-lg text-ink">Designing your module</div>
          <div className="mt-1 text-sm text-slate-500">{LOADING[loadStep]}</div>
          <div className="mt-2 text-[11px] text-slate-400">This takes a few seconds.</div>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <textarea
              className="field w-full text-base"
              style={{ minHeight: "9rem" }}
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g. Students interrogate a CEO who may be hiding channel stuffing. They get 7 questions and must decide if the quarter was real. Grade how well they question, not whether they guess."
              autoFocus
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Try:</span>
              {EXAMPLES.map((ex) => (
                <button key={ex.label} onClick={() => setIntent(ex.text)} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-sage hover:bg-sage-soft">{ex.label}</button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className={`cursor-pointer rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium shadow-sm ${busy === "pdf" ? "text-slate-400" : "text-ink hover:text-ai"}`}>
              {busy === "pdf" ? "Reading PDF…" : "＋ Ground it in a PDF"}
              <input type="file" accept="application/pdf" className="hidden" onChange={onPdf} disabled={busy === "pdf"} />
            </label>
            {source && <span className="text-xs text-sage">Source added ✓ (the file isn't stored)</span>}
          </div>
          {source && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-slate-400">Review the source summary</summary>
              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-mist p-3 text-xs text-slate-600">{source}</p>
            </details>
          )}

          <button onClick={build} disabled={!intent.trim()} className="btn-primary mt-6 w-full text-base disabled:opacity-50">Build it →</button>
          {err && <p className="mt-3 text-sm text-red-700">{err}</p>}

          <div className="mt-6 text-center text-sm text-slate-400">
            Prefer to start from an example? <Link href="/studio/roleplay" className="text-slate2 underline hover:text-ink">Browse templates</Link>
          </div>
        </>
      )}
    </div>
  );
}
