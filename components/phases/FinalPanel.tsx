"use client";

import { useState } from "react";
import Link from "next/link";
import { FEEDBACK_FIELDS } from "@/lib/exercise";
import { useT } from "@/components/I18nProvider";

export default function FinalPanel(props: any) {
  const t = useT();
  const { myWorkspace, partnerWorkspace, partnerProfile, updateMine, session } = props;
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

      <GiftHandoff
        code={session?.code}
        partnerName={partnerName}
        partnerReady={
          !!(
            partnerWorkspace?.plan?.headline ||
            partnerWorkspace?.plan?.summary ||
            partnerWorkspace?.final_description ||
            partnerWorkspace?.new_job_description
          )
        }
        t={t}
      />
    </div>
  );
}

// The gift moment: open the reimagined role your partner made for you, and send
// them theirs. Both open the same /gift/[code], each seeing the gift made for them.
function GiftHandoff({
  code,
  partnerName,
  partnerReady,
  t,
}: {
  code?: string;
  partnerName: string;
  partnerReady: boolean;
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  const [copied, setCopied] = useState(false);
  function copyLink() {
    if (!code) return;
    try {
      const url = `${window.location.origin}/gift/${code}`;
      navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <div className="card overflow-hidden p-0">
      <div className="h-1.5" style={{ background: "linear-gradient(90deg, #3F7A52, #CE8F2C)" }} />
      <div className="p-5">
        <div className="flex items-center gap-2 text-lg font-bold text-ink">
          <span aria-hidden>🎁</span>
          {t("panel.giftTheirGift", { name: partnerName })}
        </div>
        {partnerReady ? (
          <>
            <p className="mt-1 text-sm text-slate2">{t("panel.giftOpenBlurb", { name: partnerName })}</p>
            {code && (
              <Link href={`/gift/${code}`} className="btn-primary mt-3 inline-block">
                {t("panel.giftOpen")}
              </Link>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-400">{t("panel.finalStillFinishing", { name: partnerName })}</p>
        )}

        <div className="mt-5 border-t border-line pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate2">
            {t("panel.giftGiveYours", { name: partnerName })}
          </div>
          <p className="mt-1 text-sm text-slate2">{t("panel.giftPasteHint")}</p>
          <button onClick={copyLink} disabled={!code} className="btn-ghost mt-2 text-sm">
            {copied ? t("panel.giftCopied") : t("panel.giftCopyLink")}
          </button>
        </div>
      </div>
    </div>
  );
}
