"use client";

import { useState } from "react";

type Report = { portrait?: string; where?: string; needs?: string[]; watch?: string[]; one_move?: string };

// A roll-up understanding of the whole span (cohort / programs / school),
// generated on demand — a leader reading their group the way a teacher reads a
// student. Care from understanding, at scale, without losing the person.
export default function RollupReport({ label }: { label: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [scope, setScope] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function generate() {
    setBusy(true); setErr("");
    try {
      const d = await fetch("/api/team/rollup", { method: "POST" }).then((r) => r.json());
      if (d?.empty) { setErr("No one here to read yet."); }
      else if (d?.report) { setReport(d.report); setScope(d.scope || ""); }
      else setErr(d?.error || "Couldn't generate.");
    } catch { setErr("Couldn't generate."); }
    setBusy(false);
  }

  if (!report) {
    return (
      <div>
        <button onClick={generate} disabled={busy} className="btn-primary text-sm">{busy ? "Reading the room…" : `Understand ${label}`}</button>
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      {scope && <div className="eyebrow text-slate-400">{scope}</div>}
      {report.portrait && <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{report.portrait}</p>}
      {report.where && <p className="mt-2 text-[15px] leading-relaxed text-slate2"><span className="font-semibold text-ink">Right now:</span> {report.where}</p>}

      {report.needs && report.needs.length > 0 && (
        <div className="mt-4">
          <div className="eyebrow text-slate-400">What would help</div>
          <ul className="mt-1.5 space-y-1">{report.needs.map((n, i) => <li key={i} className="flex gap-2 text-sm text-slate2"><span className="text-sage">·</span><span>{n}</span></li>)}</ul>
        </div>
      )}
      {report.watch && report.watch.length > 0 && (
        <div className="mt-4">
          <div className="eyebrow text-slate-400">Worth watching</div>
          <ul className="mt-1.5 space-y-1">{report.watch.map((n, i) => <li key={i} className="flex gap-2 text-sm text-slate2"><span className="text-amber-700">·</span><span>{n}</span></li>)}</ul>
        </div>
      )}
      {report.one_move && (
        <div className="mt-4 rounded-xl border border-sage/30 bg-sage-soft/40 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">One move this month</div>
          <p className="mt-1 text-sm leading-relaxed text-ink">{report.one_move}</p>
        </div>
      )}
      <button onClick={generate} disabled={busy} className="mt-4 text-xs font-medium text-sky hover:underline">{busy ? "…" : "↻ regenerate"}</button>
    </div>
  );
}
