"use client";

import { useState } from "react";
import { PHASES, allInterviewNotes } from "@/lib/exercise";
import PartnerJobCard from "@/components/PartnerJobCard";
import { useT } from "@/components/I18nProvider";

export default function InterviewPanel(props: any) {
  const t = useT();
  const { myWorkspace, partnerWorkspace, partnerProfile, myProfile, updateMine, session, myRole } = props;
  if (!myWorkspace) return <div className="text-slate2">{t("panel.interviewLoading")}</div>;

  const partnerName = partnerProfile?.display_name || t("panel.interviewPartnerFallback");
  const phase = PHASES[session.phase] ?? PHASES[1];
  const iAmInterviewer = myRole === phase.interviewer;
  const value = phase.focus === "value";
  const askPrompt = value
    ? t("panel.interviewAskValue")
    : t("panel.interviewAskWork");
  const notesPlaceholder = value
    ? t("panel.interviewNotesPhValue")
    : t("panel.interviewNotesPhWork");

  // ---- You are being interviewed: just share ----
  if (!iAmInterviewer) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-6 text-center">
        <div className="rounded-2xl bg-mist p-8">
          <div className="text-4xl">🗣️</div>
          <h2 className="mt-3 text-xl font-bold text-ink">
            {t("panel.interviewBeingInterviewed", { name: partnerName })}
          </h2>
          <p className="mt-2 text-slate2">
            {value
              ? t("panel.interviewBeingValue")
              : t("panel.interviewBeingWork")}
          </p>
        </div>
        <div className="text-sm text-slate2">
          {t("panel.interviewSwitchNote", { name: partnerName })}
        </div>
      </div>
    );
  }

  // ---- You are the interviewer: take notes ----
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-sage-soft p-5">
        <div className="text-lg font-bold text-ink">
          🎤 {value ? t("panel.interviewDigDeeper", { name: partnerName }) : t("panel.interviewInterviewing", { name: partnerName })}
        </div>
        <p className="mt-1 text-sm text-slate2">
          {askPrompt} {t("panel.interviewSwitchShort")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <PartnerJobCard {...props} />
          <DeeperQuestions
            jobTitle={partnerWorkspace?.owner_job_title}
            jobDescription={partnerWorkspace?.owner_job_description}
            notes={allInterviewNotes(myWorkspace)}
          />
        </div>

        <div className="card p-5">
          {/* Dig-deeper turn gets its own box. Show the first-interview notes
              compactly above it for reference, without hogging the screen. */}
          {value && (myWorkspace.interview_notes || "").trim() && (
            <div className="mb-3 rounded-lg bg-mist/60 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate2">
                {t("panel.interviewFromFirst")}
              </div>
              <p className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-slate2">
                {myWorkspace.interview_notes}
              </p>
            </div>
          )}
          <label className="lbl">{t("panel.interviewNotesLabel", { name: partnerName })}</label>
          <textarea
            className="field min-h-[300px]"
            placeholder={notesPlaceholder}
            value={(value ? myWorkspace.interview_notes_value : myWorkspace.interview_notes) || ""}
            onChange={(e) =>
              updateMine(value ? { interview_notes_value: e.target.value } : { interview_notes: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );
}

function DeeperQuestions({
  jobTitle,
  jobDescription,
  notes,
}: {
  jobTitle?: string;
  jobDescription?: string;
  notes?: string;
}) {
  const t = useT();
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/deepen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle, jobDescription, notes }),
      });
      const d = await res.json();
      if (d.text) setText(d.text);
      else setErr(d.reason === "ai-off" ? t("panel.interviewAiOff") : t("panel.interviewCantGet"));
    } catch {
      setErr(t("panel.interviewCantGet"));
    }
    setBusy(false);
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-ink">{t("panel.interviewStuck")}</div>
        <button onClick={go} disabled={busy} className="btn-ghost text-sm">
          {busy ? t("room.thinking") : text ? t("panel.interviewMore") : t("panel.interviewAskAI")}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-clay">{err}</p>}
      {text && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate2">{text}</p>}
    </div>
  );
}
