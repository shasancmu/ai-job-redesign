"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  BENCHMARK,
  BENCHMARK_TOTAL,
  BENCHMARK_READY,
  scoreAnswers,
} from "@/lib/benchmark";
import BenchmarkHistogram from "@/components/BenchmarkHistogram";

type Phase = "intro" | "quiz" | "done";

export default function BenchmarkRoom({
  me,
  session,
}: {
  me: string;
  session: any;
}) {
  const supabase = createClient();
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const submitted = useRef(false);

  // If this attempt was already submitted, jump to results.
  useEffect(() => {
    supabase
      .from("benchmark_results")
      .select("score")
      .eq("session_id", session.id)
      .eq("user_id", me)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setScore(data.score);
          setPhase("done");
        }
      });
  }, [supabase, session.id, me]);

  // Countdown tick.
  useEffect(() => {
    if (phase !== "quiz") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [phase]);

  const remaining =
    startedAt != null
      ? Math.max(0, BENCHMARK.timeLimitSec - Math.floor((now - startedAt) / 1000))
      : BENCHMARK.timeLimitSec;

  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    const s = scoreAnswers(answers);
    setScore(s);
    setPhase("done");
    await supabase.from("benchmark_results").insert({
      session_id: session.id,
      user_id: me,
      cohort: session.cohort || null,
      answers,
      score: s,
      total: BENCHMARK_TOTAL,
    });
  }, [answers, supabase, session.id, session.cohort, me]);

  // Auto-submit when time runs out.
  useEffect(() => {
    if (phase === "quiz" && remaining === 0) submit();
  }, [phase, remaining, submit]);

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">
          ← Exit
        </Link>
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">
          The Benchmark
        </span>
      </div>

      {/* ---------- intro ---------- */}
      {phase === "intro" && (
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-ink">{BENCHMARK.title}</h1>
          <p className="mt-3 leading-relaxed text-slate2">{BENCHMARK.intro}</p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate2">
            <span className="rounded-lg bg-mist px-3 py-1.5">
              {BENCHMARK_TOTAL} questions
            </span>
            <span className="rounded-lg bg-mist px-3 py-1.5">
              {Math.round(BENCHMARK.timeLimitSec / 60)} min · timed
            </span>
          </div>

          {!BENCHMARK_READY ? (
            <div className="mt-6 rounded-xl bg-amber-soft px-4 py-3 text-sm text-ink">
              <b>Setup needed:</b> the questions haven&apos;t been added yet. Paste
              them into <code>lib/benchmark.ts</code> (the answer key is already
              wired), then redeploy.
            </div>
          ) : (
            <button
              onClick={() => {
                setStartedAt(Date.now());
                setNow(Date.now());
                setPhase("quiz");
              }}
              className="btn-primary mt-6"
            >
              Start the timer →
            </button>
          )}
        </div>
      )}

      {/* ---------- quiz ---------- */}
      {phase === "quiz" && (
        <div>
          <div className="sticky top-0 z-10 -mx-5 mb-4 flex items-center justify-between border-b border-line bg-paper/90 px-5 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-4">
            <span className="text-sm text-slate2">
              {Object.keys(answers).length}/{BENCHMARK_TOTAL} answered
            </span>
            <span
              className={
                "font-mono text-xl font-bold tabular-nums " +
                (remaining <= 30 ? "text-clay" : "text-ink")
              }
            >
              {mm}:{ss.toString().padStart(2, "0")}
            </span>
          </div>

          <div className="space-y-4">
            {BENCHMARK.questions.map((q) => (
              <div key={q.id} className="card p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-sage">
                  Question {q.id} of {BENCHMARK_TOTAL}
                </div>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed text-ink">
                  {q.prompt}
                </p>
                <div className="mt-4 space-y-2">
                  {q.options.map((o) => {
                    const chosen = answers[String(q.id)] === o.key;
                    return (
                      <button
                        key={o.key}
                        onClick={() =>
                          setAnswers((a) => ({ ...a, [String(q.id)]: o.key }))
                        }
                        className={
                          "flex w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition " +
                          (chosen
                            ? "border-sage bg-sage-soft"
                            : "border-line hover:border-slate-300")
                        }
                      >
                        <span
                          className={
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold " +
                            (chosen ? "bg-sage text-white" : "bg-mist text-slate2")
                          }
                        >
                          {o.key}
                        </span>
                        <span className="pt-0.5 text-ink">{o.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="sticky bottom-0 -mx-5 mt-4 border-t border-line bg-paper/90 px-5 py-3 backdrop-blur">
            <button onClick={submit} className="btn-primary w-full">
              Submit answers
            </button>
          </div>
        </div>
      )}

      {/* ---------- done ---------- */}
      {phase === "done" && (
        <div className="space-y-5">
          <div className="card p-8 text-center">
            <div className="text-sm font-semibold uppercase tracking-wide text-slate2">
              Your score
            </div>
            <div className="mt-1 text-5xl font-bold text-ink">
              {score}
              <span className="text-2xl text-slate2">/{BENCHMARK_TOTAL}</span>
            </div>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate2">
              {BENCHMARK.aiNote}
            </p>
          </div>

          <div className="card p-6">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-sage">
              How the room did
            </div>
            <BenchmarkHistogram cohort={session.cohort || "__untagged__"} yourScore={score} />
          </div>

          <Link href="/dashboard" className="btn-ghost">
            ← Back to dashboard
          </Link>
        </div>
      )}
    </main>
  );
}
