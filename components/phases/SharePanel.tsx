"use client";

import { AI_CELLS, HUMAN_CELLS, FEEDBACK_FIELDS, Cell } from "@/lib/exercise";
import { useT } from "@/components/I18nProvider";

export default function SharePanel(props: any) {
  const t = useT();
  const { partnerWorkspace, partnerProfile, updatePartnerFeedback } = props;

  if (!partnerWorkspace) {
    return (
      <div className="card p-8 text-center text-slate-400">
        {t("panel.shareWaiting")}
      </div>
    );
  }

  const fb = partnerWorkspace.feedback || {};
  const partnerName = partnerProfile?.display_name || t("panel.sharePartnerFallback");

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      {/* The reveal: what my partner designed for MY job */}
      <div className="card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-ai">
          {t("panel.shareRedesignHeader", { name: partnerName })}
        </div>

        {partnerWorkspace.new_job_description ? (
          <p className="mt-2 whitespace-pre-wrap text-lg leading-relaxed">
            {partnerWorkspace.new_job_description}
          </p>
        ) : (
          <p className="mt-2 text-slate-400">
            {t("panel.shareStillWriting")}
          </p>
        )}

        {partnerWorkspace.real_job && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
            <span className="font-semibold text-slate-700">
              {t("panel.shareRealJobLabel")}
            </span>
            <span className="text-slate-600">{partnerWorkspace.real_job}</span>
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <GridSide title={t("panel.shareGaveAI")} role="ai" cells={AI_CELLS} grid={partnerWorkspace.grid || {}} />
          <GridSide title={t("panel.shareKeptHuman")} role="human" cells={HUMAN_CELLS} grid={partnerWorkspace.grid || {}} />
        </div>
      </div>

      {/* My reaction → becomes their feedback */}
      <div className="space-y-3">
        <div className="text-sm text-slate-500">
          {t("panel.shareTalkThrough", { name: partnerName })}
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
  const t = useT();
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
              <div className="font-semibold text-slate-700">{c.label}</div>
              <ul className="mt-0.5 space-y-0.5">
                {items.map((it, i) => (
                  <li key={i} className="flex gap-1.5 text-slate-500">
                    <span className="text-slate-300">•</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {cells.every((c) => (grid[c.key] || []).length === 0) && (
          <div className="text-sm text-slate-400">{t("panel.shareNothingAssigned")}</div>
        )}
      </div>
    </div>
  );
}
