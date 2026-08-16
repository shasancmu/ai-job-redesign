"use client";

import { useState } from "react";
import type { BenchConfig } from "@/lib/benchmark";

export default function BenchmarkEditor({ initial }: { initial: BenchConfig }) {
  const [cfg, setCfg] = useState<BenchConfig>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function setQ(i: number, patch: any) {
    setCfg((c) => ({
      ...c,
      questions: c.questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)),
    }));
  }
  function setOpt(i: number, j: number, text: string) {
    setCfg((c) => ({
      ...c,
      questions: c.questions.map((q, idx) =>
        idx === i
          ? { ...q, options: q.options.map((o, oj) => (oj === j ? { ...o, text } : o)) }
          : q
      ),
    }));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/benchmark/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? (data.ready ? "Saved. The benchmark is ready to run." : "Saved (some questions still blank).") : data.error || "Save failed.");
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="lbl">Title</label>
            <input className="field" value={cfg.title} onChange={(e) => setCfg((c) => ({ ...c, title: e.target.value }))} />
          </div>
          <div>
            <label className="lbl">Time limit (minutes)</label>
            <input
              className="field"
              type="number"
              min={1}
              value={Math.round(cfg.timeLimitSec / 60)}
              onChange={(e) => setCfg((c) => ({ ...c, timeLimitSec: Math.max(30, (parseInt(e.target.value, 10) || 1) * 60) }))}
            />
          </div>
        </div>
      </div>

      {cfg.questions.map((q, i) => (
        <div key={q.id} className="card p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-sage">
              Question {q.id}
            </span>
            <label className="flex items-center gap-2 text-sm text-slate2">
              Correct
              <select
                className="rounded-lg border border-line px-2 py-1 text-ink"
                value={q.answer}
                onChange={(e) => setQ(i, { answer: e.target.value })}
              >
                {q.options.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.key}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <textarea
            className="field"
            placeholder="Paste the question passage / stem here…"
            value={q.prompt}
            onChange={(e) => setQ(i, { prompt: e.target.value })}
          />
          <div className="mt-3 space-y-2">
            {q.options.map((o, j) => (
              <div key={o.key} className="flex items-center gap-2">
                <span
                  className={
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold " +
                    (q.answer === o.key ? "bg-sage text-white" : "bg-mist text-slate2")
                  }
                >
                  {o.key}
                </span>
                <input
                  className="field"
                  placeholder={`Choice ${o.key}`}
                  value={o.text}
                  onChange={(e) => setOpt(i, j, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-paper/90 py-3 backdrop-blur">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? "Saving…" : "Save questions"}
        </button>
        {msg && <span className="text-sm text-slate2">{msg}</span>}
      </div>
    </div>
  );
}
