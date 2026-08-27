"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AI_NOTE } from "@/lib/benchmark";
import BenchmarkHistogram from "@/components/BenchmarkHistogram";
import { useT } from "@/components/I18nProvider";
import type { T } from "@/lib/i18n";

type Phase = "loading" | "intro" | "quiz" | "done";
type Q = { id: number; prompt: string; options: { key: string; text: string }[] };
type Cfg = { title: string; timeLimitSec: number; total: number; ready: boolean; questions: Q[] };

// Translate with a fallback to the passed-in English: if the key is missing,
// show the original rather than a key.
function tf(t: T, key: string, fallback: string) {
  const v = t(key);
  return v === key ? fallback : v;
}

export default function BenchmarkRoom({ me, session }: { me: string; session: any }) {
  const supabase = createClient();
  const t = useT();
  const [phase, setPhase] = useState<Phase>("loading");
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const submitted = useRef(false);
  const [warn, setWarn] = useState<string | null>(null);
  const firedRef = useRef<Set<number>>(new Set());

  // Load the question set + any prior result.
  useEffect(() => {
    (async () => {
      const [cfgRes, prior] = await Promise.all([
        fetch("/api/benchmark/config", { cache: "no-store" }).then((r) => r.json()),
        supabase
          .from("benchmark_results")
          .select("score")
          .eq("session_id", session.id)
          .eq("user_id", me)
          .maybeSingle(),
      ]);
      setCfg(cfgRes);
      if (prior.data) {
        setScore(prior.data.score);
        setPhase("done");
      } else {
        setPhase("intro");
      }
    })();
  }, [supabase, session.id, me]);

  useEffect(() => {
    if (phase !== "quiz") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [phase]);

  const total = cfg?.total ?? 0;
  const limit = 300; // exactly 5 minutes, auto-scored at the mark
  const remaining =
    startedAt != null ? Math.max(0, limit - Math.floor((now - startedAt) / 1000)) : limit;

  // Countdown warnings: subtle, once each, robust to skipped ticks.
  useEffect(() => {
    if (phase !== "quiz") return;
    const THRESH: [number, string][] = [[120, "2 minutes left"], [60, "1 minute left"], [30, "30 seconds"], [10, "10 seconds"]];
    for (const [th, msg] of THRESH) {
      if (remaining <= th && remaining > 0 && !firedRef.current.has(th)) { firedRef.current.add(th); setWarn(msg); }
    }
  }, [remaining, phase]);
  useEffect(() => {
    if (!warn) return;
    const id = setTimeout(() => setWarn(null), 2600);
    return () => clearTimeout(id);
  }, [warn]);

  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    const res = await fetch("/api/benchmark/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, cohort: session.cohort || null, answers }),
    }).then((r) => r.json());
    setScore(res.score ?? 0);
    setPhase("done");
  }, [answers, session.id, session.cohort]);

  useEffect(() => {
    if (phase === "quiz" && remaining === 0) submit();
  }, [phase, remaining, submit]);

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">
          ← {t("room.exit")}
        </Link>
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{t("group.benchTag")}</span>
      </div>

      {phase === "loading" && <div className="text-slate2">{t("group.benchLoading")}</div>}

      {phase === "intro" && cfg && (
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-ink">{cfg.title}</h1>
          <p className="mt-3 leading-relaxed text-slate2">
            {t("group.benchIntro", { n: cfg.total })}
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate2">
            <span className="rounded-lg bg-mist px-3 py-1.5">{t("group.benchQuestions", { n: cfg.total })}</span>
            <span className="rounded-lg bg-mist px-3 py-1.5">
              {t("group.benchMinTimed", { n: 5 })}
            </span>
            <span className="rounded-lg bg-mist px-3 py-1.5">Auto-submits at 5:00</span>
          </div>
          {!cfg.ready ? (
            <div className="mt-6 rounded-xl bg-amber-soft px-4 py-3 text-sm text-ink">
              <b>{t("group.benchNotReadyTitle")}</b> {t("group.benchNotReadyBody")} <b>{t("group.benchEditQ")}</b>{t("group.benchNotReadyBody2")}
            </div>
          ) : (
            <button
              onClick={() => {
                firedRef.current = new Set();
                setWarn(null);
                setStartedAt(Date.now());
                setNow(Date.now());
                setPhase("quiz");
              }}
              className="btn-primary mt-6"
            >
              {t("group.benchStart")} →
            </button>
          )}
        </div>
      )}

      {phase === "quiz" && cfg && (
        <div>
          <div className="sticky top-0 z-10 -mx-5 mb-4 flex items-center justify-between border-b border-line bg-paper/90 px-5 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-4">
            <span className="text-sm text-slate2">
              {t("group.benchAnswered", { n: Object.keys(answers).length, total })}
            </span>
            <span
              className={
                "font-mono text-xl font-bold tabular-nums transition-colors " +
                (remaining <= 10 ? "bench-pulse text-clay" : remaining <= 30 ? "text-clay" : remaining <= 60 ? "text-amber" : "text-ink")
              }
            >
              {mm}:{ss.toString().padStart(2, "0")}
            </span>
          </div>

          {/* Subtle countdown warnings */}
          {warn && (
            <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center px-4">
              <div key={warn} className="bench-warn rounded-full bg-ink/90 px-4 py-2 text-sm font-semibold text-white shadow-lift backdrop-blur">{warn}</div>
            </div>
          )}
          <style>{`
            @keyframes bench-warn-in { 0% { opacity: 0; transform: translateY(-8px) scale(.96); } 12% { opacity: 1; transform: none; } 88% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(-6px); } }
            .bench-warn { animation: bench-warn-in 2.6s ease-in-out both; }
            @keyframes bench-pulse-k { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
            .bench-pulse { animation: bench-pulse-k 1s ease-in-out infinite; }
            @media (prefers-reduced-motion: reduce) { .bench-warn, .bench-pulse { animation: none; } }
          `}</style>

          <div className="space-y-4">
            {cfg.questions.map((q) => (
              <div key={q.id} className="card p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-sage">
                  {t("group.benchQuestionOf", { n: q.id, total })}
                </div>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed text-ink">{q.prompt}</p>
                <div className="mt-4 space-y-2">
                  {q.options.map((o) => {
                    const chosen = answers[String(q.id)] === o.key;
                    return (
                      <button
                        key={o.key}
                        onClick={() => setAnswers((a) => ({ ...a, [String(q.id)]: o.key }))}
                        className={
                          "flex w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition " +
                          (chosen ? "border-sage bg-sage-soft" : "border-line hover:border-slate-300")
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
              {t("group.benchSubmit")}
            </button>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-5">
          <div className="card p-8 text-center">
            <div className="text-sm font-semibold uppercase tracking-wide text-slate2">{t("group.benchYourScore")}</div>
            <div className="mt-1 text-5xl font-bold text-ink">
              {score}
              <span className="text-2xl text-slate2">/{total || (cfg?.total ?? 7)}</span>
            </div>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate2">{AI_NOTE}</p>
          </div>

          <div className="card p-6">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-sage">
              {t("group.benchHowRoom")}
            </div>
            <BenchmarkHistogram cohort={session.cohort || "__untagged__"} yourScore={score} />
          </div>

          <Link href="/dashboard" className="btn-ghost">
            ← {t("group.benchBackDash")}
          </Link>
        </div>
      )}
    </main>
  );
}
