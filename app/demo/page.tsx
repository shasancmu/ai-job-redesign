"use client";

// A no-backend walkthrough of the full exercise UI. Renders the real phase
// panels with local mock state so you can click through all six steps without
// Supabase or a partner. Not part of the real flow — just for previewing.

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { PHASES, emptyGrid } from "@/lib/exercise";
import SetupPanel from "@/components/phases/SetupPanel";
import InterviewPanel from "@/components/phases/InterviewPanel";
import RealJobPanel from "@/components/phases/RealJobPanel";
import RedesignPanel from "@/components/phases/RedesignPanel";
import SharePanel from "@/components/phases/SharePanel";
import FinalPanel from "@/components/phases/FinalPanel";
import Timer from "@/components/Timer";

export default function DemoPage() {
  const me = "me";
  const partner = "partner";

  const [phase, setPhase] = useState(0);
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());

  const [myProfile, setMyProfile] = useState<any>({
    id: me,
    display_name: "You",
    job_title: "",
    job_description: "",
  });
  const partnerProfile = { id: partner, display_name: "Jordan" };

  const [myWorkspace, setMyWorkspace] = useState<any>({
    id: "ws-me",
    author_id: me,
    owner_job_title: "",
    owner_job_description: "",
    interview_notes: "",
    strategic_outcome: "",
    real_job: "",
    insight: "",
    grid: emptyGrid(),
    new_job_description: "",
    feedback: {
      plus: "The AI/human split feels right — I hadn't thought of handing off the first-draft synthesis.",
      minus: "Worried 'Judge' is too vague. What exactly am I sanity-checking?",
      idea: "Could batch the weekly reports and review them in one focused block.",
    },
    final_description: "",
  });

  // A partner who has already filled things in, so the reveal has content.
  const [partnerWorkspace, setPartnerWorkspace] = useState<any>({
    id: "ws-partner",
    author_id: partner,
    owner_job_title: "Product Marketing Manager",
    owner_job_description:
      "I own go-to-market for two product lines — messaging, launches, sales enablement, and competitive research.",
    interview_notes: "",
    strategic_outcome: "",
    real_job:
      "Their real job is judgment about which stories will land with buyers — not producing the collateral itself.",
    insight: "",
    grid: {
      ...emptyGrid(),
      search: ["Scan", "Aggregate"],
      structure: ["Organize", "Cluster"],
      think: ["Analyze", "Compare"],
      translate: ["Summarize", "Adapt"],
      lead: ["Set strategy", "Champion"],
      judge: ["Apply taste", "Veto"],
      integrate: ["Build relationships", "Negotiate"],
    },
    new_job_description:
      "In your reimagined role, you lead the narrative and own which bets to make, while AI scans the competitive field, clusters the signal, and drafts the first pass of every asset. You spend your week on judgment and customer relationships, not on producing collateral.",
    feedback: {},
    final_description: "",
  });

  const updateMine = useCallback((patch: any) => {
    setMyWorkspace((w: any) => ({ ...w, ...patch }));
  }, []);
  const updateProfile = useCallback((patch: any) => {
    setMyProfile((p: any) => ({ ...p, ...patch }));
  }, []);
  const updatePartnerFeedback = useCallback((fb: any) => {
    setPartnerWorkspace((w: any) => ({ ...w, feedback: { ...w.feedback, ...fb } }));
  }, []);

  const p = PHASES[phase];
  const props = {
    me,
    session: { phase, phase_started_at: startedAt },
    myWorkspace,
    partnerWorkspace,
    myProfile,
    partnerProfile,
    updateMine,
    updatePartnerFeedback,
    updateProfile,
    myRole: "A",
  };

  function go(next: number) {
    const clamped = Math.max(0, Math.min(PHASES.length - 1, next));
    setPhase(clamped);
    setStartedAt(new Date().toISOString());
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-4 rounded-xl bg-blue-50 px-4 py-2 text-sm text-blue-800">
        Preview — the Job exercise, mock data.{" "}
        <Link href="/demo/workflow" className="font-semibold underline">
          Workflow exercise
        </Link>{" "}
        ·{" "}
        <Link href="/demo/solo" className="font-semibold underline">
          Solo with AI
        </Link>{" "}
        ·{" "}
        <Link href="/" className="font-semibold underline">
          Home
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-sm font-semibold tracking-widest">
            DEMO1
          </span>
          <span className="hidden text-sm text-slate-500 sm:inline">
            with <span className="font-medium text-slate-700">Jordan</span>
          </span>
        </div>
        <Timer
          startedAt={startedAt}
          minutes={p.minutes}
          onReset={() => setStartedAt(new Date().toISOString())}
        />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {PHASES.map((ph) => (
          <button
            key={ph.key}
            onClick={() => go(ph.index)}
            title={ph.title}
            className={
              "h-1.5 flex-1 rounded-full transition " +
              (ph.index < phase
                ? "bg-ink"
                : ph.index === phase
                  ? "bg-ai"
                  : "bg-slate-200 hover:bg-slate-300")
            }
          />
        ))}
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Step {phase + 1} of {PHASES.length} · {p.minutes} min
        </div>
        <h1 className="mt-1 text-2xl font-bold">{p.title}</h1>
        <p className="mt-1 max-w-3xl text-slate-500">{p.subtitle}</p>
      </div>

      <div className="pb-24">
        {p.key === "setup" && <SetupPanel {...props} />}
        {(p.key === "interview1" || p.key === "interview2") && <InterviewPanel {...props} />}
        {p.key === "realjob" && <RealJobPanel {...props} />}
        {p.key === "redesign" && <RedesignPanel {...props} />}
        {p.key === "share" && <SharePanel {...props} />}
        {p.key === "final" && <FinalPanel {...props} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">
            Back
          </button>
          <div className="hidden text-sm text-slate-400 sm:block">
            Preview — click the dots or Next to move through the steps.
          </div>
          {phase < PHASES.length - 1 ? (
            <button onClick={() => go(phase + 1)} className="btn-primary">
              Next step →
            </button>
          ) : (
            <Link href="/" className="btn-primary">
              Finish
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
