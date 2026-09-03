"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { COMPANY, GAP_CENTS, LEVERS, ROLES, CEO_PRESSURE, LEVER_BY_KEY, type Role } from "@/lib/capstone";
import CapstoneReport from "@/components/CapstoneReport";
import { useT } from "@/components/I18nProvider";

type Member = { name: string; role: string; user_id?: string | null };
type Pick = { lever_key: string; note: string; by_name: string };
type Turn = { role: "analyst" | "cfo"; name?: string; content: string };
type State = { phase: number; status: string; members: Member[]; picks: Pick[]; transcript: Turn[]; report: any };

const PHASES = ["The mandate", "Build the plan", "The analyst call", "The reckoning"];

async function api(path: string, body: any) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json().catch(() => ({}));
}

export default function CapstoneBoard({ code, isHost, myName = "", cohort = "", userId = "" }: { code: string; isHost: boolean; myName?: string; cohort?: string; userId?: string }) {
  const t = useT();
  const [me, setMe] = useState<{ name: string; role: Role } | null>(null);
  const [state, setState] = useState<State | null>(null);
  const meRef = useRef(me); meRef.current = me;

  // Identify the member from localStorage.
  useEffect(() => {
    try {
      const name = localStorage.getItem(`capstone-name-${code}`);
      const role = localStorage.getItem(`capstone-role-${code}`) as Role | null;
      if (name && role) setMe({ name, role });
    } catch {}
  }, [code]);

  // Auto-resume: if this signed-in user is already a member of the team (on any
  // device), drop them straight into their seat without re-picking.
  useEffect(() => {
    if (me || !userId || !state) return;
    const mine = state.members.find((m) => m.user_id === userId);
    if (mine && ROLES.some((r) => r.key === mine.role)) {
      const resumed = { name: mine.name, role: mine.role as Role };
      setMe(resumed);
      try { localStorage.setItem(`capstone-name-${code}`, resumed.name); localStorage.setItem(`capstone-role-${code}`, resumed.role); } catch {}
    }
  }, [me, userId, state, code]);

  const poll = useCallback(async () => {
    const d = await api("/api/capstone/state", { code });
    if (!d.error) setState(d);
  }, [code]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [poll]);

  if (!me) return <JoinGate code={code} members={state?.members || []} onJoin={setMe} defaultName={myName} userId={userId} />;
  if (!state) return <div className="mx-auto max-w-4xl px-4 py-16 text-center text-slate-400">Loading the team room...</div>;

  const phase = state.phase;
  const selectedKeys = new Set(state.picks.map((p) => p.lever_key));
  const cents = state.picks.reduce((s, p) => s + (LEVER_BY_KEY[p.lever_key]?.cents || 0), 0);
  const epsNow = COMPANY.prelimEps + cents / 100;

  async function setPhase(p: number) { await api("/api/capstone/phase", { code, phase: p }); poll(); }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">The Number · {COMPANY.name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-ink px-3 py-1 font-mono font-bold tracking-widest text-white" title="Team code: share with your teammates">{code}</span>
          {cohort && <span className="rounded-full bg-mist px-3 py-1 font-mono text-xs text-slate-500" title="Your cohort, assigned from your sign-in">{cohort}</span>}
          <span className="text-slate-500">{me.name} · {ROLES.find((r) => r.key === me.role)?.label}</span>
        </div>
      </header>

      {/* Phase rail */}
      <div className="mb-6 flex items-center gap-1.5">
        {PHASES.map((p, i) => (
          <div key={p} className="flex-1">
            <div className={"h-1.5 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200")} />
            <div className={"mt-1 text-[10px] font-semibold uppercase tracking-wide " + (i === phase ? "text-ink" : "text-slate-400")}>{p}</div>
          </div>
        ))}
      </div>

      {phase >= 3 && state.report ? (
        <CapstoneReport report={state.report} />
      ) : phase === 3 ? (
        <Reckoning code={code} isHost={isHost} onGraded={poll} />
      ) : phase === 2 ? (
        <CallRoom code={code} me={me} transcript={state.transcript} isHost={isHost} onNext={() => setPhase(3)} onPosted={poll} selectedKeys={selectedKeys} />
      ) : phase === 1 ? (
        <PlanBoard code={code} me={me} picks={state.picks} cents={cents} epsNow={epsNow} isHost={isHost} onNext={() => setPhase(2)} onChange={poll} />
      ) : (
        <Mandate members={state.members} isHost={isHost} onNext={() => setPhase(1)} />
      )}
    </main>
  );
}

