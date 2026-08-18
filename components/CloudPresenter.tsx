"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { aggregate, type CloudWord } from "@/lib/cloud";
import WordCloud from "@/components/WordCloud";

type Summary = { themes: string[]; answer: string } | null;
type Phase = "collecting" | "cloud" | "summary";

// The presentation. Three deliberate acts: collect (responses hidden, only the
// count climbs), reveal the cloud (words materialize), reveal the AI summary
// (the cloud recedes behind an arresting synthesis). Built to make a room go ooh.
export default function CloudPresenter({
  sessionId,
  code,
  question,
  initialStatus,
  initialSummary,
  joinHost,
  qrSvg,
}: {
  sessionId: string;
  code: string;
  question: string;
  initialStatus: string;
  initialSummary: Summary;
  joinUrl: string;
  joinHost: string;
  qrSvg: string;
}) {
  const supabase = createClient();
  const stageRef = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState(question);
  const [status, setStatus] = useState(initialStatus);
  const [phase, setPhase] = useState<Phase>("collecting");
  const [words, setWords] = useState<CloudWord[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [summarizing, setSummarizing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isFull, setIsFull] = useState(false);
  const closed = status === "closed";
  const displayTotal = useCountUp(total);

  // Poll submissions. RLS scopes cloud_entries to the host's own session.
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("cloud_entries")
      .select("text, norm")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (data) {
      setTotal(data.length);
      setWords(aggregate(data as any));
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

  // Persist the question (debounced) so participants and reloads see it.
  const qTimer = useRef<any>(null);
  function editQuestion(v: string) {
    setQ(v);
    if (qTimer.current) clearTimeout(qTimer.current);
    qTimer.current = setTimeout(() => {
      supabase.from("cloud_sessions").update({ question: v, updated_at: new Date().toISOString() }).eq("id", sessionId);
    }, 500);
  }

  async function setStatusPersist(next: string) {
    setStatus(next);
    await supabase.from("cloud_sessions").update({ status: next, updated_at: new Date().toISOString() }).eq("id", sessionId);
  }

  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    else stageRef.current?.requestFullscreen?.();
  }

  const summarize = useCallback(async () => {
    setSummarizing(true);
    setErr(null);
    try {
      const res = await fetch("/api/cloud/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setErr(data.error || "Couldn't summarize.");
      else setSummary(data.summary);
    } catch {
      setErr("Couldn't summarize.");
    } finally {
      setSummarizing(false);
    }
  }, [code]);

  function revealSummary() {
    setPhase("summary");
    if (!summary && !summarizing) summarize();
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

      {/* Top bar: unobtrusive, brightens on hover so it stays out of the way. */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-6 py-3 opacity-70 transition hover:opacity-100">
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-ink">{total}</span> response{total === 1 ? "" : "s"}
          {phase !== "collecting" && words.length > 0 && <> · <span className="font-semibold text-ink">{words.length}</span> unique</>}
          {closed && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">closed</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {phase !== "collecting" && joinPill}
          <button onClick={toggleFull} className="btn-ghost text-sm" title="Fullscreen">{isFull ? "Exit full" : "⤢ Full"}</button>
          {!isFull && <Link href="/facilitator/cloud" className="btn-ghost text-sm">Done</Link>}
          {!closed && (
            <button
              onClick={() => window.confirm("Close this word cloud? No new responses will be accepted.") && setStatusPersist("closed")}
              className="text-sm text-slate-400 hover:text-ink"
            >
              Close
            </button>
          )}
        </div>
      </header>

      {/* Question */}
      <div className="relative z-10 px-6 pt-4 text-center">
        <textarea
          value={q}
          onChange={(e) => editQuestion(e.target.value)}
          rows={1}
          placeholder="Type your question…"
          className="mx-auto block w-full max-w-4xl resize-none border-0 bg-transparent p-0 text-center text-3xl font-bold leading-tight text-ink outline-none focus:ring-0 sm:text-4xl"
        />
      </div>

      {err && <div className="relative z-20 mx-auto mt-3 max-w-lg rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">{err}</div>}

      {/* Stage */}
      <div className="relative z-10 flex-1">
        {phase === "collecting" ? (
          <JoinSplash qrSvg={qrSvg} code={code} joinHost={joinHost} count={displayTotal} raw={total} closed={closed} />
        ) : (
          <>
            <div className={"absolute inset-0 p-4 transition-all duration-700 " + (phase === "summary" ? "scale-[0.92] blur-md opacity-20" : "opacity-100")}>
              <WordCloud words={words} />
            </div>
            {phase === "summary" && (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <SummaryReveal summary={summary} loading={summarizing} onRetry={summarize} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Staged primary action, centered at the foot like a presenter remote. */}
      <div className="relative z-20 flex items-center justify-center gap-3 px-6 pb-7 pt-2">
        {phase === "collecting" ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setPhase("cloud")}
              disabled={total === 0}
              className={"cloud-cta rounded-full px-8 py-3.5 text-lg font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 " + (total > 0 ? "cloud-cta-glow" : "")}
            >
              Reveal the cloud →
            </button>
            <span className="text-xs text-slate-400">{total === 0 ? "Waiting for the first response…" : "Reveal when everyone's in"}</span>
          </div>
        ) : phase === "cloud" ? (
          <button onClick={revealSummary} className="cloud-cta cloud-cta-glow rounded-full px-8 py-3.5 text-lg font-semibold text-white transition">
            Reveal the AI summary →
          </button>
        ) : (
          <button onClick={() => setPhase("cloud")} className="btn-ghost text-sm">← Back to the cloud</button>
        )}
      </div>

      <StyleBlock />
    </div>
  );
}

// -- Collecting: big join + a live, tension-building response core -------------
const DOT_COLORS = ["var(--sage)", "var(--sky)", "var(--amber)", "var(--clay)", "var(--ink)"];
const DOT_CAP = 300;

function JoinSplash({
  qrSvg,
  code,
  joinHost,
  count,
  raw,
  closed,
}: {
  qrSvg: string;
  code: string;
  joinHost: string;
  count: number; // smoothed, for the headline figure
  raw: number; // true count, for the dot swarm + ripple
  closed: boolean;
}) {
  const dots = Math.min(raw, DOT_CAP);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-7 px-6 text-center">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-14">
        {qrSvg ? (
          <div className="cloud-qr h-52 w-52 rounded-3xl bg-white p-4 shadow-lift [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        ) : null}
        <div className="text-left">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Join from your phone</div>
          <div className="mt-1 text-2xl font-medium text-slate2">
            Go to <span className="font-bold text-ink">{joinHost}</span>
          </div>
          <div className="mt-3 text-sm text-slate-400">and enter the code</div>
          <div className="font-mono text-7xl font-extrabold tracking-[0.15em] text-ink">{code}</div>
        </div>
      </div>

      {closed ? (
        <div className="text-lg text-slate-400">this cloud is closed</div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="cloud-livepill inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur">
            <span className="cloud-livedot" /> Live · collecting
          </div>

          {/* Pulse core: heartbeat halo, a ripple per incoming batch, gradient count */}
          <div className="relative flex h-40 w-full items-center justify-center">
            <span className="cloud-halo" aria-hidden />
            {raw > 0 && <span key={raw} className="cloud-ripple" aria-hidden />}
            <div key={raw} className="cloud-countpop relative">
              <span className="cloud-ai-text text-[7rem] font-extrabold leading-none tabular-nums sm:text-[8.5rem]">{count}</span>
            </div>
          </div>

          <div className="-mt-2 text-lg text-slate-400">
            {raw === 1 ? "response" : "responses"} and counting<span className="cloud-elly" />
          </div>

          {/* The room filling in: one dot per response, popping in as they land */}
          {dots > 0 && (
            <div className="mt-1 flex max-w-2xl flex-wrap items-center justify-center gap-1.5">
              {Array.from({ length: dots }).map((_, i) => (
                <span
                  key={i}
                  className="cloud-dot"
                  style={{ background: DOT_COLORS[i % DOT_COLORS.length], animationDelay: `${(i % 10) * 30}ms` }}
                />
              ))}
              {raw > DOT_CAP && <span className="ml-1 text-sm font-semibold text-slate-400">+{raw - DOT_CAP}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -- The arresting AI summary -------------------------------------------------
function SummaryReveal({ summary, loading, onRetry }: { summary: Summary; loading: boolean; onRetry: () => void }) {
  return (
    <div className="cloud-rise w-full max-w-3xl">
      <div className="cloud-sum-border rounded-[26px]">
        <div className="rounded-[24px] bg-white/85 px-8 py-8 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="cloud-ai-dot" />
            <span className="cloud-ai-text">Synthesized live by AI</span>
          </div>

          {loading ? (
            <div className="mt-6 space-y-3">
              <div className="cloud-shimmer h-6 w-2/3 rounded-full" />
              <div className="cloud-shimmer h-4 w-full rounded-full" />
              <div className="cloud-shimmer h-4 w-11/12 rounded-full" />
              <div className="cloud-shimmer h-4 w-4/5 rounded-full" />
              <div className="mt-4 text-sm text-slate-400">Reading the room…</div>
            </div>
          ) : !summary ? (
            <div className="mt-6 text-slate-500">
              Couldn&apos;t build a summary yet.{" "}
              <button onClick={onRetry} className="font-medium text-ink underline">Try again</button>
            </div>
          ) : (
            <>
              {summary.themes?.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {summary.themes.map((t, i) => (
                    <span
                      key={i}
                      className="cloud-theme rounded-full border border-line bg-white px-4 py-1.5 text-base font-semibold text-ink shadow-soft"
                      style={{ animationDelay: `${240 + i * 110}ms` }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {summary.answer && (
                <p
                  className="cloud-answer mt-6 text-xl leading-relaxed text-ink"
                  style={{ animationDelay: `${300 + (summary.themes?.length || 0) * 110}ms` }}
                >
                  {summary.answer}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// -- Ambient drifting aurora backdrop -----------------------------------------
function Aurora() {
  return (
    <div className="cloud-aurora" aria-hidden>
      <span className="cloud-blob b1" />
      <span className="cloud-blob b2" />
      <span className="cloud-blob b3" />
    </div>
  );
}

// Smoothly tween a displayed number toward a target (for the climbing counter).
function useCountUp(target: number, ms = 650): number {
  const [val, setVal] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    from.current = val;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from.current + (target - from.current) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return val;
}

function StyleBlock() {
  return (
    <style>{`
      /* Ambient aurora */
      .cloud-aurora { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
      .cloud-blob { position: absolute; border-radius: 9999px; filter: blur(90px); opacity: .13; will-change: transform; }
      .cloud-blob.b1 { width: 46vw; height: 46vw; left: -10vw; top: -12vw; background: radial-gradient(circle at 40% 40%, var(--sage), transparent 68%); animation: cloud-drift1 30s ease-in-out infinite; }
      .cloud-blob.b2 { width: 42vw; height: 42vw; right: -12vw; top: 6vh; background: radial-gradient(circle at 50% 50%, var(--sky), transparent 68%); animation: cloud-drift2 34s ease-in-out infinite; }
      .cloud-blob.b3 { width: 40vw; height: 40vw; left: 22vw; bottom: -16vw; background: radial-gradient(circle at 50% 50%, var(--amber), transparent 68%); animation: cloud-drift3 38s ease-in-out infinite; }
      @keyframes cloud-drift1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(6vw,4vh) scale(1.08); } }
      @keyframes cloud-drift2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-5vw,6vh) scale(1.1); } }
      @keyframes cloud-drift3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(4vw,-5vh) scale(1.06); } }

      /* Primary CTA */
      .cloud-cta { background: var(--ink); }
      .cloud-cta-glow { animation: cloud-cta-glow 2.6s ease-in-out infinite; }
      @keyframes cloud-cta-glow {
        0%,100% { box-shadow: 0 12px 34px -12px rgba(20,40,58,.5), 0 0 0 0 rgba(63,122,82,0); }
        50%     { box-shadow: 0 12px 34px -12px rgba(20,40,58,.5), 0 0 34px 3px rgba(63,122,82,.28); }
      }

      /* Anticipation: live pill, heartbeat halo, ripple, count pop, dot swarm */
      .cloud-qr { animation: cloud-qr-in .6s ease both; }
      @keyframes cloud-qr-in { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }

      .cloud-livedot { width: 8px; height: 8px; border-radius: 9999px; background: #e0483b; box-shadow: 0 0 0 0 rgba(224,72,59,.5); animation: cloud-livedot 1.6s ease-in-out infinite; }
      @keyframes cloud-livedot { 0% { box-shadow: 0 0 0 0 rgba(224,72,59,.5); } 70% { box-shadow: 0 0 0 7px rgba(224,72,59,0); } 100% { box-shadow: 0 0 0 0 rgba(224,72,59,0); } }
      .cloud-livepill { animation: cloud-fade-in .5s ease both; }
      @keyframes cloud-fade-in { from { opacity: 0; } to { opacity: 1; } }

      .cloud-halo { position: absolute; width: 340px; height: 340px; border-radius: 9999px; background: radial-gradient(circle, color-mix(in srgb, var(--sage) 30%, transparent), transparent 62%); filter: blur(6px); animation: cloud-halo 2.4s ease-in-out infinite; }
      @keyframes cloud-halo { 0%,100% { transform: scale(.9); opacity: .5; } 50% { transform: scale(1.06); opacity: .85; } }
      .cloud-ripple { position: absolute; width: 150px; height: 150px; border-radius: 9999px; border: 2px solid color-mix(in srgb, var(--sky) 55%, transparent); animation: cloud-ripple 1.1s cubic-bezier(.2,.7,.25,1) forwards; }
      @keyframes cloud-ripple { 0% { transform: scale(.5); opacity: .7; } 100% { transform: scale(2.6); opacity: 0; } }
      .cloud-countpop { animation: cloud-count-pop .45s cubic-bezier(.2,.8,.2,1); }
      @keyframes cloud-count-pop { 0% { transform: scale(.86); } 55% { transform: scale(1.09); } 100% { transform: scale(1); } }

      .cloud-elly::after { content: "…"; animation: cloud-elly 1.4s steps(4, end) infinite; }
      @keyframes cloud-elly { 0% { content: ""; } 25% { content: "."; } 50% { content: ".."; } 75% { content: "…"; } }

      .cloud-dot { width: 10px; height: 10px; border-radius: 9999px; animation: cloud-dot-in .5s cubic-bezier(.2,.8,.2,1) both; }
      @keyframes cloud-dot-in { 0% { opacity: 0; transform: translateY(10px) scale(0); } 60% { transform: translateY(0) scale(1.35); } 100% { opacity: .9; transform: scale(1); } }

      /* Summary reveal */
      .cloud-rise { animation: cloud-rise .6s cubic-bezier(.2,.7,.25,1) both; }
      @keyframes cloud-rise { from { opacity: 0; transform: translateY(26px) scale(.96); } to { opacity: 1; transform: none; } }
      .cloud-sum-border { padding: 1.5px; background: linear-gradient(120deg, var(--sage), var(--sky), var(--amber), var(--sage)); background-size: 300% 100%; animation: cloud-grad 7s linear infinite; box-shadow: 0 30px 80px -30px rgba(20,40,58,.5); }
      @keyframes cloud-grad { to { background-position: 300% 0; } }
      .cloud-ai-text { background: linear-gradient(90deg, var(--sage), var(--sky), var(--amber), var(--sage)); background-size: 300% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: cloud-grad 6s linear infinite; }
      .cloud-ai-dot { width: 9px; height: 9px; border-radius: 9999px; background: linear-gradient(120deg, var(--sage), var(--sky)); box-shadow: 0 0 10px 1px color-mix(in srgb, var(--sky) 55%, transparent); animation: cloud-pulse 1.8s ease-in-out infinite; }
      @keyframes cloud-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.35); opacity: .7; } }
      .cloud-theme { animation: cloud-pop .5s cubic-bezier(.2,.7,.25,1) both; }
      @keyframes cloud-pop { from { opacity: 0; transform: translateY(14px) scale(.9); } to { opacity: 1; transform: none; } }
      .cloud-answer { animation: cloud-fade-up .7s ease both; }
      @keyframes cloud-fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
      .cloud-shimmer { background: linear-gradient(90deg, #eef2f7 25%, #e2e8f0 50%, #eef2f7 75%); background-size: 200% 100%; animation: cloud-shimmer 1.3s linear infinite; }
      @keyframes cloud-shimmer { to { background-position: -200% 0; } }

      @media (prefers-reduced-motion: reduce) {
        .cloud-blob, .cloud-cta-glow, .cloud-qr, .cloud-rise, .cloud-sum-border,
        .cloud-ai-text, .cloud-ai-dot, .cloud-theme, .cloud-answer, .cloud-shimmer,
        .cloud-livedot, .cloud-livepill, .cloud-halo, .cloud-ripple, .cloud-countpop,
        .cloud-dot { animation: none !important; }
        .cloud-elly::after { content: "…"; animation: none !important; }
      }
    `}</style>
  );
}
