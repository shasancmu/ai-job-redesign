"use client";

import { useState } from "react";
import { PHASES } from "@/lib/exercise";
import PartnerJobCard from "@/components/PartnerJobCard";

export default function InterviewPanel(props: any) {
  const { myWorkspace, partnerWorkspace, partnerProfile, myProfile, updateMine, session, myRole } = props;
  if (!myWorkspace) return <div className="text-slate2">Loading…</div>;

  const partnerName = partnerProfile?.display_name || "your partner";
  const phase = PHASES[session.phase] ?? PHASES[1];
  const iAmInterviewer = myRole === phase.interviewer;
  const value = phase.focus === "value";
  const askPrompt = value
    ? "Dig into the value they create — for the customer, the organization, their manager. How would you know it's working?"
    : "Understand what they actually do, what matters in it, and what drains them.";
  const notesPlaceholder = value
    ? "What value do they create, and for whom? How would you know? What only they can do?"
    : "What do they do day to day? What matters most? What eats their time?";

  // ---- You are being interviewed: just share ----
  if (!iAmInterviewer) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-6 text-center">
        <div className="rounded-2xl bg-mist p-8">
          <div className="text-4xl">🗣️</div>
          <h2 className="mt-3 text-xl font-bold text-ink">
            {partnerName} is interviewing you
          </h2>
          <p className="mt-2 text-slate2">
            {value
              ? "Nothing to type. Talk about the value you create — for the customer, the organization, your manager. Let them dig."
              : "Nothing to type. Just talk about your work — what you do and what matters in it. Let them dig."}
          </p>
        </div>
        <div className="text-sm text-slate2">
          When the timer ends, you&apos;ll switch and interview {partnerName}.
        </div>
      </div>
    );
  }

  // ---- You are the interviewer: take notes ----
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-sage-soft p-5">
        <div className="text-lg font-bold text-ink">
          🎤 {value ? `Dig deeper with ${partnerName}` : `You're interviewing ${partnerName}`}
        </div>
        <p className="mt-1 text-sm text-slate2">
          {askPrompt} When the timer ends, you&apos;ll switch.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <PartnerJobCard {...props} />
          <DeeperQuestions
            jobTitle={partnerWorkspace?.owner_job_title}
            jobDescription={partnerWorkspace?.owner_job_description}
            notes={myWorkspace.interview_notes}
          />
        </div>

        <div className="card p-5">
          <label className="lbl">Your notes on {partnerName}&apos;s value</label>
          <textarea
            className="field min-h-[300px]"
            placeholder={notesPlaceholder}
            value={myWorkspace.interview_notes || ""}
            onChange={(e) => updateMine({ interview_notes: e.target.value })}
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
      else setErr(d.reason === "ai-off" ? "AI isn't set up for this session." : "Couldn't get questions.");
    } catch {
      setErr("Couldn't get questions.");
    }
    setBusy(false);
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-ink">Stuck? Go deeper</div>
        <button onClick={go} disabled={busy} className="btn-ghost text-sm">
          {busy ? "Thinking…" : text ? "More" : "✨ Ask AI"}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-clay">{err}</p>}
      {text && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate2">{text}</p>}
    </div>
  );
}
