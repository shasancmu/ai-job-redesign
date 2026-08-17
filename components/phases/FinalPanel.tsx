"use client";

import { FEEDBACK_FIELDS } from "@/lib/exercise";
import { useT } from "@/components/I18nProvider";

export default function FinalPanel(props: any) {
  const t = useT();
  const { myWorkspace, partnerWorkspace, partnerProfile, updateMine } = props;
  if (!myWorkspace) return <div className="text-slate-400">{t("panel.finalLoading")}</div>;

  const myFeedback = myWorkspace.feedback || {};
  const hasFeedback = FEEDBACK_FIELDS.some((f) => (myFeedback[f.key] || "").trim());
  const partnerName = partnerProfile?.display_name || t("panel.finalPartnerFallback");

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-4">
        {myWorkspace.new_job_description && (
          <div className="card bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("panel.finalYourDraft")}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-slate-600">
              {myWorkspace.new_job_description}
            </p>
          </div>
        )}

        {hasFeedback && (
          <div className="card p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("panel.finalFeedbackHeader", { name: partnerName })}
            </div>
            <div className="space-y-2">
              {FEEDBACK_FIELDS.map((f) =>
                (myFeedback[f.key] || "").trim() ? (
                  <div key={f.key} className="flex gap-2 text-sm">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: f.color }}
                    >
                      {f.symbol}
                    </span>
                    <span className="text-slate-600">{myFeedback[f.key]}</span>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}

        <div className="card p-5">
          <label className="lbl">
            {t("panel.finalReimaginedLabel", { name: partnerName })}
          </label>
          <p className="mb-2 text-sm text-slate-500">
            {t("panel.finalFoldHelp")}
          </p>
          <textarea
            className="field min-h-[150px]"
            placeholder={t("panel.finalReimaginedPh", { name: partnerName })}
            value={myWorkspace.final_description || ""}
            onChange={(e) => updateMine({ final_description: e.target.value })}
          />
        </div>
      </div>

      <div className="card border-2 border-orange-200 bg-orange-50/50 p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-human">
          {t("panel.finalJobForYou", { name: partnerName })}
        </div>
        {partnerWorkspace?.final_description || partnerWorkspace?.new_job_description ? (
          <p className="mt-2 whitespace-pre-wrap leading-relaxed text-slate-700">
            {partnerWorkspace.final_description || partnerWorkspace.new_job_description}
          </p>
        ) : (
          <p className="mt-2 text-slate-400">
            {t("panel.finalStillFinishing", { name: partnerName })}
          </p>
        )}
        <div className="mt-4 text-sm text-slate-400">
          {t("panel.finalSaved")}
        </div>
      </div>
    </div>
  );
}