function JoinGate({ code, members, onJoin, defaultName = "", userId = "" }: { code: string; members: Member[]; onJoin: (m: { name: string; role: Role }) => void; defaultName?: string; userId?: string }) {
  const [name, setName] = useState(defaultName);
  const [role, setRole] = useState<Role | "">("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const takenBy = new Map(members.map((m) => [m.role, m.name] as const));
  const openSeats = ROLES.filter((r) => !takenBy.has(r.key));
  const full = openSeats.length === 0;

  async function join() {
    if (!name.trim() || !role) return;
    setBusy(true); setErr("");
    const res = await fetch("/api/capstone/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, name: name.trim(), role, userId }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(d.error || "Could not join. Try again."); return; }
    try { localStorage.setItem(`capstone-name-${code}`, name.trim()); localStorage.setItem(`capstone-role-${code}`, role); } catch {}
    onJoin({ name: name.trim(), role });
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-bold text-ink">Join your CFO team</h1>
      <p className="mt-1 text-sm text-slate-500">Team code <b className="font-mono">{code}</b>. Pick your name and an open seat.</p>

      {full ? (
        <div className="mt-6 rounded-xl border border-clay/30 bg-clay-soft p-4 text-sm text-ink">
          This team already has all four seats filled. Double-check the team code with your captain, or start your own team.
        </div>
      ) : (
        <>
          <div className="mt-6">
            <label className="lbl">Your name</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" />
          </div>
          <div className="mt-4 space-y-2">
            <label className="lbl">Your seat ({openSeats.length} open)</label>
            {ROLES.map((r) => {
              const holder = takenBy.get(r.key);
              const isTaken = !!holder;
              return (
                <button key={r.key} disabled={isTaken} onClick={() => setRole(r.key)} className={"flex w-full items-center justify-between rounded-xl border p-3 text-left transition " + (isTaken ? "cursor-not-allowed border-line bg-slate-50 opacity-60" : role === r.key ? "border-ink bg-ink/5 ring-1 ring-ink" : "border-line bg-white hover:border-slate-300")}>
                  <div>
                    <div className="text-sm font-bold text-ink">{r.label}</div>
                    <div className="text-xs text-slate-500">{r.charge}</div>
                  </div>
                  {isTaken && <span className="shrink-0 text-[11px] text-slate-400">taken by {holder!.split(" ")[0]}</span>}
                </button>
              );
            })}
          </div>
          {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          <button onClick={join} disabled={busy || !name.trim() || !role} className="btn-primary mt-5 w-full disabled:opacity-50">{busy ? "Joining..." : "Take my seat"}</button>
        </>
      )}
    </main>
  );
}

function HostNext({ isHost, label, onNext }: { isHost: boolean; label: string; onNext: () => void }) {
  if (!isHost) return <div className="mt-6 rounded-xl bg-mist px-4 py-3 text-center text-sm text-slate-500">Waiting for the team captain to advance.</div>;
  return <button onClick={onNext} className="btn-primary mt-6 w-full">{label} →</button>;
}

function Mandate({ members, isHost, onNext }: { members: Member[]; isHost: boolean; onNext: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-clay/30 bg-clay-soft p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-clay">A message from CEO {COMPANY.ceo}</div>
        <p className="mt-2 text-sm italic leading-relaxed text-ink">{CEO_PRESSURE[0]}</p>
      </div>
      <div className="card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The situation</div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <Stat label="Where we'll close" value={`$${COMPANY.prelimEps.toFixed(2)}`} />
          <Stat label="Street consensus" value={`$${COMPANY.consensusEps.toFixed(2)}`} color="#B4532E" />
          <Stat label="The gap" value={`${GAP_CENTS}c`} color="#B4532E" />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          You are the four-person CFO office of {COMPANY.name} (NASDAQ: {COMPANY.ticker}). You must find {GAP_CENTS} cents of EPS to hit the number, using only what the rules allow. The data room holds the levers, but it will not label them for you. Some choices leave a trace. Some cost the company dearly later. And a few would put you in prison. Read carefully.
        </p>
      </div>
      <div className="card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your team ({members.length})</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {members.length ? members.map((m, i) => (
            <span key={i} className="rounded-full bg-mist px-3 py-1 text-sm"><b>{m.name}</b> · {ROLES.find((r) => r.key === m.role)?.label || m.role}</span>
          )) : <span className="text-sm text-slate-400">No one has taken a seat yet.</span>}
        </div>
      </div>
      <HostNext isHost={isHost} label="Open the data room" onNext={onNext} />
    </div>
  );
}

