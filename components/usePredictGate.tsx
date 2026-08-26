"use client";

import { useState } from "react";
import PredictReveal, { type Prediction } from "@/components/PredictReveal";
import { reportGuide } from "@/lib/reportGuide";

// The predict-then-reveal gate for a report-generating module. Wire it into the
// room's "build"/"reveal" action:
//
//   const gate = usePredictGate({
//     guideKey: "consult",
//     existing: state.prediction,
//     save: (p) => setState({ prediction: p }),
//     run: doBuild,               // the real report-generation call
//     revealLabel: "Reveal it",
//   });
//   // button: onClick={gate.start}
//   // render: {gate.modal}
//   // pass gate.prediction to <ReportReveal>
//
// On the first build (guide present, no prior prediction) it opens the predict
// modal; otherwise it runs the build directly.
export function usePredictGate(opts: {
  guideKey?: string;
  existing?: Prediction | null;
  save: (p: Prediction) => void;
  run: () => void;
  revealLabel?: string;
  // If the guide copy uses a {name} token (e.g. the paired job-redesign, where
  // you predict about your partner), pass the name to fill it in.
  subjectName?: string;
}) {
  const [prediction, setPrediction] = useState<Prediction | null>(opts.existing || null);
  const [predicting, setPredicting] = useState(false);
  const guide = reportGuide(opts.guideKey);
  const fill = (s?: string) => (s ? s.split("{name}").join(opts.subjectName || "your partner") : s);

  function start() {
    if (guide?.predictPrompt && !prediction) { setPredicting(true); return; }
    opts.run();
  }

  function onPredict(p: Prediction) {
    setPrediction(p);
    setPredicting(false);
    opts.save(p);
    opts.run();
  }

  const modal = predicting && guide ? (
    <PredictReveal
      prompt={fill(guide.predictPrompt)!}
      placeholder={fill(guide.predictPlaceholder)}
      ratingLabel={fill(guide.ratingLabel)}
      onSubmit={onPredict}
      revealLabel={(opts.revealLabel || "Reveal it") + " →"}
    />
  ) : null;

  return { prediction, start, modal };
}
