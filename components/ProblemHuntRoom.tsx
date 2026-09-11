"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { streamPost } from "@/lib/streamClient";
import { moduleBeacon } from "@/lib/clientBeacon";
import InterviewProgress from "@/components/InterviewProgress";
import { HUNT, HUNT_SCORE_KEYS, type HuntMode } from "@/lib/problemhunt";

type Msg = { role: "user" | "assistant"; content: string };
type Src = { title: string; url: string };
type Stage = "interview" | "evidence" | "report";
type Evi = { problem: string; block: string; sources: Src[]; enabled: boolean };

export default function ProblemHuntRoom({ me, session, initialWorkspace }: { me: string; session: any; initialWorkspace?: any }) {
  const mode: HuntMode = session?.exercise === "problem-leader" ? "leader" : "seller";
  const cfg = HUNT[mode];
  const supabase = createClient();
  const canvas0 = initialWorkspace?.canvas || {};

  const [chat, setChat] = useState<Msg[]>(Array.isArray(canvas0.chat) ? canvas0.chat : []);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<Stage>(canvas0.stage || "interview");
  const [err, setErr] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evi | null>(canvas0.evidence || null);
  const [report, setReport] = useState<any>(canvas0.report || null);
  const scroller = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const answered = chat.filter((m) => m.role === "user").length;
  const canFinish = answered >= 3;

  // Autosave the whole run to the workspace so it resumes and instructors can see it.
  async function persist(patch: Record<string, any>) {
    try {
      const canvas = { chat, evidence, report, stage, ...patch };
      await supabase.from("workspaces").upsert({ session_id: session.id, author_id: me, canvas }, { onConflict: "session_id,author_id" });
    } catch { /* best effort */ }
  }

  useEffect(() => { if (session?.exercise) moduleBeacon(session.exercise, "solo", "start"); }, [session?.exercise]);
  const doneBeacon = useRef(false);
  useEffect(() => { if (report && session?.exercise && !doneBeacon.current) { doneBeacon.current = true; moduleBeacon(session.exercise, "solo", "complete"); } }, [report, session?.exercise]);

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight }); }, [chat.length, streaming]);

  async function call(next: Msg[]) {
    setBusy(true); setErr(null); setStreaming("");
    let acc = "";
    try {
      const reply = await streamPost("/api/problem/reply", { mode, messages: next }, (d) => { acc += d; setStreaming(acc); });
      setStreaming("");
      return reply || acc;
    } catch (e: any) { setErr(e?.message || "The coach is unavailable."); return ""; }
    finally { setBusy(false); }
  }

  // Kick off the opening question — only for a fresh run (a resumed run already
  // has its chat hydrated from the workspace).
  useEffect(() => {
    if (started.current) return; started.current = true;
    if (chat.length > 0) return;
    (async () => { const first = await call([]); if (first) { setChat([{ role: "assistant", content: first }]); persist({ chat: [{ role: "assistant", content: first }] }); } })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim(); if (!text || busy) return;
    const next: Msg[] = [...chat, { role: "user", content: text }];
    setChat(next); setInput("");
    const reply = await call(next);
    const full = reply ? [...next, { role: "assistant" as const, content: reply }] : next;
    if (reply) setChat(full);
    persist({ chat: full });
  }

  const transcript = () => chat.map((m) => `${m.role === "user" ? "Them" : "Coach"}: ${m.content}`).join("\n");

  async function gather() {
    setStage("evidence"); setBusy(true); setErr(null);
    persist({ stage: "evidence" });
    try {
      const res = await fetch("/api/problem/evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, transcript: transcript() }) });
      const d = await res.json();
      if (d.error) { setErr(d.error); setStage("interview"); }
      else { const ev: Evi = { problem: d.problem || "", block: d.block || "", sources: d.sources || [], enabled: !!d.enabled }; setEvidence(ev); persist({ stage: "evidence", evidence: ev }); }
    } catch { setErr("Couldn't gather evidence."); setStage("interview"); }
    setBusy(false);
  }

  async function build() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/problem/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, transcript: transcript(), problem: evidence?.problem || "", block: evidence?.block || "", sources: evidence?.sources || [] }) });
      const d = await res.json();
      if (d.report) { setReport(d.report); setStage("report"); persist({ stage: "report", report: d.report }); }
      else setErr(d.error || "Couldn't build the report.");
    } catch { setErr("Couldn't build the report."); }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Dashboard</Link>
      </header>

      <div className="mb-1 text-3xl">{cfg.emoji}</div>
      <h1 className="text-2xl font-bold text-ink">{cfg.label}</h1>
      <p className="mb-5 mt-1 text-sm text-slate2">{cfg.blurb}</p>

      {stage === "interview" && (
        <div className="card flex flex-col p-5" style={{ height: "58vh", minHeight: 420 }}>
          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto pr-1">
            {chat.length === 0 && busy && <div className="text-slate-400">Thinking of a good opening question…</div>}
            {chat.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={"max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed " + (m.role === "user" ? "bg-ink text-white" : "bg-slate-100 text-slate-800")}>{m.content}</div>
              </div>
            ))}
            {streaming && <div className="flex justify-start"><div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-slate-800">{streaming}</div></div>}
            {busy && !streaming && chat.length > 0 && <div className="flex justify-start"><div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400">…</div></div>}
          </div>
          {err && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          {canFinish && (
            <button onClick={gather} disabled={busy} className="mt-3 w-full rounded-lg bg-sage-soft px-3 py-2 text-sm font-semibold text-ink transition hover:bg-sage/20 disabled:opacity-50">
              ✓ Check this problem against the real world →
            </button>
          )}
          <InterviewProgress msgs={chat} turns={cfg.interviewTurns} />
          <form onSubmit={send} className="mt-3 flex items-center gap-2">
            <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your answer…" disabled={busy} />
            <button className="btn-primary" disabled={busy || !input.trim()}>Send</button>
          </form>
        </div>
      )}

      {stage === "evidence" && (
        <div className="card p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage">Reality check</div>
          {!evidence ? (
            <p className="mt-2 text-sm text-slate-500">Searching the web for evidence this problem is real and expensive…</p>
          ) : (
            <>
              <h2 className="mt-1 text-lg font-bold text-ink">{evidence.problem || "The candidate problem"}</h2>
              {!evidence.enabled && <p className="mt-2 rounded-lg bg-amber-soft/50 px-3 py-2 text-xs text-amber">Web search isn&apos;t configured, so this runs on the interview alone. Set TAVILY_API_KEY to corroborate with real sources.</p>}
              {evidence.sources.length > 0 ? (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-slate-500">What the web says ({evidence.sources.length} sources)</div>
                  <ul className="mt-1 space-y-1">
                    {evidence.sources.map((s, i) => (
                      <li key={i} className="text-sm"><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-ai underline">{s.title}</a></li>
                    ))}
                  </ul>
                </div>
              ) : evidence.enabled && <p className="mt-2 text-sm text-slate-500">No strong external corroboration found — the report will flag that.</p>}
              <div className="mt-4 flex gap-2">
                <button onClick={build} disabled={busy} className="btn-primary text-sm">{busy ? "Building…" : "Build my report →"}</button>
                <button onClick={() => setStage("interview")} disabled={busy} className="btn-ghost text-sm">← Back to the interview</button>
              </div>
              {err && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
            </>
          )}
        </div>
      )}

      {stage === "report" && report && <Report mode={mode} report={report} />}
    </main>
  );
}

