"use client";

import { useCallback, useEffect, useState } from "react";
import { LEVERS, ROLES } from "@/lib/capstone";
import CapstoneCohortSynthesis from "@/components/CapstoneCohortSynthesis";

type Member = { name: string; role: string };
type Team = { code: string; phase: number; graded: boolean; members: Member[]; cents: number; hit: boolean; indicted: boolean; detection: number; valueDestroyed: number; levers: string[]; verdict: string | null };

const PHASE_LABEL = ["Mandate", "Building the plan", "On the analyst call", "Reckoning", "Graded"];
const FRAUD_LABELS = new Set(LEVERS.filter((l) => !l.legal).map((l) => l.label));

export default function LiveRunBoard({ runCode, label, joinHost }: { runCode: string; label: string; joinHost: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loaded, setLoaded] = useState(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/capstone/run/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runCode }) });
      const d = await res.json().catch(() => ({}));
      if (Array.isArray(d.teams)) setTeams(d.teams);
    } catch { /* keep last */ }
    setLoaded(true);
  }, [runCode]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 3500);
    return () => clearInterval(id);
  }, [poll]);

  const hit = teams.filter((t) => t.hit).length;
  const indicted = teams.filter((t) => t.indicted).length;
  const caught = teams.filter((t) => t.verdict === "caught").length;

  // Lever popularity across the run.
  const count = new Map<string, number>();
  for (const t of teams) for (const l of t.levers) count.set(l, (count.get(l) || 0) + 1);
  const popular = [...count.entries()].sort((a, b) => b[1] - a[1]);
  const maxN = popular[0]?.[1] || 1;

  return (
    <div className="space-y-5">
      {/* Projector header */}
      <div className="rounded-2xl bg-ink p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Class run{label ? ` · ${label}` : ""}</div>
            <div className="mt-1 font-mono text-4xl font-bold tracking-[0.2em]">{runCode}</div>
          </div>
          <div className="text-sm leading-relaxed text-white/80">
            <div>Captains: open <b className="text-white">The Number</b>, choose <b className="text-white">Start a team</b>,</div>
            <div>and enter this code. Teammates join with the team code.</div>
            <div className="mt-1 text-xs text-white/50">{joinHost}</div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Teams" value={`${teams.length}`} />
        <Stat label="Hit the number" value={`${hit}/${teams.length || 0}`} color="#3F7A52" />
        <Stat label="Indicted" value={`${indicted}`} color={indicted ? "#B4532E" : "#14283A"} />
        <Stat label="Caught by market" value={`${caught}`} color={caught ? "#B4532E" : "#14283A"} />
      </div>

      {/* Live teams */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Teams, live</div>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-sage" /></span>updating</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {!loaded && <div className="text-sm text-slate-400">Loading...</div>}
          {loaded && teams.length === 0 && <div className="text-sm text-slate-400">No teams yet. As captains enter <b className="font-mono">{runCode}</b>, they appear here.</div>}
          {teams.map((t) => (
            <div key={t.code} className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-ink">{t.code}</span>
                <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + (t.graded ? "bg-ink text-white" : "bg-mist text-slate-600")}>{PHASE_LABEL[Math.min(t.phase, 4)] || "Mandate"}</span>
              </div>
              {/* Seats */}
              <div className="mt-2 flex flex-wrap gap-1">
                {ROLES.map((r) => {
                  const m = t.members.find((x) => x.role === r.key);
                  return <span key={r.key} className={"rounded px-1.5 py-0.5 text-[10px] " + (m ? "bg-sage/15 text-sage" : "bg-slate-100 text-slate-400")} title={r.label}>{m ? m.name.split(" ")[0] : r.label.split(" ")[0]}</span>;
                })}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                <span>{t.cents.toFixed(1)}c</span>
                {t.graded && <>
                  {t.indicted && <span className="font-semibold text-clay">Indicted</span>}
                  <span className={t.hit ? "text-sage" : "text-slate-500"}>{t.hit ? "Hit" : "Missed"}</span>
                  {t.verdict && <span className="capitalize">{t.verdict}</span>}
                  <span>~${t.valueDestroyed}M</span>
                </>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-team synthesis */}
      <CapstoneCohortSynthesis runCode={runCode} teamCount={teams.length} />

      {/* Lever popularity */}
      {popular.length > 0 && (
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Which levers teams reached for</div>
          <div className="mt-3 space-y-1.5">
            {popular.map(([labelName, n]) => (
              <div key={labelName} className="flex items-center gap-3 text-sm">
                <div className="w-56 shrink-0 truncate text-slate-700" title={labelName}>{labelName}{FRAUD_LABELS.has(labelName) && <span className="ml-1 text-[10px] font-bold text-clay">FRAUD</span>}</div>
                <div className="h-3 flex-1 rounded-full bg-slate-100"><div className="h-3 rounded-full" style={{ width: `${(n / maxN) * 100}%`, background: FRAUD_LABELS.has(labelName) ? "#B4532E" : "#3F7A52" }} /></div>
                <div className="w-8 shrink-0 text-right tabular-nums text-slate-500">{n}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-mist p-3 text-center">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums" style={{ color: color || "#14283A" }}>{value}</div>
    </div>
  );
}
