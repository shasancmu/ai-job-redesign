"use client";

import PartnerJobCard from "@/components/PartnerJobCard";
import { useT } from "@/components/I18nProvider";

export default function RealJobPanel(props: any) {
  const t = useT();
  const { myWorkspace, partnerProfile, updateMine } = props;
  if (!myWorkspace) return <div className="text-slate2">{t("panel.realJobLoading")}</div>;
  const partnerName = partnerProfile?.display_name || t("panel.realJobPartnerFallback");

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_1.4fr]">
      <div className="space-y-4">
        <PartnerJobCard {...props} />
        <div className="card p-4 text-sm text-slate2">
          {t("panel.realJobSoloPre")}{" "}
          <span className="font-semibold text-ink">{t("panel.realJobValueWord")}</span> {partnerName} {t("panel.realJobCreatesSuffix")}
        </div>
        {myWorkspace.interview_notes && (
          <div className="card p-4">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-sage">
              {t("panel.realJobYourNotes")}
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
            {t("panel.realJobValueLabel", { name: partnerName })}
          </label>
          <p className="mb-2 text-sm text-slate2">
            {t("panel.realJobValueHelp")}
          </p>
          <textarea
            className="field"
            placeholder={t("panel.realJobValuePh")}
            value={myWorkspace.strategic_outcome || ""}
            onChange={(e) => updateMine({ strategic_outcome: e.target.value })}
          />
        </div>
        <div className="card p-5">
          <label className="lbl">{t("panel.realJobDeepestLabel")}</label>
          <p className="mb-2 text-sm text-slate2">
            {t("panel.realJobDeepestHelp", { name: partnerName })}
          </p>
          <textarea
            className="field"
            placeholder={t("panel.realJobDeepestPh")}
            value={myWorkspace.real_job || ""}
            onChange={(e) => updateMine({ real_job: e.target.value })}
          />
        </div>
        <div className="card p-5">
          <label className="lbl">
            {t("panel.realJobInsightLabel")}
          </label>
          <textarea
            className="field min-h-[70px]"
            placeholder={t("panel.realJobInsightPh")}
            value={myWorkspace.insight || ""}
            onChange={(e) => updateMine({ insight: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
