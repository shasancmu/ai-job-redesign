"use client";

import PartnerJobCard from "@/components/PartnerJobCard";

export default function RealJobPanel(props: any) {
  const { myWorkspace, updateMine } = props;
  if (!myWorkspace) return <div className="text-slate-400">Loading…</div>;

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_1.4fr]">
      <div className="space-y-4">
        <PartnerJobCard {...props} />
        <div className="card p-4 text-sm text-slate-500">
          Work solo now. You&apos;re forming a point of view about what your
          partner is <em>really</em> for — beyond the job title.
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <label className="lbl">
            What is your partner really trying to achieve? (their strategic outcome)
          </label>
          <textarea
            className="field"
            placeholder="The outcome their job exists to produce — not the tasks."
            value={myWorkspace.strategic_outcome || ""}
            onChange={(e) => updateMine({ strategic_outcome: e.target.value })}
          />
        </div>
        <div className="card p-5">
          <label className="lbl">Their real job, in your view</label>
          <textarea
            className="field"
            placeholder="What should they lean into? What should they hand to AI?"
            value={myWorkspace.real_job || ""}
            onChange={(e) => updateMine({ real_job: e.target.value })}
          />
        </div>
        <div className="card p-5">
          <label className="lbl">
            One thing you see that maybe they don&apos;t
          </label>
          <textarea
            className="field min-h-[70px]"
            placeholder="An insight about their strengths or what's holding them back."
            value={myWorkspace.insight || ""}
            onChange={(e) => updateMine({ insight: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
