"use client";

import { useState } from "react";
import ConsultReport from "@/components/ConsultReport";
import VoiceInterview from "@/components/VoiceInterview";

// Talk Through Your Business: the 30-Minute Consult as a hands-free voice
// interview. Thin wrapper over the shared VoiceInterview engine.
export default function VoiceConsultRoom({ session, initialWorkspace }: { me?: string; session: any; initialWorkspace: any }) {
  const [ws] = useState<any>({ canvas: {}, ...initialWorkspace });
  return (
    <VoiceInterview
      session={session}
      ws={ws}
      apiPath="/api/consult"
      chatExtra={{ ctx: {} }}
      reportExtra={{ intake: {}, wms: { answers: {} }, eighty: {}, photos: [] }}
      renderReport={(r, extra) => <ConsultReport report={r} wms={extra} />}
      reportHref={(c) => `/consult/${c}`}
      reportLinkLabel="View the full write-up →"
      reportPill="Your consult"
      buildSteps={[
        "Reading everything you told me…",
        "Working out where your margin really lives…",
        "Finding your 80/20 in products and customers…",
        "Reading your management practices…",
        "Writing your prioritized plan…",
        "Putting your consult together…",
      ]}
      buildTitle="Building your consult"
      buildNoun="consult"
      speaker="advisor"
      headerPill="Talk through your business"
      introTitle="A spoken interview about your business"
      introBody="An advisor talks with you out loud, like a real conversation. Just answer naturally and pause when you're done, it moves on by itself. No tapping needed. Find a quiet spot; works best in Chrome, or on Android and desktop."
      typedLabel="Do the typed consult"
      typedHref="/start/business-consult"
      buildButtonLabel="End & build my consult →"
    />
  );
}
