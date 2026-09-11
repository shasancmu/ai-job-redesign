"use client";

import { useState } from "react";
import VoiceInterview from "@/components/VoiceInterview";
import ProblemHuntReport from "@/components/ProblemHuntReport";
import { HUNT, type HuntMode } from "@/lib/problemhunt";

// The Problem Hunt, spoken: a thin wrapper over the shared VoiceInterview engine.
// The report build gathers web evidence server-side (the /api/problem route),
// so there is no separate evidence step here.
export default function VoiceProblemHuntRoom({ session, initialWorkspace }: { me?: string; session: any; initialWorkspace: any }) {
  const mode: HuntMode = session?.exercise === "problem-leader-voice" ? "leader" : "seller";
  const cfg = HUNT[mode];
  const [ws] = useState<any>({ canvas: {}, ...initialWorkspace });
  const typedSlug = mode === "leader" ? "find-org-problems" : "find-problem";

  return (
    <VoiceInterview
      session={session}
      ws={ws}
      apiPath="/api/problem"
      chatExtra={{ hunt: mode }}
      reportExtra={{ hunt: mode }}
      renderReport={(r) => <ProblemHuntReport mode={mode} report={r} />}
      reportHref={() => "/dashboard"}
      reportLinkLabel="Back to dashboard →"
      reportPill={mode === "leader" ? "Your opportunity map" : "Your problem thesis"}
      buildSteps={mode === "leader" ? [
        "Listening back to everything you said…",
        "Naming where value is leaking…",
        "Sizing each opportunity…",
        "Checking the pattern against real evidence…",
        "Ranking them and finding the blind spots…",
        "Building your opportunity map…",
      ] : [
        "Listening back to everything you said…",
        "Naming the problem you're really circling…",
        "Checking it against the real world…",
        "Sizing the value at stake…",
        "Testing whether a buyer would pay…",
        "Grading your problem thesis…",
      ]}
      buildTitle={mode === "leader" ? "Building your opportunity map" : "Building your problem thesis"}
      buildNoun={mode === "leader" ? "map" : "thesis"}
      speaker="coach"
      headerPill={cfg.label}
      introTitle={mode === "leader" ? "Talk through where your organization is leaving value on the table" : "Talk through the problem you should solve"}
      introBody="A strategy coach talks with you out loud, like a real conversation. Just answer naturally and pause when you're done — it moves on by itself. Then it checks the problem against real evidence and grades it. Find a quiet spot; works best in Chrome, or on Android and desktop."
      typedLabel="Do the typed version"
      typedHref={`/start/${typedSlug}`}
      buildButtonLabel={mode === "leader" ? "End & build my map →" : "End & build my thesis →"}
    />
  );
}
