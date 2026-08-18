"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Q = { id: number; prompt: string; options: { key: string; text: string }[] };
type Cfg = { title: string; timeLimitSec: number; total: number; ready: boolean; questions: Q[] };
type Phase = "loading" | "notready" | "intro" | "quiz" | "done";

// PUBLIC, no sign-in: take the shared benchmark question set once per device.
export default function QuizRoom({ code }: { code: string }) {
  const key = `quiz:done:${code}`;
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submitted = useRef(false);

  useEffect(() => {
    let prior: any = null;
    try {
      prior = JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      /* ignore */
    }
    if (prior && typeof prior.score === "number") {
      setResult(prior);
      setPhase("done");
      return;
    }
    fetch("/api/quiz/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((c: Cfg) => {
        setCfg(c);
        setPhase(c.ready ? "intro" : "notready");
      })
      .catch(() => setPhase("notready"));
  }, [key]);

  useEffect(() => {
    if (phase !== "quiz") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [phase]);

  const remaining = cfg ? Math.max(0, cfg.timeLimitSec - Math.floor((now - startedAt) / 1000)) : 0;
  const mm = String(Math.floor(remaining / 60)).padStart(1, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Couldn't submit. Try again.");
        submitted.current = false;
      } else {
        const r = { score: data.score, total: data.total };
        setResult(r);
        try {
          localStorage.setItem(key, JSON.stringify(r));
        } catch {
          /* ignore */
        }
        setPhase("done");
      }
    } catch {
      setErr("Couldn't submit. Check your connection.");
      submitted.current = false;
    } finally {
      setBusy(false);
    }
  }, [answers, code, key]);

  // Auto-submit when the timer runs out.
  useEffect(() => {
    if (phase === "quiz" && remaining === 0 && !submitted.current) submit();
  }, [phase, remaining, submit]);

  if (phase === "loading") {
    return <div className="card p-7 text-center text-slate-400">Loading…</div>;
  }
  if (phase === "notready") {
    return (
      <div className="card p-7 text-center">
        <h1 className="text-xl font-bold text-ink">Not ready yet</h1>
        <p className="mt-2 text-sm text-slate2">The facilitator hasn&apos;t finished setting up the questions. Hang tight.</p>
      </div>
    );
  }
  if (phase === "done" && result) {
    const pct = result.total ? Math.round((result.score / result.total) * 100) : 0;
    return (
      <div className="card p-7 text-center">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Your score</div>
        <div className="mt-1 text-6xl font-extrabold text-ink">
          {result.score}<span className="text-2xl text-slate-400">/{result.total}</span>
        </div>
        <div className="mt-1 text-sm text-slate-400">{pct}%</div>
        <p className="mt-6 text-sm text-slate2">Nicely done. Look up, the room&apos;s results are on the screen.</p>
      </div>
    );
  }
  if (phase === "intro" && cfg) {
    return (
      <div className="card p-7 text-center">
        <h1 className="text-xl font-bold text-ink">{cfg.title}</h1>
        <p className="mt-2 text-sm text-slate2">
          {cfg.total} questions, timed. Pick the single best answer for each. Work quickly and carefully. One attempt.
        </p>
        <div className="mt-2 text-sm text-slate-400">You&apos;ll have {Math.round(cfg.timeLimitSec / 60)} minutes.</div>
        <button
          onClick={() => {
            setStartedAt(Date.now());
            setNow(Date.now());
            setPhase("quiz");
          }}
          className="btn-primary mt-5 w-full"
        >
          Start
        </button>
      </div>
    );
  }

  // phase === "quiz"
  const answeredCount = cfg ? cfg.questions.filter((q) => answers[String(q.id)]).length : 0;
  return (
    <div className="pb-24">
      <div className="sticky top-0 z-10 -mx-6 mb-4 flex items-center justify-between border-b border-line bg-paper/90 px-6 py-2.5 backdrop-blur">
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-ink">{answeredCount}</span>/{cfg?.total} answered
        </div>
        <div className={"font-mono text-lg font-bold " + (remaining <= 30 ? "text-clay" : "text-ink")}>{mm}:{ss}</div>
      </div>

      <div className="space-y-5">
        {cfg?.questions.map((q, i) => (
          <div key={q.id} className="card p-5">
            <div className="flex gap-2">
              <span className="font-bold text-slate-400">{i + 1}.</span>
              <div className="flex-1">
                <div className="whitespace-pre-wrap font-medium text-ink">{q.prompt}</div>
                <div className="mt-3 space-y-2">
                  {q.options.map((o) => {
                    const chosen = answers[String(q.id)] === o.key;
                    return (
                      <button
                        key={o.key}
                        onClick={() => setAnswers((a) => ({ ...a, [String(q.id)]: o.key }))}
                        className={
                          "flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition " +
                          (chosen ? "border-ink bg-ink/[0.03] text-ink" : "border-line bg-white text-slate-700 hover:border-slate-300")
                        }
                      >
                        <span className={"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold " + (chosen ? "border-ink bg-ink text-white" : "border-slate-300 text-slate-400")}>
                          {o.key}
                        </span>
                        <span className="whitespace-pre-wrap">{o.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {err && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-6 py-3">
          <span className="text-xs text-slate-400">{answeredCount === cfg?.total ? "All answered" : "You can submit any time"}</span>
          <button onClick={submit} disabled={busy} className="btn-primary">{busy ? "Submitting…" : "Submit"}</button>
        </div>
      </div>
    </div>
  );
}
