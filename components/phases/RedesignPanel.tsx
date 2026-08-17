"use client";

import { useState } from "react";
import { emptyGrid } from "@/lib/exercise";
import GridEditor from "@/components/GridEditor";
import PartnerJobCard from "@/components/PartnerJobCard";
import BuildPlan from "@/components/BuildPlan";
import { useT } from "@/components/I18nProvider";

export default function RedesignPanel(props: any) {
  const t = useT();
  const { myWorkspace, partnerWorkspace, updateMine, partnerProfile, session } = props;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  if (!myWorkspace) return <div className="text-slate2">{t("panel.redesignLoading")}</div>;
  const partnerName = partnerProfile?.display_name || t("panel.redesignPartnerFallback");
  const grid = { ...emptyGrid(), ...(myWorkspace.grid || {}) };

  const partnerJob = {
    jobTitle: partnerWorkspace?.owner_job_title,
    jobDescription: partnerWorkspace?.owner_job_description,
  };

  async function suggest() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "propose",
          notes: myWorkspace.interview_notes,
          ...partnerJob,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error || t("panel.redesignCantSuggest"));
        return;
      }
      updateMine({ grid: d.grid || {}, new_job_description: d.new_job_description || "" });
      setRationale(d.rationale || null);
    } catch {
      setErr(t("panel.redesignCantSuggest"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <PartnerJobCard {...props} />
        <NotesReference ws={myWorkspace} partnerName={partnerName} />
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate2">
          {t("panel.redesignStuck", { name: partnerName })}
        </div>
        <button onClick={suggest} disabled={busy} className="btn-primary text-sm">
          {busy ? t("room.thinking") : t("panel.redesignSuggestBtn")}
        </button>
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}
      {rationale && (
        <div className="card p-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-sage">{t("panel.redesignWhySplit")}</div>
          <p className="text-sm leading-relaxed text-slate2">{rationale}</p>
        </div>
      )}

      <GridEditor grid={grid} onChange={(g) => updateMine({ grid: g })} />

      <div className="card p-5">
        <label className="lbl">{t("panel.redesignRoleLabel", { name: partnerName })}</label>
        <p className="mb-2 text-sm text-slate2">
          {t("panel.redesignRoleHelp", { name: partnerName })}
        </p>
        <textarea
          className="field min-h-[130px]"
          placeholder={t("panel.redesignRolePh", { name: partnerName })}
          value={myWorkspace.new_job_description || ""}
          onChange={(e) => updateMine({ new_job_description: e.target.value })}
        />
      </div>

      {session?.id && session?.code && (
        <BuildPlan
          sessionId={session.id}
          code={session.code}
          jobTitle={partnerJob.jobTitle}
          jobDescription={partnerJob.jobDescription}
          grid={grid}
        />
      )}
    </div>
  );
}

// Your interview notes + your distilled summary, shown on screen while you design.
function NotesReference({ ws, partnerName }: { ws: any; partnerName: string }) {
  const t = useT();
  const [open, setOpen] = useState(true);
  const has =
    ws.interview_notes || ws.strategic_outcome || ws.real_job || ws.insight;
  if (!has) return <div className="card p-4 text-sm text-slate2">{t("panel.redesignNoNotes")}</div>;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-sage">
          {t("panel.redesignLearnedHeader", { name: partnerName })}
        </div>
        <button onClick={() => setOpen((o) => !o)} className="text-xs text-slate2 hover:text-ink">
          {open ? t("panel.redesignHide") : t("panel.redesignShow")}
        </button>
      </div>
      {open && (
        <div className="mt-2 space-y-2 text-sm">
          {ws.strategic_outcome && (
            <div>
              <span className="font-semibold text-slate2">{t("panel.redesignValueTag")}</span>
              <span className="text-ink">{ws.strategic_outcome}</span>
            </div>
          )}
          {ws.real_job && (
            <div>
              <span className="font-semibold text-slate2">{t("panel.redesignRealJobTag")}</span>
              <span className="text-ink">{ws.real_job}</span>
            </div>
          )}
          {ws.insight && (
            <div>
              <span className="font-semibold text-slate2">{t("panel.redesignInsightTag")}</span>
              <span className="text-ink">{ws.insight}</span>
            </div>
          )}
          {ws.interview_notes && (
            <div className="border-t border-line pt-2">
              <div className="mb-1 font-semibold text-slate2">{t("panel.redesignNotesTag")}</div>
              <p className="whitespace-pre-wrap leading-relaxed text-slate2">{ws.interview_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
