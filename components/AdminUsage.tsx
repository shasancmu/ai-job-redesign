"use client";

import { useMemo, useState } from "react";

type UserRow = { id: string; name: string; email: string; runs: number; done: number; modules: number; top: string; last: string; first: string };
type ModRow = { ex: string; name: string; runs: number; done: number };
type Totals = { users: number; runs: number; done: number };

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
function who(u: UserRow): string {
  return u.name || u.email || u.id.slice(0, 8);
}

type SortKey = "runs" | "done" | "rate" | "modules" | "last";

export default function AdminUsage({ totals, users, modules, activity }: { totals: Totals; users: UserRow[]; modules: ModRow[]; activity: { wk: string; runs: number }[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("runs");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? users.filter((u) => who(u).toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle) || u.top.toLowerCase().includes(needle))
      : users;
    const val = (u: UserRow) => (sort === "rate" ? pct(u.done, u.runs) : sort === "last" ? new Date(u.last || 0).getTime() : (u as any)[sort]);
    return [...filtered].sort((a, b) => val(b) - val(a));
  }, [users, q, sort]);

  const maxWk = Math.max(1, ...activity.map((a) => a.runs));
  const maxMod = Math.max(1, ...modules.map((m) => m.runs));

  function exportCsv() {
    const head = ["user", "email", "runs", "completed", "completion_pct", "modules_used", "top_module", "first_seen", "last_active"];
    const lines = [head.join(",")];
    for (const u of rows) lines.push([who(u), u.email, u.runs, u.done, pct(u.done, u.runs), u.modules, u.top, (u.first || "").slice(0, 10), (u.last || "").slice(0, 10)].map(csv).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "usage.csv"; a.click();
  }

  return (
    <div className="space-y-8">
      {/* Top-line stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Users" value={totals.users.toLocaleString()} />
        <Stat label="Total runs" value={totals.runs.toLocaleString()} />
        <Stat label="Completed" value={totals.done.toLocaleString()} />
        <Stat label="Completion" value={`${pct(totals.done, totals.runs)}%`} />
      </div>

      {/* Activity */}
      <div className="card p-5">
        <div className="mb-3 text-sm font-bold text-ink">Runs per week (last 12)</div>
        <div className="flex items-end gap-1.5" style={{ height: 96 }}>
          {activity.map((a) => (
            <div key={a.wk} className="group relative flex flex-1 flex-col items-center justify-end">
              <div className="w-full rounded-t bg-ink/80 transition group-hover:bg-ink" style={{ height: `${(a.runs / maxWk) * 84}px`, minHeight: a.runs ? 3 : 0 }} title={`${a.wk}: ${a.runs} runs`} />
              <div className="mt-1 text-[9px] text-slate-400">{a.wk.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Module breakdown */}
      <div>
        <div className="eyebrow mb-2">By module</div>
        <div className="card divide-y divide-line p-0">
          {modules.map((m) => (
            <div key={m.ex} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-48 shrink-0 truncate text-sm text-ink">{m.name}</div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-ink" style={{ width: `${(m.runs / maxMod) * 100}%` }} />
              </div>
              <div className="w-32 shrink-0 text-right text-xs text-slate-500">{m.runs} runs · {pct(m.done, m.runs)}% done</div>
            </div>
          ))}
          {modules.length === 0 && <div className="px-4 py-4 text-sm text-slate-400">No runs yet.</div>}
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
                <tr key={u.id} className="border-b border-line/60 last:border-0 hover:bg-mist/40">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-ink">{who(u)}</div>
                    {u.email && u.name && <div className="text-xs text-slate-400">{u.email}</div>}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-ink">{u.runs}</td>
                  <td className="px-3 py-2.5 text-slate-600">{u.done}</td>
                  <td className="px-3 py-2.5 text-slate-600">{pct(u.done, u.runs)}%</td>
                  <td className="px-3 py-2.5 text-slate-600">{u.modules}</td>
                  <td className="px-3 py-2.5 text-slate-600">{u.top}</td>
                  <td className="px-3 py-2.5 text-slate-500">{ago(u.last)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-5 text-center text-slate-400">No users match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-mist p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-ink">{value}</div>
    </div>
  );
}

function Th({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <th className="px-3 py-2.5 font-semibold">
      <button onClick={onClick} className={"inline-flex items-center gap-1 " + (active ? "text-ink" : "hover:text-ink")}>{label}{active && <span>↓</span>}</button>
    </th>
  );
}

function csv(v: any): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
