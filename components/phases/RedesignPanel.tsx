"use client";

import { useState } from "react";
import { emptyGrid } from "@/lib/exercise";
import GridEditor from "@/components/GridEditor";
import PartnerJobCard from "@/components/PartnerJobCard";

export default function RedesignPanel(props: any) {
  const { myWorkspace, updateMine, partnerProfile } = props;
  if (!myWorkspace) return <div className="text-slate2">Loading…</div>;
  const partnerName = partnerProfile?.display_name || "your partner";
  const grid = { ...emptyGrid(), ...(myWorkspace.grid || {}) };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <PartnerJobCard {...props} />
        <NotesReference ws={myWorkspace} partnerName={partnerName} />
      </div>

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
