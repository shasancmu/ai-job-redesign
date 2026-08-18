"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { PhotoEntry } from "@/lib/photo";
import PhotoWall from "@/components/PhotoWall";
import PresenterFX from "@/components/PresenterFX";
import { Aurora, JoinSplash, RevealBurst, SummaryReveal, useCountUp, type Summary } from "@/components/presenterParts";

type Phase = "collecting" | "wall" | "summary";

// Photo Wall presenter — same three acts as the word cloud: collect (photos
// hidden, only the count climbs), reveal the wall (AI readings materialize),
// reveal the AI summary. The image is never shown or stored, only its text.
export default function PhotoPresenter({
  sessionId,
  code,
  prompt,
  initialStatus,
  initialSummary,
  joinHost,
  qrSvg,
}: {
  sessionId: string;
  code: string;
  prompt: string;
  initialStatus: string;
  initialSummary: Summary;
  joinHost: string;
  qrSvg: string;
}) {
  const supabase = createClient();
  const stageRef = useRef<HTMLDivElement>(null);

  const [p, setP] = useState(prompt);
  const [status, setStatus] = useState(initialStatus);
  const [phase, setPhase] = useState<Phase>("collecting");
  const [entries, setEntries] = useState<PhotoEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [summarizing, setSummarizing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isFull, setIsFull] = useState(false);
  const closed = status === "closed";
  const displayTotal = useCountUp(total);

  const [ripples, setRipples] = useState<{ id: number; delay: number }[]>([]);
  const [burst, setBurst] = useState(0);
  const ridRef = useRef(0);
  const prevTotalRef = useRef(0);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("photo_entries")
      .select("id, kind, title, description, transcript")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (data) {
      setEntries(data as any);
      setTotal(data.length);
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
    const delta = total - prevTotalRef.current;
    prevTotalRef.current = total;
    if (delta <= 0 || phase !== "collecting") return;
    const n = Math.min(delta, 6);
    const items = Array.from({ length: n }).map((_, i) => ({ id: ++ridRef.current, delay: i * 120 }));
    setRipples((r) => [...r, ...items]);
    items.forEach((it, i) => setTimeout(() => setRipples((r) => r.filter((x) => x.id !== it.id)), 1300 + i * 120));
  }, [total, phase]);

  function revealWall() {
    setPhase("wall");
    setBurst((b) => b + 1);
  }

  const qTimer = useRef<any>(null);
  function editPrompt(v: string) {
    setP(v);
    if (qTimer.current) clearTimeout(qTimer.current);
    qTimer.current = setTimeout(() => {
      supabase.from("photo_sessions").update({ prompt: v, updated_at: new Date().toISOString() }).eq("id", sessionId);
    }, 500);
  }

  async function setStatusPersist(next: string) {
    setStatus(next);
    await supabase.from("photo_sessions").update({ status: next, updated_at: new Date().toISOString() }).eq("id", sessionId);
  }

  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    else stageRef.current?.requestFullscreen?.();
  }

  const summarize = useCallback(async () => {
    setSummarizing(true);
    setErr(null);
    try {
      const res = await fetch("/api/photo/summarize", {
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

      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-6 py-3 opacity-70 transition hover:opacity-100">
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-ink">{total}</span> photo{total === 1 ? "" : "s"}
          {closed && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">closed</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {phase !== "collecting" && joinPill}
          <button onClick={toggleFull} className="btn-ghost text-sm" title="Fullscreen">{isFull ? "Exit full" : "⤢ Full"}</button>
          {!isFull && <Link href="/facilitator/photo" className="btn-ghost text-sm">Done</Link>}
          {!closed && (
            <button
              onClick={() => window.confirm("Close this activity? No new photos will be accepted.") && setStatusPersist("closed")}
              className="text-sm text-slate-400 hover:text-ink"
            >
              Close
            </button>
          )}
        </div>
      </header>

      {/* Prompt */}
      <div className="relative z-10 px-6 pt-4 text-center">
        <textarea
          value={p}
          onChange={(e) => editPrompt(e.target.value)}
          rows={1}
          placeholder="Type your prompt… (e.g. Photograph something on your desk that AI can't replace)"
          className="mx-auto block w-full max-w-4xl resize-none border-0 bg-transparent p-0 text-center text-3xl font-bold leading-tight text-ink outline-none focus:ring-0 sm:text-4xl"
        />
      </div>

      {err && <div className="relative z-20 mx-auto mt-3 max-w-lg rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">{err}</div>}

      {/* Stage */}
      <div className="relative z-10 flex-1">
        {phase === "collecting" ? (
          <JoinSplash qrSvg={qrSvg} code={code} joinHost={joinHost} count={displayTotal} raw={total} ripples={ripples} closed={closed} label="photos" />
        ) : (
          <>
            <div className={"absolute inset-0 pt-2 transition-all duration-700 " + (phase === "summary" ? "scale-[0.94] blur-md opacity-20" : "opacity-100")}>
              <PhotoWall entries={entries} />
            </div>
            {phase === "wall" && burst > 0 && <RevealBurst key={burst} />}
            {phase === "summary" && (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <SummaryReveal summary={summary} loading={summarizing} onRetry={summarize} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Staged primary action */}
      <div className="relative z-20 flex items-center justify-center gap-3 px-6 pb-7 pt-2">
        {phase === "collecting" ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={revealWall}
              disabled={total === 0}
              className={"cloud-cta rounded-full px-8 py-3.5 text-lg font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 " + (total > 0 ? "cloud-cta-glow" : "")}
            >
              Reveal the wall →
            </button>
            <span className="text-xs text-slate-400">{total === 0 ? "Waiting for the first photo…" : "Reveal when everyone's in"}</span>
          </div>
        ) : phase === "wall" ? (
          <button onClick={revealSummary} className="cloud-cta cloud-cta-glow rounded-full px-8 py-3.5 text-lg font-semibold text-white transition">
            Reveal the AI summary →
          </button>
        ) : (
          <button onClick={() => setPhase("wall")} className="btn-ghost text-sm">← Back to the wall</button>
        )}
      </div>

      <PresenterFX />
    </div>
  );
}
