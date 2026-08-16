"use client";

import { useEffect, useState } from "react";
import { PHASES } from "@/lib/exercise";
import PartnerJobCard from "@/components/PartnerJobCard";

export default function InterviewPanel(props: any) {
  const { myWorkspace, partnerWorkspace, partnerProfile, updateMine, session, myRole } = props;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  if (!myWorkspace) return <div className="text-slate2">Loading…</div>;

  const partnerName = partnerProfile?.display_name || "your partner";
  const minutes = PHASES.find((p) => p.key === "interview")?.minutes || 8;
  const started = session.phase_started_at ? new Date(session.phase_started_at).getTime() : now;
  const elapsed = Math.max(0, Math.floor((now - started) / 1000));
  const half = (minutes * 60) / 2;
  const round = elapsed < half ? 1 : 2;
  const roundEnd = round === 1 ? half : minutes * 60;
  const remaining = Math.max(0, roundEnd - elapsed);
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  // Round 1: A interviews B. Round 2: B interviews A.
  const interviewerRole = round === 1 ? "A" : "B";
  const iAmInterviewer = myRole === interviewerRole;
  const justSwitched = round === 2 && elapsed - half < 8;

  return (
    <div className="space-y-4">
      {/* Role + turn banner */}
      {justSwitched ? (
        <div className="animate-pulse rounded-2xl bg-ink p-5 text-center text-white">
          <div className="text-lg font-bold">🔄 Switch!</div>
          <div className="mt-1 text-white/80">
            Now {iAmInterviewer ? "you interview" : `${partnerName} interviews you`}.
          </div>
        </div>
      ) : (
        <div
          className={
            "rounded-2xl p-5 " + (iAmInterviewer ? "bg-sage-soft" : "bg-mist")
          }
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate2">
              Round {round} of 2 · you&apos;re Partner {myRole}
            </span>
            <span
              className={
                "font-mono text-2xl font-bold tabular-nums " +
                (remaining <= 20 ? "text-clay" : "text-ink")
              }
            >
              {mm}:{ss.toString().padStart(2, "0")}
            </span>
          </div>
          <div className="mt-2 text-lg font-bold text-ink">
            {iAmInterviewer
              ? `🎤 You're interviewing ${partnerName}`
              : `🗣️ ${partnerName} is interviewing you — just talk`}
          </div>
          <p className="mt-1 text-sm text-slate2">
            {iAmInterviewer
              ? "Dig into the value they create — for the customer, the organization, their manager. Not the tasks — the value."
              : "Talk about your work as it really is. Let them dig."}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <PartnerJobCard {...props} />
          {iAmInterviewer && (
            <DeeperQuestions
              jobTitle={partnerWorkspace?.owner_job_title}
              jobDescription={partnerWorkspace?.owner_job_description}
              notes={myWorkspace.interview_notes}
            />
          )}
        </div>

        <div className="card p-5">
          <label className="lbl">
            Your notes on {partnerName}&apos;s value
          </label>
          <textarea
            className="field min-h-[300px]"
            placeholder="What value do they create, and for whom? What only they can do? What drains them? What surprised you?"
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
