"use client";

import PartnerJobCard from "@/components/PartnerJobCard";

export default function RealJobPanel(props: any) {
  const { myWorkspace, partnerProfile, updateMine } = props;
  if (!myWorkspace) return <div className="text-slate2">Loading…</div>;
  const partnerName = partnerProfile?.display_name || "your partner";

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_1.4fr]">
      <div className="space-y-4">
        <PartnerJobCard {...props} />
        <div className="card p-4 text-sm text-slate2">
          Work solo now — distill your notes into a point of view about the{" "}
          <span className="font-semibold text-ink">value</span> {partnerName} creates.
        </div>
        {myWorkspace.interview_notes && (
          <div className="card p-4">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-sage">
              Your notes
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate2">
              {myWorkspace.interview_notes}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <label className="lbl">
            The value {partnerName} creates — and for whom?
          </label>
          <p className="mb-2 text-sm text-slate2">
            For the end customer, the organization, their manager. Name the value, not the work
            product.
          </p>
          <textarea
            className="field"
            placeholder="Who is better off because of them, and how?"
            value={myWorkspace.strategic_outcome || ""}
            onChange={(e) => updateMine({ strategic_outcome: e.target.value })}
          />
        </div>
        <div className="card p-5">
          <label className="lbl">The deepest source of that value</label>
          <p className="mb-2 text-sm text-slate2">
            The part only {partnerName} can do — judgment, relationships, taste, trust.
          </p>
          <textarea
            className="field"
            placeholder="What would be lost if anyone else did this?"
            value={myWorkspace.real_job || ""}
            onChange={(e) => updateMine({ real_job: e.target.value })}
          />
        </div>
        <div className="card p-5">
          <label className="lbl">
            One thing about their value they might not see
          </label>
          <textarea
            className="field min-h-[70px]"
            placeholder="An insight from the interview — where their real worth actually lives."
            value={myWorkspace.insight || ""}
            onChange={(e) => updateMine({ insight: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
