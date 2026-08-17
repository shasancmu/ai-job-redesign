"use client";

import { useState } from "react";
import type { DiscDomain } from "@/lib/disclosure";

export default function DisclosureForm({
  token,
  domains,
  initial,
  alreadySubmitted,
}: {
  token: string;
  domains: DiscDomain[];
  initial: Record<string, string>;
  alreadySubmitted: boolean;
}) {
  const [ans, setAns] = useState<Record<string, string>>(initial);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(alreadySubmitted);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/disclose/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, responses: ans }),
      });
      const d = await res.json();
      if (res.ok) { setDone(true); window.scrollTo({ top: 0, behavior: "smooth" }); }
      else setErr(d.error || "Couldn't submit.");
    } catch { setErr("Couldn't submit."); }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="mt-8 rounded-xl bg-sage-soft px-5 py-6 text-center">
        <div className="text-lg font-bold text-sage">Thank you — your disclosure was submitted.</div>
        <p className="mt-1 text-sm text-slate-600">The buyer has received your responses. You can edit and re-submit from this same link if needed.</p>
        <button onClick={() => setDone(false)} className="btn-ghost mt-4 text-sm">Edit my responses</button>
      </div>
    );
  }

  const total = domains.reduce((n, d) => n + d.questions.length, 0);
  const filled = Object.values(ans).filter((v) => (v || "").trim().length > 0).length;

  return (
    <div className="mt-6">
      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-line bg-white/90 px-4 py-2 text-xs text-slate-500 backdrop-blur sm:-mx-6 sm:px-6">
        {filled} of {total} answered
      </div>
      <div className="space-y-6 pb-24">
        {domains.map((d, di) => (
          <div key={d.key} className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Domain {di + 1}</div>
            <div className="text-lg font-bold text-ink">{d.title}</div>
            <p className="mt-0.5 text-sm text-slate-500">{d.blurb}</p>
            <div className="mt-4 space-y-5">
              {d.questions.map((q) => (
                <div key={q.key}>
                  <label className="block text-sm font-semibold text-ink">{q.label}</label>
                  {q.help && <p className="mb-1.5 mt-0.5 text-xs leading-relaxed text-slate-400">{q.help}</p>}
                  <textarea
                    className="field min-h-[90px]"
                    value={ans[q.key] || ""}
                    onChange={(e) => setAns((a) => ({ ...a, [q.key]: e.target.value }))}
                    placeholder="Your disclosure…"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="text-sm text-slate-500">{filled}/{total} answered</span>
          <div className="flex items-center gap-3">
            {err && <span className="text-sm text-clay">{err}</span>}
            <button onClick={submit} disabled={busy} className="btn-primary">{busy ? "Submitting…" : "Submit disclosure"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
