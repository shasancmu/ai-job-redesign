"use client";

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
      <PartnerJobCard {...props} />

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
