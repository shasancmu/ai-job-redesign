"use client";

import { useEffect, useState } from "react";

type Director = { user_id: string; name: string; email: string | null; created_at: string };

// The middle tier, made manageable. Lists who directs a program (class_unit) and
// — for a school director — lets them appoint or remove one by email. A program
// director runs the program's P&L: its cohorts, instructors, and alumni, without
// running the whole school.
export default function ProgramDirectorsPanel({ unitId, unitName }: { unitId: string; unitName: string }) {
  const [directors, setDirectors] = useState<Director[] | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [unitId]);
  async function load() {
    try {
      const d = await fetch(`/api/class-units/directors?unit=${encodeURIComponent(unitId)}`, { cache: "no-store" }).then((r) => r.json());
      setDirectors(d.directors || []);
      setCanManage(!!d.canManage);
    } catch { setDirectors([]); }
  }

  async function appoint() {
    if (!email.trim()) { setErr("Enter the person's email."); return; }
    setBusy(true); setErr("");
    const res = await fetch("/api/class-units/directors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unit: unitId, email: email.trim() }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || d.error) { setErr(d.error || "Couldn't appoint."); return; }
    setEmail(""); setDirectors(d.directors || []);
  }

  async function remove(userId: string) {
    setBusy(true); setErr("");
    const res = await fetch("/api/class-units/directors", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unit: unitId, userId }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || d.error) { setErr(d.error || "Couldn't remove."); return; }
    setDirectors(d.directors || []);
  }

  return (
    <div className="mt-2 rounded-xl border border-line bg-mist/40 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Program directors</div>
      <p className="mt-1 text-xs text-slate-500">Runs {unitName || "this program"} as a P&amp;L — its cohorts, instructors, and alumni — without directing the whole school. Independent of who owns the modules.</p>

      {directors === null ? (
        <div className="mt-3 text-sm text-slate-400">Loading…</div>
      ) : directors.length === 0 ? (
        <div className="mt-3 text-sm text-slate2">No program director yet.{canManage ? " Appoint one below." : ""}</div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-lg border border-line bg-white">
          {directors.map((d, i) => (
            <div key={d.user_id} className={"flex items-center justify-between gap-2 p-2.5 " + (i > 0 ? "border-t border-line" : "")}>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ink">{d.name}</div>
                {d.email && <div className="truncate text-xs text-slate-400">{d.email}</div>}
              </div>
              {canManage && <button onClick={() => remove(d.user_id)} disabled={busy} className="shrink-0 text-xs font-medium text-red-700 hover:underline">Remove</button>}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input className="field max-w-xs flex-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="director@school.edu" onKeyDown={(e) => { if (e.key === "Enter") appoint(); }} />
          <button onClick={appoint} disabled={busy} className="btn-primary text-sm">{busy ? "…" : "Appoint"}</button>
        </div>
      )}
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      {canManage && <p className="mt-2 text-xs text-slate-400">The person must already be a member of this school (add them under People first).</p>}
    </div>
  );
}
