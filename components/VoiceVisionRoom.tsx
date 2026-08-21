"use client";

import { useState } from "react";
import VisionReport from "@/components/VisionReport";
import VoiceInterview from "@/components/VoiceInterview";

// Shape Your Vision, spoken: the vision conversation as a hands-free voice
// interview. Thin wrapper over the shared VoiceInterview engine.
export default function VoiceVisionRoom({ session, initialWorkspace }: { me?: string; session: any; initialWorkspace: any }) {
  const [ws] = useState<any>({ canvas: {}, ...initialWorkspace });
  const ctx = { name: (ws.canvas?.intake?.name) || "", does: (ws.canvas?.intake?.does) || "" };
  return (
    <VoiceInterview
      session={session}
      ws={ws}
      apiPath="/api/vision"
      chatExtra={{ ctx }}
      reportExtra={{ ctx }}
      renderReport={(r) => <VisionReport report={r} org={ctx.name} />}
      reportHref={(c) => `/vision/${c}`}
      reportLinkLabel="View the full vision →"
      reportPill="Your vision"
      buildSteps={[
        "Listening back to everything you said…",
        "Naming the values you'd hold even if it cost you…",
        "Finding the deeper reason you exist…",
        "Shaping the bold, long-term goal…",
        "Painting the picture of that future…",
        "Putting your vision together…",
      ]}
      buildTitle="Shaping your vision"
      buildNoun="vision"
      speaker="facilitator"
      headerPill="Shape your vision"
      introTitle="A spoken conversation to shape your vision"
      introBody="A facilitator talks with you out loud, like a real conversation. Just answer naturally and pause when you're done — it moves on by itself. No tapping needed. Find a quiet spot; works best in Chrome, or on Android and desktop."
      typedLabel="Do the typed version"
      typedHref="/start/define-vision"
      buildButtonLabel="End & build my vision →"
    />
  );
}
