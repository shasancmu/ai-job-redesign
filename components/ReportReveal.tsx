"use client";

import Tour, { TourButton } from "@/components/Tour";
import CredentialMoment from "@/components/CredentialMoment";
import ResearchBehind from "@/components/ResearchBehind";
import ReflectCommit from "@/components/ReflectCommit";
import { reportGuide, walkthroughSteps } from "@/lib/reportGuide";
import type { Prediction } from "@/components/PredictReveal";

// Wraps a rendered report with the predict-delta callout and a "walk me through"
// tour. Drop it around any report body (whose sections carry data-guide anchors):
//   <ReportReveal guideKey="consult" prediction={state.prediction} code={code}>
//     <ConsultReport ... />
//   </ReportReveal>
// If the module has no guide, it renders the children unchanged.
export default function ReportReveal({
  guideKey,
  prediction,
  code,
  children,
}: {
  guideKey?: string;
  prediction?: Prediction | null;
  code: string;
  children: React.ReactNode;
}) {
  const guide = reportGuide(guideKey);
  const steps = guide ? walkthroughSteps(guide) : [];

  return (
    <>
      <CredentialMoment code={code} />

      {prediction?.text && (
        <div data-guide="delta" className="mb-5 rounded-2xl border border-line bg-mist/60 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">You predicted</div>
          <p className="mt-1 text-[15px] italic leading-relaxed text-slate-700">&ldquo;{prediction.text}&rdquo;</p>
          {prediction.why && <p className="mt-1.5 text-sm text-slate-500">Your reasoning: {prediction.why}</p>}
          <p className="mt-2 text-xs text-slate-400">Hold that next to what emerged below. The gap is the lesson.</p>
        </div>
      )}

      {steps.length > 0 && (
        <div className="mb-6 no-print">
          <TourButton label="Walk me through this →" className="btn-primary text-sm" />
        </div>
      )}

      {children}

      <ReflectCommit code={code} hasPrediction={!!prediction?.text} />
      <ResearchBehind guideKey={guideKey} />

      {steps.length > 0 && (
        <Tour
          steps={steps}
          storageKey={`walk-${guideKey}-${code}`}
          auto={false}
          welcomeTitle="A quick walkthrough"
          welcomeBody="I'll point out what each part tells you, and how it was built from your own answers."
        />
      )}
    </>
  );
}
