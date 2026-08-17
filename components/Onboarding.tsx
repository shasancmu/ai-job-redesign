"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  SEGMENTS,
  GOALS,
  TEAM_SIZES,
  FOUNDER_STAGES,
  type SegmentKey,
  type FollowupKind,
} from "@/lib/segments";
import Logo from "@/components/Logo";

export default function Onboarding({ me, firstName }: { me: string; firstName?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [segment, setSegment] = useState<SegmentKey | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [teamSize, setTeamSize] = useState("");
  const [founderStage, setFounderStage] = useState("");
  const [studyField, setStudyField] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [saving, setSaving] = useState(false);

  const followup: FollowupKind = segment ? SEGMENTS.find((s) => s.key === segment)!.followup : null;
  const totalSteps = followup ? 3 : 2;

  async function finish() {
    setSaving(true);
    const patch: Record<string, any> = { onboarded_at: new Date().toISOString() };
    if (segment) patch.segment = segment;
    if (goal) patch.goal = goal;
    if (teamSize) patch.team_size = teamSize;
    if (founderStage) patch.founder_stage = founderStage;
    if (studyField) patch.study_field = studyField;
    if (gradYear) patch.grad_year = gradYear;
    await supabase.from("profiles").update(patch).eq("id", me);
    router.push("/dashboard");
    router.refresh();
  }

  function pickSegment(k: SegmentKey) {
    setSegment(k);
    setStep(1);
  }
  function pickGoal(k: string) {
    setGoal(k);
    const fu = SEGMENTS.find((s) => s.key === segment)!.followup;
    if (fu) setStep(2);
    else void finish();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <button onClick={finish} disabled={saving} className="text-sm text-slate-400 hover:text-slate-700">
          Skip
        </button>
      </div>

      {/* progress */}
      <div className="mb-6 flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={"h-1.5 flex-1 rounded-full " + (i <= step ? "bg-ink" : "bg-slate-200")}
          />
        ))}
      </div>

      {step === 0 && (
        <div>
          <h1 className="text-2xl font-bold">
            {firstName ? `Welcome, ${firstName}.` : "Welcome."} Which best describes you?
          </h1>
          <p className="mt-1 text-slate-500">This tailors what we put in front of you. One tap.</p>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {SEGMENTS.map((s) => (
              <button
                key={s.key}
                onClick={() => pickSegment(s.key)}
                className="flex items-center gap-3 rounded-xl border-2 border-slate-200 p-3.5 text-left transition hover:border-ink hover:bg-slate-50"
              >
                <span className="text-xl" aria-hidden>{s.emoji}</span>
                <span className="text-sm font-medium leading-snug">{s.label.replace(/^I'm |^I /, "")}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <button onClick={() => setStep(0)} className="mb-3 text-sm text-slate-400 hover:text-slate-700">← Back</button>
          <h1 className="text-2xl font-bold">What do you most want to get out of this?</h1>
          <p className="mt-1 text-slate-500">We'll recommend the modules that fit.</p>
          <div className="mt-6 space-y-2.5">
            {GOALS.map((g) => (
              <button
                key={g.key}
                onClick={() => pickGoal(g.key)}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-slate-200 p-3.5 text-left transition hover:border-ink hover:bg-slate-50"
              >
                <span className="text-xl" aria-hidden>{g.emoji}</span>
                <span className="text-sm font-medium">{g.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && followup && (
        <div>
          <button onClick={() => setStep(1)} className="mb-3 text-sm text-slate-400 hover:text-slate-700">← Back</button>
          {followup === "teamSize" && (
            <>
              <h1 className="text-2xl font-bold">How many people?</h1>
              <p className="mt-1 text-slate-500">Roughly the size of the team you lead or run.</p>
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                {TEAM_SIZES.map((v) => (
                  <button
                    key={v}
                    onClick={() => setTeamSize(v)}
                    className={"rounded-xl border-2 p-3.5 text-sm font-medium transition " + (teamSize === v ? "border-ink bg-slate-50" : "border-slate-200 hover:border-slate-300")}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </>
          )}
          {followup === "founderStage" && (
            <>
              <h1 className="text-2xl font-bold">What stage is it at?</h1>
              <p className="mt-1 text-slate-500">So we can meet you where you are.</p>
              <div className="mt-6 space-y-2.5">
                {FOUNDER_STAGES.map((v) => (
                  <button
                    key={v}
                    onClick={() => setFounderStage(v)}
                    className={"block w-full rounded-xl border-2 p-3.5 text-left text-sm font-medium transition " + (founderStage === v ? "border-ink bg-slate-50" : "border-slate-200 hover:border-slate-300")}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </>
          )}
          {followup === "study" && (
            <>
              <h1 className="text-2xl font-bold">What are you studying?</h1>
              <p className="mt-1 text-slate-500">Optional — helps us tune examples.</p>
              <div className="mt-6 space-y-3">
                <div>
                  <label className="lbl">Field of study</label>
                  <input className="field" value={studyField} onChange={(e) => setStudyField(e.target.value)} placeholder="e.g. Computer Science, Economics" />
                </div>
                <div>
                  <label className="lbl">Graduating (year)</label>
                  <input className="field" value={gradYear} onChange={(e) => setGradYear(e.target.value)} placeholder="e.g. 2027" />
                </div>
              </div>
            </>
          )}
          <button onClick={finish} disabled={saving} className="btn-primary mt-6 w-full">
            {saving ? "Setting up…" : "Done — show my modules"}
          </button>
        </div>
      )}
    </main>
  );
}
