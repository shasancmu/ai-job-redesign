"use client";

import { useState } from "react";

// The observe->improve loop: ask for edits grounded in how the case actually ran.
export default function CaseImprove({ slug, hasEngagement }: { slug: string; hasEngagement: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [suggestions, setSuggestions] = useState<{ title: string; why: string; action: string }[] | null>(null);

  async function run() {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/cases/improve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Couldn't generate suggestions.");
      setSuggestions(d.suggestions || []);
    } catch (e: any) { setErr(e?.message || "Something went wrong."); }
    setBusy(false);
  }

  return (
    <section className="mt-8 rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Improve this case</h2>
          <p className="mt-0.5 text-xs text-slate-500">Edits suggested from how your students actually engaged.</p>
        </div>
        <button onClick={run} disabled={busy || !hasEngagement} className="btn-primary text-sm disabled:opacity-50">{busy ? "Reading the data…" : suggestions ? "Refresh" : "Suggest improvements"}</button>
      </div>
      {!hasEngagement && <p className="mt-3 text-xs text-slate-400">Share the case with a class first — suggestions are grounded in real engagement.</p>}
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-3 space-y-2">
          {suggestions.map((s, i) => (
            <div key={i} className="rounded-lg border border-line bg-mist/30 p-3">
              <div className="text-sm font-semibold text-ink">{s.title}</div>
              {s.why && <div className="mt-0.5 text-xs text-slate-500">Why: {s.why}</div>}
              {s.action && <div className="mt-1 text-sm text-slate2"><span className="font-semibold text-ink">Do:</span> {s.action}</div>}
            </div>
          ))}
        </div>
      )}
      {suggestions && suggestions.length === 0 && <p className="mt-3 text-sm text-slate2">No changes suggested — the case is engaging well.</p>}
    </section>
  );
}
