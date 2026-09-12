"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Item = { conversationId: string; module: string | null; turns: { speaker: string; text: string }[] };

async function post(body: any) {
  const res = await fetch("/api/admin/calibration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || "Failed");
  return d;
}

export default function CalibrationRater() {
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rated, setRated] = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const d = await post({ action: "next" });
      setItem(d.item || null); setDone(!d.item);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!item) return;
    const s = Number(score);
    if (!Number.isFinite(s) || s < 0 || s > 100) { setErr("Enter a score from 0 to 100."); return; }
    setBusy(true); setErr(null);
    try {
      const d = await post({ action: "rate", conversationId: item.conversationId, module: item.module, score: s, notes });
      setRated((n) => n + 1);
      setScore(""); setNotes("");
      setItem(d.item || null); setDone(!d.item);
      router.refresh(); // update the report table
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function skip() { setScore(""); setNotes(""); await load(); }

  if (loading) return <div className="card p-6 text-sm text-slate2">Loading a run…</div>;
  if (done || !item) return <div className="card p-6 text-sm text-slate2">Nothing left for you to rate. {rated > 0 && `You rated ${rated} this session.`}</div>;

  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Module: <span className="font-mono">{item.module || "—"}</span></span>
        <span>{rated > 0 && `Rated ${rated} this session`}</span>
      </div>

      <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-lg border border-line bg-slate-50/50 p-4">
        {item.turns.length === 0 && <p className="text-sm text-slate-400">No transcript captured for this run.</p>}
        {item.turns.map((t, i) => (
          <div key={i} className={t.speaker === "human" ? "text-ink" : "text-slate-500"}>
            <span className="mr-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t.speaker === "human" ? "Learner" : "AI"}</span>
            <span className="whitespace-pre-wrap text-sm">{t.text}</span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-white p-3 text-xs text-slate2">
        <b className="text-ink">Rubric (v1):</b> Score the learner&apos;s demonstrated competence on this module&apos;s task 0–100 — the quality of their reasoning, the specificity and applicability of what they produced, and how much their thinking moved. Judge the learner, not the AI. Ignore length.
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="lbl">Competence (0–100)</label>
          <input className="field w-28 text-lg tabular-nums" inputMode="numeric" value={score} onChange={(e) => setScore(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))} placeholder="0–100" autoFocus />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="lbl">Notes <span className="font-normal text-slate-400">(optional)</span></label>
          <input className="field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What drove the score" />
        </div>
      </div>

      {err && <p className="text-sm text-clay">{err}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy || score === ""} className="btn-primary text-sm">{busy ? "Saving…" : "Save & next"}</button>
        <button onClick={skip} disabled={busy} className="btn-ghost text-sm">Skip</button>
      </div>
    </div>
  );
}