function PlanBoard({ code, me, picks, cents, epsNow, isHost, onNext, onChange }: { code: string; me: { name: string; role: Role }; picks: Pick[]; cents: number; epsNow: number; isHost: boolean; onNext: () => void; onChange: () => void }) {
  const selected = new Set(picks.map((p) => p.lever_key));
  const hit = cents >= GAP_CENTS;

  async function toggle(key: string) {
    await api("/api/capstone/pick", { code, lever: key, selected: !selected.has(key), name: me.name });
    onChange();
  }
  async function saveNote(key: string, note: string) {
    await api("/api/capstone/pick", { code, lever: key, selected: true, note, name: me.name });
    onChange();
  }

  return (
    <div className="space-y-4">
      {/* Sticky tally */}
      <div className="sticky top-2 z-10 rounded-2xl border border-line bg-white/95 p-4 shadow-soft backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">EPS assembled</div>
            <div className="text-2xl font-bold text-ink tabular-nums">${epsNow.toFixed(2)} <span className="text-sm font-normal text-slate-400">of ${COMPANY.consensusEps.toFixed(2)}</span></div>
          </div>
          <div className="text-right">
            <div className={"text-2xl font-bold tabular-nums " + (hit ? "text-sage" : "text-clay")}>{cents.toFixed(1)}c</div>
            <div className="text-xs text-slate-400">of {GAP_CENTS}c needed</div>
          </div>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-200">
          <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (cents / GAP_CENTS) * 100)}%`, background: hit ? "#3F7A52" : "#CE8F2C" }} />
        </div>
        <p className="mt-2 text-[11px] leading-snug text-slate-400">Cents are shown. What each lever costs you later, and whether the market spots it, is your call. Some options in here are fraud. Read the data.</p>
      </div>

      {ROLES.map((r) => (
        <div key={r.key} className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">{r.label} · {r.charge}</div>
          <div className="mt-3 space-y-2.5">
            {LEVERS.filter((l) => l.role === r.key).map((l) => {
              const on = selected.has(l.key);
              const pick = picks.find((p) => p.lever_key === l.key);
              return (
                <div key={l.key} className={"rounded-xl border p-3 transition " + (on ? "border-ink bg-ink/5" : "border-line bg-white")}>
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => toggle(l.key)} className="flex items-start gap-2.5 text-left">
                      <span className={"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border " + (on ? "border-ink bg-ink text-white" : "border-slate-300")}>{on ? "✓" : ""}</span>
                      <span>
                        <span className="text-sm font-semibold text-ink">{l.label}</span>
                        <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-xs font-semibold text-ink">+{l.cents}c</span>
                        <span className="mt-0.5 block text-xs leading-snug text-slate-500">{l.what}</span>
                      </span>
                    </button>
                  </div>
                  <div className="mt-1.5 rounded-lg bg-mist/60 px-3 py-1.5 text-[11px] leading-snug text-slate-500"><b className="text-slate-600">From the data room:</b> {l.dataHint}</div>
                  {on && (
                    <input
                      className="field mt-2 text-sm"
                      defaultValue={pick?.note || ""}
                      placeholder="Why this lever? What does it cost us? (your reasoning is graded)"
                      onBlur={(e) => { if (e.target.value !== (pick?.note || "")) saveNote(l.key, e.target.value); }}
                    />
                  )}
                  {on && pick?.by_name && <div className="mt-1 text-[10px] text-slate-400">added by {pick.by_name}</div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm italic text-slate-600">{CEO_PRESSURE[1]}</div>
      <HostNext isHost={isHost} label={hit ? "Lock the plan, take the call" : "Take the call anyway"} onNext={onNext} />
    </div>
  );
}

function CallRoom({ code, me, transcript, isHost, onNext, onPosted, selectedKeys }: { code: string; me: { name: string; role: Role }; transcript: Turn[]; isHost: boolean; onNext: () => void; onPosted: () => void; selectedKeys: Set<string> }) {
  const t = useT();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight }); }, [transcript.length, busy]);

  async function send(answer: string) {
    setBusy(true);
    await api("/api/capstone/call", { code, name: me.name, text: answer });
    setText(""); setBusy(false); onPosted();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-ink p-4 text-white">
        <div className="text-xs font-semibold uppercase tracking-wide text-white/50">The call</div>
        <p className="mt-1 text-sm leading-relaxed text-white/90">Priya Anand, a forensic analyst, is on the line and she smells something. Any teammate can answer as the CFO. Tell the truth, hedge where you must, and do not hand her a lie. You are defending the {selectedKeys.size}-lever plan you just built.</p>
      </div>

      <div ref={feedRef} className="card flex flex-col gap-3 overflow-y-auto p-5" style={{ height: "50vh", minHeight: 360 }}>
        {transcript.length === 0 && <div className="m-auto text-center text-sm text-slate-400">No one has spoken yet. Start the call to hear her first question.</div>}
        {transcript.map((t, i) => (
          <div key={i} className={t.role === "cfo" ? "flex justify-end" : "flex justify-start"}>
            <div className={"max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " + (t.role === "cfo" ? "bg-ink text-white" : "bg-slate-100 text-slate-800")}>
              <div className={"mb-0.5 text-[10px] font-semibold uppercase tracking-wide " + (t.role === "cfo" ? "text-white/60" : "text-slate-400")}>{t.role === "cfo" ? `CFO · ${t.name || "team"}` : "Priya Anand, analyst"}</div>
              {t.content}
            </div>
          </div>
        ))}
        {busy && <div className="flex justify-start"><div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400">…</div></div>}
      </div>

      {transcript.length === 0 ? (
        <button onClick={() => send("")} disabled={busy} className="btn-primary w-full">{busy ? "Connecting..." : "Begin the call"}</button>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (text.trim() && !busy) send(text.trim()); }} className="flex items-center gap-2">
          <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Answer as the CFO..." disabled={busy} />
          <button className="btn-primary" disabled={busy || !text.trim()}>{t("room.send")}</button>
        </form>
      )}

      <HostNext isHost={isHost} label="End the call, face the reckoning" onNext={onNext} />
    </div>
  );
}

function Reckoning({ code, isHost, onGraded }: { code: string; isHost: boolean; onGraded: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function grade() {
    setBusy(true); setErr("");
    const d = await api("/api/capstone/report", { code });
    setBusy(false);
    if (d.error) setErr(d.error); else onGraded();
  }
  if (!isHost) return <div className="card p-8 text-center text-slate-500">The captain is grading the quarter. The reckoning will appear here.</div>;
  return (
    <div className="card p-8 text-center">
      <p className="text-slate-600">Grade the quarter: did you hit the number, did you stay out of jail, will the market catch you, and what did it cost the company down the road?</p>
      <button onClick={grade} disabled={busy} className="btn-primary mt-4 inline-block text-sm">{busy ? "Running the tape forward..." : "✨ Grade and reveal the reckoning"}</button>
      {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-mist p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums" style={{ color: color || "#14283A" }}>{value}</div>
    </div>
  );
}
