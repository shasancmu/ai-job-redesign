"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fallbackNote, CONFIDENCE_LEVELS } from "@/lib/benchmark";

// Self-contained timed quiz. Answers are scored server-side (the key never
// reaches the client), and when the quiz asks for confidence, the result also
// shows how well the learner's confidence tracked how often they were right.
export default function BenchRunner({ cfg }: { cfg: any }) {
  const askConf = cfg.askConfidence !== false;
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState<Record<string, string>>({});
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
      const res = await fetch("/api/mechanics/benchmark/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: cfg.slug, answers, confidence }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.score == null) throw new Error(d.error || "Couldn't score.");
      setResult(d);
    } catch (e: any) { setErr(e?.message || "Couldn't score."); submittedRef.current = false; }
    finally { setBusy(false); }
  }

  const mm = String(Math.floor(remaining / 60)).padStart(1, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  // ---------- results ----------
  if (result) {
    const pct = result.total ? Math.round((result.score / result.total) * 100) : 0;
    const cal = result.calibration;
    const verdictCopy: Record<string, { label: string; cls: string }> = {
      overconfident: { label: "Overconfident", cls: "text-clay" },
      underconfident: { label: "Underconfident", cls: "text-sky" },
      calibrated: { label: "Well calibrated", cls: "text-sage" },
    };
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your score</div>
          <div className="mt-2 text-5xl font-bold text-ink">{result.score}<span className="text-2xl text-slate-400">/{result.total}</span></div>
          <div className="mt-1 text-sm text-slate-500">{pct}% correct{result.prior ? ` · last time ${result.prior.score}/${result.prior.total}` : ""}</div>
          <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-slate-600">{result.note || fallbackNote(result.score, result.total, cfg.name)}</p>
        </div>

        {cal && cal.answered > 0 && (
          <div className="mt-4 rounded-2xl border border-line bg-white p-6 shadow-sm">
            <div className="flex items-baseline justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your judgment</div>
              <div className={`text-sm font-bold ${verdictCopy[cal.verdict]?.cls || "text-ink"}`}>{verdictCopy[cal.verdict]?.label}</div>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              On average you felt <b className="text-ink">{Math.round(cal.meanConfidence * 100)}%</b> sure, and you were right <b className="text-ink">{Math.round(cal.accuracy * 100)}%</b> of the time.
              {cal.verdict === "overconfident" && " Feeling sure is not the same as being right; closing that gap is the real skill."}
              {cal.verdict === "underconfident" && " You knew more than you gave yourself credit for."}
              {cal.verdict === "calibrated" && " Your confidence tracked reality closely. That is what good judgment looks like."}
            </p>
            <div className="mt-4 space-y-2">
              {cal.buckets.map((b: any) => {
                const acc = Math.round(b.accuracy * 100);
                const said = Math.round(b.p * 100);
                const off = acc < said - 10 ? "text-clay" : acc > said + 10 ? "text-sky" : "text-sage";
                return (
                  <div key={b.key} className="flex items-center gap-3 text-sm">
                    <div className="w-20 shrink-0 font-medium text-ink">{b.label}</div>
                    <div className="w-14 shrink-0 text-xs text-slate-400">said {said}%</div>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-mist">
                      <div className={`h-full rounded-full ${off === "text-clay" ? "bg-clay" : off === "text-sky" ? "bg-sky" : "bg-sage"}`} style={{ width: `${acc}%` }} />
                    </div>
                    <div className={`w-24 shrink-0 text-right text-xs font-semibold ${off}`}>right {acc}% ({b.correct}/{b.n})</div>
                  </div>
                );
              })}
            </div>
            {typeof result.prior?.brier === "number" && typeof cal.brier === "number" && (
              <div className="mt-4 rounded-lg bg-mist/70 px-3 py-2 text-xs text-slate-500">
                {cal.brier < result.prior.brier - 0.005 ? "Your calibration improved since last time." : cal.brier > result.prior.brier + 0.005 ? "Your calibration slipped a little since last time." : "Your calibration held steady since last time."}
              </div>
            )}
          </div>
        )}

        <div className="mt-5 text-center"><Link href="/studio/benchmark" className="btn-ghost text-sm">Done</Link></div>
      </div>
    );
  }

  // ---------- start ----------
  if (!started) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
          <div className="text-2xl">⏱️</div>
          <h1 className="mt-2 font-serif text-2xl text-ink">{cfg.name}</h1>
          <p className="mt-2 text-sm text-slate-500">{cfg.questions.length} questions · {Math.round((cfg.timeLimitSec || 300) / 60)} minutes. It auto-submits when time runs out.</p>
          {askConf && <p className="mx-auto mt-2 max-w-xs text-xs text-slate-400">For each answer, say how sure you are. You will see how well your confidence matched being right.</p>}
          <button onClick={() => setStarted(true)} className="btn-primary mt-5">Start</button>
        </div>
      </div>
    );
  }

  // ---------- taking it ----------
  return (
    <div className="mx-auto max-w-2xl">
      <div className="sticky top-0 z-10 mb-4 flex items-center justify-between rounded-xl border border-line bg-white/90 px-4 py-2 backdrop-blur">
        <span className="text-sm text-slate-500">{Object.keys(answers).length}/{cfg.questions.length} answered</span>
        <span className={`font-mono text-lg font-bold tabular-nums ${remaining <= 30 ? "text-clay" : "text-ink"}`}>{mm}:{ss}</span>
      </div>
      <div className="space-y-4 pb-24">
        {cfg.questions.map((q: any, i: number) => {
          const answered = answers[String(q.id)] != null;
          return (
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
              {askConf && answered && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                  <span className="mr-1 text-xs font-medium text-slate-400">How sure?</span>
                  {CONFIDENCE_LEVELS.map((l) => (
                    <button
                      key={l.key}
                      onClick={() => setConfidence((c) => ({ ...c, [String(q.id)]: l.key }))}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${confidence[String(q.id)] === l.key ? "border-ink bg-ink text-white" : "border-line text-slate-600 hover:bg-mist"}`}
                    >
                      {l.label} <span className="opacity-60">{Math.round(l.p * 100)}%</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
