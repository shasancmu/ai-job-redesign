"use client";

import { useState } from "react";
import { emptyGrid } from "@/lib/exercise";
import GridEditor from "@/components/GridEditor";
import PartnerJobCard from "@/components/PartnerJobCard";

export default function RedesignPanel(props: any) {
  const { myWorkspace, partnerWorkspace, updateMine, partnerProfile } = props;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  if (!myWorkspace) return <div className="text-slate2">Loading…</div>;
  const partnerName = partnerProfile?.display_name || "your partner";
  const grid = { ...emptyGrid(), ...(myWorkspace.grid || {}) };

  const partnerJob = {
    jobTitle: partnerWorkspace?.owner_job_title,
    jobDescription: partnerWorkspace?.owner_job_description,
  };

  async function suggest() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "propose",
          notes: myWorkspace.interview_notes,
          ...partnerJob,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error || "Couldn't suggest a split.");
        return;
      }
      updateMine({ grid: d.grid || {}, new_job_description: d.new_job_description || "" });
      setRationale(d.rationale || null);
    } catch {
      setErr("Couldn't suggest a split.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <PartnerJobCard {...props} />
        <NotesReference ws={myWorkspace} partnerName={partnerName} />
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate2">
          Stuck on the split? Let AI reason from your notes — what it can genuinely take, and what only{" "}
          {partnerName} can do. Then edit it.
        </div>
        <button onClick={suggest} disabled={busy} className="btn-primary text-sm">
          {busy ? "Thinking…" : "✨ AI: suggest a split"}
        </button>
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}
      {rationale && (
        <div className="card p-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-sage">Why this split</div>
          <p className="text-sm leading-relaxed text-slate2">{rationale}</p>
        </div>
      )}

      <GridEditor grid={grid} onChange={(g) => updateMine({ grid: g })} />

      <div className="card p-5">
        <label className="lbl">{partnerName}&apos;s reimagined role</label>
        <p className="mb-2 text-sm text-slate2">
          Pull it together: what does {partnerName} focus on — the value only they create — and how
          does AI make it possible?
        </p>
        <textarea
          className="field min-h-[130px]"
          placeholder={`In the redesigned role, ${partnerName} spends their time on… while AI handles…`}
          value={myWorkspace.new_job_description || ""}
          onChange={(e) => updateMine({ new_job_description: e.target.value })}
        />
      </div>

      <ExecutionPlan grid={grid} job={partnerJob} />
    </div>
  );
}

// "How do we actually do this?" — recipes for the AI-assigned tasks.
function ExecutionPlan({ grid, job }: { grid: Record<string, string[]>; job: any }) {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const aiTasks = ["search", "structure", "think", "translate"].flatMap((k) => grid[k] || []);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/execution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...job, aiTasks }),
      });
      const d = await res.json();
      if (d.text) setText(d.text);
      else if (d.reason === "no-tasks") setErr("Give AI some tasks first, then generate the plan.");
      else if (d.reason === "ai-off") setErr("AI isn't set up for this session.");
      else setErr("Couldn't build the plan.");
    } catch {
      setErr("Couldn't build the plan.");
    }
    setBusy(false);
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-ink">Make it real</div>
          <p className="text-sm text-slate2">Turn the AI tasks into a plan they could start this week.</p>
        </div>
        <button onClick={run} disabled={busy || aiTasks.length === 0} className="btn-ghost text-sm">
          {busy ? "Building…" : "✨ How to execute"}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-clay">{err}</p>}
      {text && <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate2">{text}</div>}
    </div>
  );
}

// Your interview notes + your distilled summary, shown on screen while you design.
function NotesReference({ ws, partnerName }: { ws: any; partnerName: string }) {
  const [open, setOpen] = useState(true);
  const has =
    ws.interview_notes || ws.strategic_outcome || ws.real_job || ws.insight;
  if (!has) return <div className="card p-4 text-sm text-slate2">No notes captured.</div>;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-sage">
          What you learned about {partnerName}
        </div>
        <button onClick={() => setOpen((o) => !o)} className="text-xs text-slate2 hover:text-ink">
          {open ? "hide" : "show"}
        </button>
      </div>
      {open && (
        <div className="mt-2 space-y-2 text-sm">
          {ws.strategic_outcome && (
            <div>
              <span className="font-semibold text-slate2">Value: </span>
              <span className="text-ink">{ws.strategic_outcome}</span>
            </div>
          )}
          {ws.real_job && (
            <div>
              <span className="font-semibold text-slate2">Real job: </span>
              <span className="text-ink">{ws.real_job}</span>
            </div>
          )}
          {ws.insight && (
            <div>
              <span className="font-semibold text-slate2">Insight: </span>
              <span className="text-ink">{ws.insight}</span>
            </div>
          )}
          {ws.interview_notes && (
            <div className="border-t border-line pt-2">
              <div className="mb-1 font-semibold text-slate2">Notes</div>
              <p className="whitespace-pre-wrap leading-relaxed text-slate2">{ws.interview_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
