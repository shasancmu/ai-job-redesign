"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Item = { title: string; detail: string };
type Pulse = { headline: string; emerging: Item[]; tensions: Item[]; outliers: Item[] } | null;
type Ask = { answer: string; quotes: { who: string; text: string }[] } | null;

const REFRESH_MS = 18000;

// Live Room Intelligence: reads the whole cohort's in-progress work every ~18s
// and surfaces cross-person patterns, plus an "ask the room" box.
export default function RoomIntel({ cohort, cohortName }: { cohort: string; cohortName: string }) {
  const [pulse, setPulse] = useState<Pulse>(null);
  const [people, setPeople] = useState(0);
  const [empty, setEmpty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatedAgo, setUpdatedAgo] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [isFull, setIsFull] = useState(false);

  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);
  const [ask, setAsk] = useState<Ask>(null);
  const [askedQ, setAskedQ] = useState("");

  const fetchPulse = useCallback(async () => {
    try {
      const res = await fetch("/api/facilitator/room/pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cohort }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(d.error || "Couldn't read the room."); return; }
      setErr(null);
      setPeople(d.participantCount || 0);
      setEmpty(!!d.empty);
      if (d.pulse) setPulse(d.pulse);
      setUpdatedAgo(0);
    } catch {
      setErr("Couldn't reach the room.");
    } finally {
      setLoading(false);
    }
  }, [cohort]);

  useEffect(() => {
    fetchPulse();
    const id = setInterval(fetchPulse, REFRESH_MS);
    const tick = setInterval(() => setUpdatedAgo((s) => s + 1), 1000);
    return () => { clearInterval(id); clearInterval(tick); };
  }, [fetchPulse]);

  useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  async function submitAsk(e: React.FormEvent) {
    e.preventDefault();
    const question = q.trim();
    if (!question || asking) return;
    setAsking(true);
    setAsk(null);
    setAskedQ(question);
    try {
      const res = await fetch("/api/facilitator/room/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cohort, question }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setAsk({ answer: d.answer || "", quotes: d.quotes || [] });
      else setAsk({ answer: d.error || "Couldn't ask the room.", quotes: [] });
    } catch {
      setAsk({ answer: "Couldn't reach the room.", quotes: [] });
    } finally {
      setAsking(false);
    }
  }

  const cols: { key: keyof NonNullable<Pulse>; label: string; accent: string; empty: string }[] = [
    { key: "emerging", label: "Emerging across the room", accent: "#3F7A52", empty: "No shared pattern yet." },
    { key: "tensions", label: "Tensions showing up", accent: "#C06A47", empty: "No tension surfacing yet." },
    { key: "outliers", label: "Only one person raised", accent: "#4E79C9", empty: "Nothing singular yet." },
  ];

  return (
    <div ref={stageRef} className="flex min-h-screen flex-col bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sage" />
          </span>
          <span className="text-sm font-semibold text-ink">Live room intelligence</span>
          <span className="font-mono text-sm text-slate-400">{cohortName}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span><b className="font-semibold text-ink">{people}</b> in the room</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">{loading ? "reading…" : `updated ${updatedAgo}s ago`}</span>
          <button onClick={() => (document.fullscreenElement ? document.exitFullscreen() : stageRef.current?.requestFullscreen?.())} className="btn-ghost text-sm">{isFull ? "Exit full" : "⤢ Full"}</button>
          {!isFull && <Link href={`/facilitator?cohort=${encodeURIComponent(cohort)}`} className="btn-ghost text-sm">Done</Link>}
        </div>
      </header>

      {/* Headline */}
      <div className="px-6 pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">The room, right now</div>
        <h1 className="mt-1 max-w-5xl text-2xl font-bold leading-tight text-ink sm:text-3xl">
          {empty ? "Waiting for the room to start working…" : pulse?.headline || (loading ? "Reading every conversation at once…" : "Give the room a moment.")}
        </h1>
        {err && <div className="mt-2 inline-block rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700">{err}</div>}
      </div>

      {/* Three columns */}
      <div className="grid flex-1 gap-4 px-6 py-6 lg:grid-cols-3">
        {cols.map((c) => {
          const items = (pulse?.[c.key] as Item[]) || [];
          return (
            <section key={c.key} className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-soft">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.accent }} />
                <h2 className="text-sm font-bold text-ink">{c.label}</h2>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-slate-400">{empty ? "—" : c.empty}</p>
              ) : (
                <ul className="space-y-3.5">
                  {items.map((it, i) => (
                    <li key={i} className="border-l-2 pl-3" style={{ borderColor: c.accent }}>
                      <div className="text-[15px] font-semibold text-ink">{it.title}</div>
                      {it.detail && <div className="mt-0.5 text-sm leading-snug text-slate-600">{it.detail}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* Ask the room */}
      <div className="border-t border-line bg-white/70 px-6 py-4 backdrop-blur">
        <form onSubmit={submitAsk} className="mx-auto flex max-w-3xl items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask the room anything… e.g. What's the biggest fear about AI here?"
            className="field flex-1"
          />
          <button className="btn-primary shrink-0" disabled={asking || !q.trim()}>{asking ? "Asking…" : "Ask the room →"}</button>
        </form>

        {(asking || ask) && (
          <div className="mx-auto mt-3 max-w-3xl rounded-2xl border border-line bg-mist/40 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">You asked: {askedQ}</div>
            {asking ? (
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-ink" /> Reading the room…
              </div>
            ) : (
              <>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{ask?.answer}</p>
                {!!ask?.quotes?.length && (
                  <div className="mt-3 space-y-2">
                    {ask!.quotes.map((qt, i) => (
                      <div key={i} className="border-l-2 border-sage pl-3 text-sm italic text-slate-600">
                        &ldquo;{qt.text}&rdquo; <span className="not-italic text-slate-400">— {qt.who}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