function bar(n: number) { return Math.max(0, Math.min(5, Number(n) || 0)); }

function Report({ mode, report }: { mode: HuntMode; report: any }) {
  const keys = HUNT_SCORE_KEYS[mode];
  const ev = report.evidence || {};
  const evColor = ev.verdict === "strong" ? "text-sage" : ev.verdict === "weak" ? "text-clay" : "text-amber";
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage">The verdict</div>
        <p className="mt-1 text-lg font-semibold leading-snug text-ink">{report.verdict}</p>
      </div>

      {mode === "seller" ? (
        <div className="card space-y-2 p-5 text-sm">
          <Row label="Problem" v={report.problem} strong />
          <Row label="Who has it" v={report.whoHasIt} />
          <Row label="Why now" v={report.whyNow} />
          <Row label="Your edge" v={report.yourEdge} />
          <Row label="Value at stake" v={report.sizing} />
          <Row label="Repeatable?" v={report.repeatable} />
          <Row label="Will they buy?" v={report.willBuy} />
          <Row label="Cheapest kill test" v={report.killTest} strong />
        </div>
      ) : (
        <div className="card p-5">
          {report.context && <p className="mb-3 text-sm text-slate-500">{report.context}</p>}
          <div className="space-y-3">
            {(report.opportunities || []).map((o: any, i: number) => (
              <div key={i} className="rounded-xl border border-line p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink">{i + 1}. {o.name}</span>
                  {o.blindSpot && <span className="rounded-full bg-sky-soft/60 px-2 py-0.5 text-[10px] font-semibold text-slate-600">blind spot</span>}
                </div>
                <p className="mt-1 text-sm text-slate-600">{o.whereValueLeaks}</p>
                <div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                  <div><b className="text-slate-600">Value:</b> {o.expectedValue}</div>
                  <div><b className="text-slate-600">Odds:</b> {o.probability}</div>
                  <div><b className="text-slate-600">Needs:</b> {o.resources}</div>
                  <div><b className="text-slate-600">Stop to fund:</b> {o.stopToFund}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Pursue first" v={report.topPick} strong />
            <Row label="Cheapest test" v={report.killTest} />
            <Row label="Turn it into an experiment" v={report.handoff} />
          </div>
        </div>
      )}

      {/* Reality check */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage">Reality check</div>
          <span className={"text-xs font-bold uppercase " + evColor}>{ev.verdict || "n/a"}</span>
        </div>
        {ev.note && <p className="mt-1 text-sm text-slate-600">{ev.note}</p>}
        {Array.isArray(ev.sources) && ev.sources.length > 0 && (
          <ul className="mt-2 space-y-1">
            {ev.sources.map((s: Src, i: number) => (
              <li key={i} className="text-sm"><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-ai underline">{s.title}</a></li>
            ))}
          </ul>
        )}
      </div>

      {/* Scores */}
      <div className="card p-5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">How the problem scores</div>
        <div className="space-y-1.5">
          {keys.map((k) => (
            <div key={k.key} className="flex items-center gap-3">
              <div className="w-40 shrink-0 text-xs text-slate-600">{k.label}</div>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} className={"h-2 w-6 rounded-full " + (j < bar(report.scores?.[k.key]) ? "bg-ink" : "bg-slate-200")} />
                ))}
              </div>
              <div className="w-8 text-right text-xs tabular-nums text-slate-500">{bar(report.scores?.[k.key])}/5</div>
            </div>
          ))}
        </div>
        {Array.isArray(report.gaps) && report.gaps.length > 0 && (
          <div className="mt-3 rounded-lg bg-mist px-3 py-2 text-sm text-slate-600">
            <b className="text-ink">Shore up:</b>
            <ul className="mt-1 list-disc pl-5">{report.gaps.map((g: string, i: number) => <li key={i}>{g}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, v, strong }: { label: string; v?: string; strong?: boolean }) {
  if (!v) return null;
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <p className={"mt-0.5 " + (strong ? "font-semibold text-ink" : "text-slate-700")}>{v}</p>
    </div>
  );
}
