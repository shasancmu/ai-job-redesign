"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { moduleByExercise } from "@/lib/modules";
import { artifactHref } from "@/lib/momentum";

type Sess = { h: string; ex: string; st: string; at: string; code: string };

function moduleName(ex: string): string {
  return moduleByExercise(ex)?.name || ex;
}
function ago(iso: string): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
function pct(a: number, b: number): number {
  return b ? Math.round((a / b) * 100) : 0;
}
function weekStart(iso: string): string {
  const d = new Date(iso);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

const RANGES: { key: string; label: string; days: number }[] = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: 0 },
];
type SortKey = "runs" | "done" | "rate" | "modules" | "last";

export default function AdminUsage({ sessions, names, emails }: { sessions: Sess[]; names: Record<string, string>; emails: Record<string, string> }) {
  const [range, setRange] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("runs");
  const [open, setOpen] = useState<string | null>(null);

  const who = (id: string) => names[id] || emails[id] || id.slice(0, 8);

  const filtered = useMemo(() => {
    const r = RANGES.find((x) => x.key === range)!;
    if (r.days === 0) return sessions;
    const cutoff = Date.now() - r.days * 86400000;
    return sessions.filter((s) => new Date(s.at).getTime() >= cutoff);
  }, [sessions, range]);

  const { totals, users, modules } = useMemo(() => {
    const perUser = new Map<string, { runs: number; done: number; mods: Set<string>; byMod: Map<string, number>; last: string; list: Sess[] }>();
    const byModule = new Map<string, { runs: number; done: number }>();
    for (const s of filtered) {
      const isDone = s.st === "done";
      let u = perUser.get(s.h);
      if (!u) { u = { runs: 0, done: 0, mods: new Set(), byMod: new Map(), last: s.at, list: [] }; perUser.set(s.h, u); }
      u.runs++; if (isDone) u.done++; u.mods.add(s.ex);
      u.byMod.set(s.ex, (u.byMod.get(s.ex) || 0) + 1);
      if (s.at > u.last) u.last = s.at;
      u.list.push(s);
      const gm = byModule.get(s.ex) || { runs: 0, done: 0 };
      gm.runs++; if (isDone) gm.done++; byModule.set(s.ex, gm);
    }
    const users = [...perUser.entries()].map(([id, u]) => {
      const top = [...u.byMod.entries()].sort((a, b) => b[1] - a[1])[0];
      return { id, runs: u.runs, done: u.done, modules: u.mods.size, top: top ? moduleName(top[0]) : "", last: u.last, list: u.list.slice().sort((a, b) => b.at.localeCompare(a.at)) };
    });
    const modules = [...byModule.entries()].map(([ex, m]) => ({ ex, name: moduleName(ex), runs: m.runs, done: m.done })).sort((a, b) => b.runs - a.runs);
    const totals = { users: perUser.size, runs: filtered.length, done: filtered.reduce((n, s) => n + (s.st === "done" ? 1 : 0), 0) };
    return { totals, users, modules };
  }, [filtered]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const f = needle ? users.filter((u) => who(u.id).toLowerCase().includes(needle) || (emails[u.id] || "").toLowerCase().includes(needle) || u.top.toLowerCase().includes(needle)) : users;
    const val = (u: any) => (sort === "rate" ? pct(u.done, u.runs) : sort === "last" ? new Date(u.last || 0).getTime() : u[sort]);
    return [...f].sort((a, b) => val(b) - val(a));
  }, [users, q, sort]); // eslint-disable-line

  // All-time weekly trend (context, independent of the range filter).
  const activity = useMemo(() => {
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const monday = new Date(now); monday.setDate(now.getDate() - day); monday.setHours(0, 0, 0, 0);
    const weeks: string[] = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(monday); d.setDate(monday.getDate() - i * 7); weeks.push(d.toISOString().slice(0, 10)); }
    const map = new Map<string, number>();
    for (const s of sessions) map.set(weekStart(s.at), (map.get(weekStart(s.at)) || 0) + 1);
    return weeks.map((wk) => ({ wk, runs: map.get(wk) || 0 }));
  }, [sessions]);

  const maxWk = Math.max(1, ...activity.map((a) => a.runs));
  const maxMod = Math.max(1, ...modules.map((m) => m.runs));

  function exportCsv() {
    const head = ["user", "email", "runs", "completed", "completion_pct", "modules_used", "top_module", "last_active"];
    const lines = [head.join(",")];
    for (const u of rows) lines.push([who(u.id), emails[u.id] || "", u.runs, u.done, pct(u.done, u.runs), u.modules, u.top, (u.last || "").slice(0, 10)].map(csv).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `usage-${range}.csv`; a.click();
  }

  return (
    <div className="space-y-8">
      {/* Range */}
      <div className="inline-flex rounded-full bg-mist p-1 text-sm">
        {RANGES.map((r) => (
          <button key={r.key} onClick={() => setRange(r.key)} className={"rounded-full px-3 py-1 " + (range === r.key ? "bg-white font-semibold text-ink shadow-sm" : "text-slate-500")}>{r.label}</button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Active users" value={totals.users.toLocaleString()} />
        <Stat label="Runs" value={totals.runs.toLocaleString()} />
        <Stat label="Completed" value={totals.done.toLocaleString()} />
        <Stat label="Completion" value={`${pct(totals.done, totals.runs)}%`} />
      </div>

      {/* Activity (all-time) */}
      <div className="card p-5">
        <div className="mb-3 text-sm font-bold text-ink">Runs per week <span className="font-normal text-slate-400">(last 12, all-time)</span></div>
        <div className="flex items-end gap-1.5" style={{ height: 96 }}>
          {activity.map((a) => (
            <div key={a.wk} className="group flex flex-1 flex-col items-center justify-end">
              <div className="w-full rounded-t bg-ink/80 transition group-hover:bg-ink" style={{ height: `${(a.runs / maxWk) * 84}px`, minHeight: a.runs ? 3 : 0 }} title={`${a.wk}: ${a.runs} runs`} />
              <div className="mt-1 text-[9px] text-slate-400">{a.wk.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* By module */}
      <div>
        <div className="eyebrow mb-2">By module</div>
        <div className="card divide-y divide-line p-0">
          {modules.map((m) => (
            <div key={m.ex} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-48 shrink-0 truncate text-sm text-ink">{m.name}</div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-ink" style={{ width: `${(m.runs / maxMod) * 100}%` }} /></div>
              <div className="w-32 shrink-0 text-right text-xs text-slate-500">{m.runs} runs · {pct(m.done, m.runs)}% done</div>
            </div>
          ))}
          {modules.length === 0 && <div className="px-4 py-4 text-sm text-slate-400">No runs in this window.</div>}
        </div>
      </div>

      {/* Users */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="eyebrow">Users ({users.length})</div>
          <div className="flex items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, module…" className="field h-8 w-56 text-sm" />
            <button onClick={exportCsv} className="btn-ghost text-xs">↧ CSV</button>
          </div>
        </div>
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-slate-400">
                <th className="px-4 py-2.5 font-semibold">User</th>
                <Th label="Runs" active={sort === "runs"} onClick={() => setSort("runs")} />
                <Th label="Done" active={sort === "done"} onClick={() => setSort("done")} />
                <Th label="Rate" active={sort === "rate"} onClick={() => setSort("rate")} />
                <Th label="Modules" active={sort === "modules"} onClick={() => setSort("modules")} />
                <th className="px-3 py-2.5 font-semibold">Top module</th>
                <Th label="Last active" active={sort === "last"} onClick={() => setSort("last")} />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <Fragment key={u.id}>
                  <tr onClick={() => setOpen(open === u.id ? null : u.id)} className="cursor-pointer border-b border-line/60 hover:bg-mist/40">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5"><span className="text-slate-300">{open === u.id ? "▾" : "▸"}</span><span className="font-medium text-ink">{who(u.id)}</span></div>
                      {emails[u.id] && names[u.id] && <div className="pl-4 text-xs text-slate-400">{emails[u.id]}</div>}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-ink">{u.runs}</td>
                    <td className="px-3 py-2.5 text-slate-600">{u.done}</td>
                    <td className="px-3 py-2.5 text-slate-600">{pct(u.done, u.runs)}%</td>
                    <td className="px-3 py-2.5 text-slate-600">{u.modules}</td>
                    <td className="px-3 py-2.5 text-slate-600">{u.top}</td>
                    <td className="px-3 py-2.5 text-slate-500">{ago(u.last)}</td>
                  </tr>
                  {open === u.id && (
                    <tr className="border-b border-line/60 bg-mist/30">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Session history ({u.list.length})</div>
                        <div className="mt-2 space-y-1.5">
                          {u.list.map((s, i) => {
                            const href = artifactHref(s.ex, s.code);
                            const viewable = !href.startsWith("/room/");
                            return (
                              <div key={i} className="flex items-center gap-3 text-sm">
                                <span className="w-52 shrink-0 truncate text-ink">{moduleName(s.ex)}</span>
                                <StatusBadge st={s.st} />
                                <span className="w-24 shrink-0 text-xs text-slate-400">{(s.at || "").slice(0, 10)}</span>
                                {viewable && s.st === "done" ? <Link href={href} className="text-xs font-medium text-sky hover:underline" target="_blank">View →</Link> : <span className="text-xs text-slate-300">—</span>}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-5 text-center text-slate-400">No users in this window.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-mist p-4"><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-1 text-2xl font-bold text-ink">{value}</div></div>;
}
function Th({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <th className="px-3 py-2.5 font-semibold"><button onClick={onClick} className={"inline-flex items-center gap-1 " + (active ? "text-ink" : "hover:text-ink")}>{label}{active && <span>↓</span>}</button></th>;
}
function StatusBadge({ st }: { st: string }) {
  const map: Record<string, string> = { done: "bg-sage-soft text-sage", active: "bg-amber-soft text-amber", waiting: "bg-slate-100 text-slate-500" };
  return <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold " + (map[st] || "bg-slate-100 text-slate-500")}>{st}</span>;
}
function csv(v: any): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
