"use client";

import { AI_CELLS, HUMAN_CELLS, FEEDBACK_FIELDS, Cell } from "@/lib/exercise";

export default function SharePanel(props: any) {
  const { partnerWorkspace, partnerProfile, updatePartnerFeedback } = props;

  if (!partnerWorkspace) {
    return (
      <div className="card p-8 text-center text-slate-400">
        Waiting for your partner&apos;s redesign to arrive…
      </div>
    );
  }

  const fb = partnerWorkspace.feedback || {};
  const partnerName = partnerProfile?.display_name || "Your partner";

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      {/* The reveal: what my partner designed for MY job */}
      <div className="card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-ai">
          {partnerName}&apos;s redesign of your job
        </div>

        {partnerWorkspace.new_job_description ? (
          <p className="mt-2 whitespace-pre-wrap text-lg leading-relaxed">
            {partnerWorkspace.new_job_description}
          </p>
        ) : (
          <p className="mt-2 text-slate-400">
            They&apos;re still writing your new job description…
          </p>
        )}

        {partnerWorkspace.real_job && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
            <span className="font-semibold text-slate-700">
              What they think your real job is:{" "}
            </span>
            <span className="text-slate-600">{partnerWorkspace.real_job}</span>
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <GridSide title="They gave AI" role="ai" cells={AI_CELLS} grid={partnerWorkspace.grid || {}} />
          <GridSide title="They kept human" role="human" cells={HUMAN_CELLS} grid={partnerWorkspace.grid || {}} />
        </div>
      </div>

      {/* My reaction → becomes their feedback */}
      <div className="space-y-3">
        <div className="text-sm text-slate-500">
          Talk it through on Zoom, then capture your reactions. {partnerName}{" "}
          sees these as feedback on their design.
        </div>
        {FEEDBACK_FIELDS.map((f) => (
          <div key={f.key} className="card p-4">
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-600">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: f.color }}
              >
                {f.symbol}
              </span>
              {f.label}
            </label>
            <textarea
              className="field min-h-[64px]"
              value={fb[f.key] || ""}
              onChange={(e) => updatePartnerFeedback({ [f.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function GridSide({
  title,
  role,
  cells,
  grid,
}: {
  title: string;
  role: "ai" | "human";
  cells: Cell[];
  grid: Record<string, string[]>;
}) {
  const accent = role === "ai" ? "text-ai" : "text-human";
  return (
    <div>
      <div className={"mb-2 text-xs font-bold uppercase tracking-wide " + accent}>
        {title}
      </div>
      <div className="space-y-2">
        {cells.map((c) => {
          const items = grid[c.key] || [];
          if (items.length === 0) return null;
          return (
            <div key={c.key} className="text-sm">
              <span className="font-semibold text-slate-700">{c.label}: </span>
              <span className="text-slate-500">{items.join(", ")}</span>
            </div>
          );
        })}
        {cells.every((c) => (grid[c.key] || []).length === 0) && (
          <div className="text-sm text-slate-400">— nothing assigned yet —</div>
        )}
      </div>
    </div>
  );
}
