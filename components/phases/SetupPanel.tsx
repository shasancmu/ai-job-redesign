"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/components/I18nProvider";

export default function SetupPanel(props: any) {
  const t = useT();
  const { myWorkspace, myProfile, partnerWorkspace, partnerProfile, updateMine, updateProfile } = props;
  const seeded = useRef(false);

  // Prefill from a saved profile the first time, if this workspace is blank.
  useEffect(() => {
    if (seeded.current || !myWorkspace) return;
    seeded.current = true;
    if (!myWorkspace.owner_job_title && (myProfile?.job_title || myProfile?.job_description)) {
      updateMine({
        owner_job_title: myProfile.job_title || "",
        owner_job_description: myProfile.job_description || "",
      });
    }
  }, [myWorkspace, myProfile, updateMine]);

  if (!myWorkspace) return <Loading />;

  const partnerTitle = partnerWorkspace?.owner_job_title;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card p-6">
        <div className="mb-1 text-sm font-semibold text-human">{t("panel.setupYourJob")}</div>
        <p className="mb-4 text-sm text-slate-500">
          {t("panel.setupYourJobHelp")}
        </p>
        <label className="lbl">{t("panel.setupJobTitle")}</label>
        <input
          className="field"
          placeholder={t("panel.setupJobTitlePh")}
          value={myWorkspace.owner_job_title || ""}
          onChange={(e) => {
            updateMine({ owner_job_title: e.target.value });
            updateProfile({ job_title: e.target.value });
          }}
        />
        <label className="lbl mt-4">{t("panel.setupWhatYouDo")}</label>
        <textarea
          className="field"
          placeholder={t("panel.setupWhatYouDoPh")}
          value={myWorkspace.owner_job_description || ""}
          onChange={(e) => {
            updateMine({ owner_job_description: e.target.value });
            updateProfile({ job_description: e.target.value });
          }}
        />
      </div>

      <div className="card bg-slate-50 p-6">
        <div className="mb-1 text-sm font-semibold text-ai">
          {partnerProfile?.display_name
            ? t("panel.setupPartnerJobNamed", { name: partnerProfile.display_name })
            : t("panel.setupPartnerJob")}
        </div>
        <p className="mb-4 text-sm text-slate-500">
          {t("panel.setupPartnerJobHelp")}
        </p>
        {partnerTitle ? (
          <>
            <div className="text-lg font-semibold">{partnerTitle}</div>
            <p className="mt-2 whitespace-pre-wrap text-slate-600">
              {partnerWorkspace?.owner_job_description || "…"}
            </p>
          </>
        ) : (
          <div className="flex items-center gap-2 text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-ai" />
            {t("panel.setupWaiting")}
          </div>
        )}
      </div>
    </div>
  );
}

function Loading() {
  const t = useT();
  return <div className="text-slate-400">{t("panel.setupLoading")}</div>;
}
