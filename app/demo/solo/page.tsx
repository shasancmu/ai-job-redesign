"use client";

// No-backend, no-key preview of "Solo with AI". The interviewer is scripted so
// you can see the flow; the real version uses your configured model (e.g. Groq).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SOLO_STEPS } from "@/lib/solo";
import GridEditor from "@/components/GridEditor";
import Timer from "@/components/Timer";

const SCRIPT = [
  "To start, walk me through a typical week. What are you actually doing day to day?",
  "Helpful. Of all that, what drains you most, the work you wish you didn't have to do?",
  "Got it. Now the opposite: when are you doing your best, most valuable work, the part only you can do?",
  "Last one: if that draining work were off your plate, what would you spend the reclaimed time on?",
  "Thanks. I've got a clear picture. Head to the next step and I'll draft a redesign.",
];

const DRAFT_GRID: Record<string, string[]> = {
  search: ["Scan", "Aggregate"],
  structure: ["Organize", "Cluster"],
  think: ["Analyze", "Compare"],
  translate: ["Summarize", "Adapt"],
  lead: ["Set strategy"],
  own: ["Be accountable"],
  judge: ["Apply taste", "Veto"],
  integrate: ["Build relationships"],
};

export default function SoloDemo() {
  const [phase, setPhase] = useState(0);
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const step = SOLO_STEPS[phase];
  const [doc, setDoc] = useState<any>({
    owner_job_title: "Product Marketing Manager",
    grid: {},
    new_job_description: "",
    final_description: "",
  });
  const set = (p: any) => setDoc((d: any) => ({ ...d, ...p }));

  function go(i: number) {
    setPhase(Math.max(0, Math.min(SOLO_STEPS.length - 1, i)));
    setStartedAt(new Date().toISOString());
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-4 rounded-xl bg-blue-50 px-4 py-2 text-sm text-blue-800">
        Preview: Solo with AI (scripted). The real version uses your configured
        model.{" "}
        <Link href="/demo" className="font-semibold underline">
          Job exercise
        </Link>{" "}
        ·{" "}
        <Link href="/" className="font-semibold underline">
          Home
        </Link>
      </div>

      <div className="mb-5 flex items-center justify-between">
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-semibold">
          Solo · AI partner
        </span>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {SOLO_STEPS.map((p) => (
          <button
            key={p.key}
            onClick={() => go(p.index)}
            className={"h-1.5 flex-1 rounded-full " + (p.index < phase ? "bg-ink" : p.index === phase ? "bg-ai" : "bg-slate-200")}
          />
        ))}
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Step {phase + 1} of {SOLO_STEPS.length} · {step.minutes} min
        </div>
        <h1 className="mt-1 text-2xl font-bold">{step.title}</h1>
        <p className="mt-1 text-slate-500">{step.subtitle}</p>
      </div>

      <div className="pb-24">
        {step.key === "setup" && (
          <div className="card p-5">
            <label className="lbl">Job title</label>
            <input className="field" value={doc.owner_job_title} onChange={(e) => set({ owner_job_title: e.target.value })} />
            <label className="lbl mt-4">What do you actually do?</label>
            <textarea className="field" value={doc.owner_job_description || ""} onChange={(e) => set({ owner_job_description: e.target.value })} placeholder="What you're responsible for, and where your time goes." />
          </div>
        )}

        {step.key === "interview" && <ScriptedChat />}

        {step.key === "redesign" && (
          <div className="space-y-4">
            <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm text-slate-500">Let your AI partner draft a first pass, then make it yours.</div>
              <button onClick={() => set({ grid: DRAFT_GRID, new_job_description: "In your reimagined role, you own the narrative and which bets to make, while AI scans the field, clusters the signal, and drafts every asset. Your week goes to judgment and relationships, not producing collateral." })} className="btn-primary">
                ✨ Draft with AI
              </button>
            </div>
            <GridEditor grid={doc.grid} onChange={(grid) => set({ grid })} />
            <div className="card p-5">
              <label className="lbl">Your new job description</label>
              <textarea className="field min-h-[130px]" value={doc.new_job_description} onChange={(e) => set({ new_job_description: e.target.value })} />
            </div>
          </div>
        )}

        {step.key === "final" && (
          <div className="card p-5">
            <label className="lbl">Your reimagined job: final version</label>
            <textarea className="field min-h-[150px]" value={doc.final_description} onChange={(e) => set({ final_description: e.target.value })} placeholder="In my reimagined role, I…" />
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">
            Back
          </button>
          {phase < SOLO_STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} className="btn-primary">
              Next step →
            </button>
          ) : (
            <Link href="/" className="btn-primary">
              Finish
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

function ScriptedChat() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBusy(true);
    const t = setTimeout(() => {
      setMessages([{ role: "assistant", content: SCRIPT[0] }]);
      setI(1);
      setBusy(false);
    }, 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    if (i < SCRIPT.length) {
      setBusy(true);
      setTimeout(() => {
        setMessages((m) => [...m, { role: "assistant", content: SCRIPT[i] }]);
        setI((x) => x + 1);
        setBusy(false);
      }, 700);
    }
  }

  return (
    <div className="card flex flex-col p-5" style={{ height: "60vh", minHeight: 420 }}>
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((m, idx) => (
          <div key={idx} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={"max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " + (m.role === "user" ? "bg-ink text-white" : "bg-slate-100 text-slate-800")}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400">…</div>
          </div>
        )}
      </div>
      <form onSubmit={send} className="mt-3 flex items-center gap-2">
        <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your answer…" disabled={busy} />
        <button className="btn-primary" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
