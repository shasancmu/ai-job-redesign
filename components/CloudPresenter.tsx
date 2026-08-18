"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { aggregate, type CloudWord } from "@/lib/cloud";
import WordCloud from "@/components/WordCloud";

type Summary = { themes: string[]; answer: string } | null;

// Mentimeter-style presenter: the join code + QR stay on screen the whole time
// (top bar), the cloud builds up LIVE as people submit, and a big join splash
// fills the screen only until the first response lands.
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
  const [words, setWords] = useState<CloudWord[]>([]);
  const [total, setTotal] = useState(0);
  const [hideResults, setHideResults] = useState(false); // presenter-only "collect first, reveal later"
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [summarizing, setSummarizing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isFull, setIsFull] = useState(false);
  const closed = status === "closed";
  const empty = total === 0;

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

  async function summarize() {
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
  }

  const joinPill = (
    <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-line bg-white px-3 py-2 shadow-soft">
      {qrSvg ? (
        <div className="h-14 w-14 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
      ) : null}
      <div className="leading-tight">
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{joinHost}</div>
        <div className="font-mono text-2xl font-bold tracking-widest text-ink">{code}</div>
      </div>
    </div>
  );

  return (
    <div ref={stageRef} className="flex min-h-screen flex-col bg-paper">
      {/* Top bar: response tally + persistent join code + controls */}
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white/85 px-6 py-3 backdrop-blur">
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-ink">{total}</span> response{total === 1 ? "" : "s"}
          {words.length > 0 && <> · <span className="font-semibold text-ink">{words.length}</span> unique</>}
          {closed && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">closed</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!empty && joinPill}
          {!closed && !empty && (
            <button onClick={() => setHideResults((h) => !h)} className="btn-ghost text-sm">
              {hideResults ? "Show results" : "Hide results"}
            </button>
          )}
          <button onClick={summarize} disabled={summarizing || total === 0} className="btn-dark text-sm" title="Summarize the responses with AI">
            {summarizing ? "Summarizing…" : "AI summary"}
          </button>
          <button onClick={toggleFull} className="btn-ghost text-sm" title="Fullscreen">
            {isFull ? "Exit full" : "⤢ Full"}
          </button>
          {!isFull && <Link href="/facilitator/cloud" className="btn-ghost text-sm">Done</Link>}
          {!closed ? (
            <button
              onClick={() => window.confirm("Close this word cloud? No new responses will be accepted.") && setStatusPersist("closed")}
              className="text-sm text-slate-400 hover:text-ink"
            >
              Close
            </button>
          ) : null}
        </div>
      </header>

      {/* Question */}
      <div className="px-6 pt-6 text-center">
        <textarea
          value={q}
          onChange={(e) => editQuestion(e.target.value)}
          rows={1}
          placeholder="Type your question…"
          className="mx-auto block w-full max-w-4xl resize-none border-0 bg-transparent p-0 text-center text-3xl font-bold leading-tight text-ink outline-none focus:ring-0 sm:text-4xl"
        />
      </div>

      {err && <div className="mx-6 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      {/* Stage: live cloud (default), or the big join splash until the first response */}
      <div className="relative flex-1">
        {empty ? (
          <JoinSplash qrSvg={qrSvg} code={code} joinHost={joinHost} closed={closed} />
        ) : hideResults ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <div className="text-6xl font-extrabold text-sage">{total}</div>
            <div className="text-lg text-slate-500">response{total === 1 ? "" : "s"} in. Results hidden.</div>
            <button onClick={() => setHideResults(false)} className="btn-primary mt-2">Show results</button>
          </div>
        ) : (
          <div className="absolute inset-0 p-6 pt-2">
            <WordCloud words={words} />
          </div>
        )}
      </div>

      {/* AI summary */}
      {summary && (
        <section className="border-t border-line bg-mist px-6 py-5">
          <div className="mx-auto max-w-4xl">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">What the room said</div>
            {summary.themes?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {summary.themes.map((t, i) => (
                  <span key={i} className="rounded-full bg-white px-3 py-1 text-sm font-medium text-ink shadow-soft">{t}</span>
                ))}
              </div>
            )}
            {summary.answer && <p className="mt-3 max-w-3xl leading-relaxed text-ink">{summary.answer}</p>}
          </div>
        </section>
      )}
    </div>
  );
}

function JoinSplash({
  qrSvg,
  code,
  joinHost,
  closed,
}: {
  qrSvg: string;
  code: string;
  joinHost: string;
  closed: boolean;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-12">
        {qrSvg ? (
          <div className="h-56 w-56 rounded-2xl bg-white p-4 shadow-lift [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
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
      <div className="text-lg text-slate-400">
        {closed ? "This cloud is closed." : "Waiting for the first response…"}
      </div>
    </div>
  );
}
