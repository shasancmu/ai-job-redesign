"use client";

import { useT } from "@/components/I18nProvider";
import { allInterviewNotes } from "@/lib/exercise";

export default function BreakPanel(props: any) {
  const t = useT();
  const { myWorkspace, partnerProfile } = props;
  const partnerName = partnerProfile?.display_name || t("panel.breakPartnerFallback");
  const notes = allInterviewNotes(myWorkspace);

  return (
    <div className="mx-auto max-w-lg space-y-4 py-6 text-center">
      <div className="rounded-2xl bg-mist p-8">
        <div className="text-4xl">✋</div>
        <h2 className="mt-3 text-xl font-bold text-ink">{t("panel.breakTitle")}</h2>
        <p className="mt-2 text-slate2">
          {t("panel.breakTeachPre")} <b className="text-ink">{t("panel.breakModelName")}</b>{t("panel.breakWatchMid")}{" "}
          <b className="text-ink">{t("room.next")}</b> {t("panel.breakRedesignMid")}{" "}
          {partnerName}{t("panel.breakJobSuffix")}
        </p>
      </div>

      {notes && (
        <div className="card p-5 text-left">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-sage">
            {t("panel.breakNotesHeader", { name: partnerName })}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate2">{notes}</p>
        </div>
      )}
    </div>
  );
}
