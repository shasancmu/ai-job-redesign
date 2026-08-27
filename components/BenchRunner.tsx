"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AI_NOTE } from "@/lib/benchmark";

// Self-contained timed benchmark. Answers are scored server-side; the key never
// reaches the client (the public config has no answers).
export default function BenchRunner({ cfg }: { cfg: any }) {
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState<number>(cfg.timeLimitSec || 300);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!started || result) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [started, result]);

  useEffect(() => { if (started && remaining === 0 && !submittedRef.current) submit(); /* eslint-disable-next-line */ }, [remaining, started]);

  async function submit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/mechanics/benchmark/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: cfg.slug, answers }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.score == null) throw new Error(d.error || "Couldn't score.");
      setResult(d);
    } catch (e: any) { setErr(e?.message || "Couldn't score."); submittedRef.current = false; }
    finally { setBusy(false); }
  }

  const mm = String(Math.floor(remaining / 60)).padStart(1, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  if (result) {
    const pct = result.total ? Math.round((result.score / result.total) * 100) : 0;
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your score</div>
          <div className="mt-2 text-5xl font-bold text-ink">{result.score}<span className="text-2xl text-slate-400">/{result.total}</span></div>
          <div className="mt-1 text-sm text-slate-500">{pct}% correct</div>
          <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-slate-600">{AI_NOTE}</p>
          <Link href="/studio/benchmark" className="btn-ghost mt-5 inline-block text-sm">Done</Link>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
          <div className="text-2xl">⏱️</div>
          <h1 className="mt-2 font-serif text-2xl text-ink">{cfg.name}</h1>
          <p className="mt-2 text-sm text-slate-500">{cfg.questions.length} questions · {Math.round((cfg.timeLimitSec || 300) / 60)} minutes. It auto-submits when time runs out.</p>
          <button onClick={() => setStarted(true)} className="btn-primary mt-5">Start</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="sticky top-0 z-10 mb-4 flex items-center justify-between rounded-xl border border-line bg-white/90 px-4 py-2 backdrop-blur">
        <span className="text-sm text-slate-500">{Object.keys(answers).length}/{cfg.questions.length} answered</span>
        <span className={`font-mono text-lg font-bold tabular-nums ${remaining <= 30 ? "text-clay" : "text-ink"}`}>{mm}:{ss}</span>
      </div>
      <div className="space-y-4 pb-24">
        {cfg.questions.map((q: any, i: number) => (
          <div key={q.id} className="rounded-2xl border border-line bg-white p-4">
            <div className="text-sm font-semibold text-ink">{i + 1}. {q.prompt}</div>
            <div className="mt-2 space-y-1.5">
              {q.options.map((o: any) => (
                <label key={o.key} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm ${answers[String(q.id)] === o.key ? "border-ink bg-ink/5" : "border-line hover:bg-mist"}`}>
                  <input type="radio" name={`q${q.id}`} checked={answers[String(q.id)] === o.key} onChange={() => setAnswers((a) => ({ ...a, [String(q.id)]: o.key }))} className="mt-0.5" />
                  <span><b className="mr-1">{o.key}.</b>{o.text}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {err && <span className="text-xs text-red-700">{err}</span>}
          <button onClick={submit} disabled={busy} className="btn-primary ml-auto">{busy ? "Scoring..." : "Submit"}</button>
        </div>
      </div>
    </div>
  );
}
