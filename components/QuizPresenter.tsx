"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AI_NOTE } from "@/lib/benchmark";
import QuizResults from "@/components/QuizResults";
import PresenterFX from "@/components/PresenterFX";
import { Aurora, JoinSplash, RevealBurst, useCountUp } from "@/components/presenterParts";

type Phase = "collecting" | "results" | "machine";

// The standalone benchmark presenter — collect (hidden, count climbs), reveal
// the room's score distribution, then reveal the machine's punchline.
export default function QuizPresenter({
  sessionId,
  code,
  initialStatus,
  joinHost,
  qrSvg,
  total,
}: {
  sessionId: string;
  code: string;
  initialStatus: string;
  joinHost: string;
  qrSvg: string;
  total: number;
}) {
  const supabase = createClient();
  const stageRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState(initialStatus);
  const [phase, setPhase] = useState<Phase>("collecting");
  const [scores, setScores] = useState<number[]>([]);
  const [count, setCount] = useState(0);
  const [isFull, setIsFull] = useState(false);
  const closed = status === "closed";
  const displayCount = useCountUp(count);

  const [ripples, setRipples] = useState<{ id: number; delay: number }[]>([]);
  const [burst, setBurst] = useState(0);
  const ridRef = useRef(0);
  const prevRef = useRef(0);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("quiz_submissions")
      .select("score, total")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (data) {
      setCount(data.length);
      setScores(data.map((d: any) => d.score));
    }
  }, [supabase, sessionId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 2500);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const delta = count - prevRef.current;
    prevRef.current = count;
    if (delta <= 0 || phase !== "collecting") return;
    const n = Math.min(delta, 6);
    const items = Array.from({ length: n }).map((_, i) => ({ id: ++ridRef.current, delay: i * 120 }));
    setRipples((r) => [...r, ...items]);
    items.forEach((it, i) => setTimeout(() => setRipples((r) => r.filter((x) => x.id !== it.id)), 1300 + i * 120));
  }, [count, phase]);

  function revealResults() {
    setPhase("results");
    setBurst((b) => b + 1);
  }

  async function setStatusPersist(next: string) {
    setStatus(next);
    await supabase.from("quiz_sessions").update({ status: next, updated_at: new Date().toISOString() }).eq("id", sessionId);
  }

  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    else stageRef.current?.requestFullscreen?.();
  }

  const joinPill = (
    <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-line bg-white/80 px-3 py-2 shadow-soft backdrop-blur">
      {qrSvg ? <div className="h-12 w-12 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} /> : null}
      <div className="leading-tight">
        <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{joinHost}</div>
        <div className="font-mono text-xl font-bold tracking-widest text-ink">{code}</div>
      </div>
    </div>
  );

  return (
    <div ref={stageRef} className="relative flex min-h-screen flex-col overflow-hidden bg-paper">
      <Aurora />

      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-6 py-3 opacity-70 transition hover:opacity-100">
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-ink">{count}</span> submitted
          {closed && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">closed</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {phase !== "collecting" && joinPill}
          <button onClick={toggleFull} className="btn-ghost text-sm" title="Fullscreen">{isFull ? "Exit full" : "⤢ Full"}</button>
          {!isFull && <Link href="/facilitator/quiz" className="btn-ghost text-sm">Done</Link>}
          {!closed && (
            <button
              onClick={() => window.confirm("Close this quiz? No new submissions will be accepted.") && setStatusPersist("closed")}
              className="text-sm text-slate-400 hover:text-ink"
            >
              Close
            </button>
          )}
        </div>
      </header>

      <div className="relative z-10 px-6 pt-4 text-center">
        <h1 className="text-3xl font-bold leading-tight text-ink sm:text-4xl">The Benchmark</h1>
        <p className="mt-1 text-sm text-slate2">You vs. the machine</p>
      </div>

      <div className="relative z-10 flex-1">
        {phase === "collecting" ? (
          <JoinSplash qrSvg={qrSvg} code={code} joinHost={joinHost} count={displayCount} raw={count} ripples={ripples} closed={closed} label="submitted" />
        ) : (
          <>
            <div className={"absolute inset-0 p-6 transition-all duration-700 " + (phase === "machine" ? "scale-[0.95] blur-md opacity-20" : "opacity-100")}>
              <QuizResults scores={scores} total={total} />
            </div>
            {phase === "results" && burst > 0 && <RevealBurst key={burst} />}
            {phase === "machine" && (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="cloud-rise w-full max-w-3xl">
                  <div className="cloud-sum-border rounded-[26px]">
                    <div className="rounded-[24px] bg-white/85 px-8 py-8 text-center backdrop-blur-xl">
                      <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                        <span className="cloud-ai-dot" />
                        <span className="cloud-ai-text">The machine</span>
                      </div>
                      <p className="cloud-answer mx-auto mt-5 max-w-2xl text-2xl font-medium leading-relaxed text-ink">{AI_NOTE}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="relative z-20 flex items-center justify-center gap-3 px-6 pb-7 pt-2">
        {phase === "collecting" ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={revealResults}
              disabled={count === 0}
              className={"cloud-cta rounded-full px-8 py-3.5 text-lg font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 " + (count > 0 ? "cloud-cta-glow" : "")}
            >
              Reveal the results →
            </button>
            <span className="text-xs text-slate-400">{count === 0 ? "Waiting for the first submission…" : "Reveal when everyone's done"}</span>
          </div>
        ) : phase === "results" ? (
          <button onClick={() => setPhase("machine")} className="cloud-cta cloud-cta-glow rounded-full px-8 py-3.5 text-lg font-semibold text-white transition">
            Reveal the machine →
          </button>
        ) : (
          <button onClick={() => setPhase("results")} className="btn-ghost text-sm">← Back to the results</button>
        )}
      </div>

      <PresenterFX />
    </div>
  );
}
