"use client";

import PartnerJobCard from "@/components/PartnerJobCard";

export default function InterviewPanel(props: any) {
  const { myWorkspace, updateMine } = props;
  if (!myWorkspace) return <div className="text-slate-400">Loading…</div>;

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_1.4fr]">
      <div className="space-y-4">
        <PartnerJobCard {...props} />
        <div className="card p-4 text-sm text-slate-600">
          <div className="mb-2 font-semibold text-slate-800">How to run this</div>
          <ol className="list-decimal space-y-1.5 pl-4">
            <li>One of you interviews the other for ~4 minutes.</li>
            <li>Halfway through, <span className="font-medium">swap</span> and switch roles.</li>
            <li>Listen for what <em>bogs them down</em> and what they wish they did more of.</li>
          </ol>
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-slate-500">
            Good questions: &ldquo;Walk me through a typical week.&rdquo; ·
            &ldquo;What eats your time that shouldn&apos;t?&rdquo; · &ldquo;When
            do you do your best work?&rdquo;
          </div>
        </div>
      </div>

      <div className="card p-5">
        <label className="lbl">Your interview notes</label>
        <textarea
          className="field min-h-[320px]"
          placeholder="What bogs your partner down? What do they want to spend more time on? What surprised you?"
          value={myWorkspace.interview_notes || ""}
          onChange={(e) => updateMine({ interview_notes: e.target.value })}
        />
      </div>
    </div>
  );
}
