"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ResumeSource } from "@/lib/resume";
import ResumeIntake from "@/components/ResumeIntake";
import ResumeReport from "@/components/ResumeReport";
import VoiceInterview from "@/components/VoiceInterview";

// Talk Through Your Résumé: the résumé refresh as a hands-free voice interview.
// Intake first (paste the résumé), then the shared VoiceInterview engine.
export default function VoiceResumeRoom({ session, initialWorkspace, prefill, prefillFrom }: { session: any; initialWorkspace: any; prefill?: string; prefillFrom?: string }) {
  const supabase = createClient();
  const [ws] = useState<any>({ canvas: {}, ...initialWorkspace });
  const [source, setSource] = useState<ResumeSource | null>(ws.canvas?.source || null);

  async function startInterview(s: ResumeSource) {
    const canvas = { ...(ws.canvas || {}), source: s };
    ws.canvas = canvas;
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
    setSource(s);
  }

  if (!source) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Talk Through Your Résumé</span>
        </div>
        <ResumeIntake prefill={prefill} prefillFrom={prefillFrom} onStart={startInterview} cta="Start the spoken interview" />
      </main>
    );
  }

  return (
    <VoiceInterview
      session={session}
      ws={ws}
      apiPath="/api/resume"
      guideKey="resume"
      chatExtra={{ source }}
      reportExtra={{ source }}
      renderReport={(r) => <ResumeReport report={r} />}
      reportHref={(c) => `/resume/${c}`}
      reportLinkLabel="Open the full write-up →"
      reportPill="Your résumé changes"
      buildSteps={[
        "Reading your résumé and everything you told me…",
        "Finding the wins that are under-sold…",
        "Turning duties into measurable accomplishments…",
        "Drafting stronger bullets and a new summary…",
        "Putting your changes together…",
      ]}
      buildTitle="Building your changes"
      buildNoun="changes"
      speaker="coach"
      headerPill="Talk Through Your Résumé"
      introTitle="A spoken interview about your year"
      introBody="A career coach talks with you out loud about what you've accomplished. Just answer naturally and pause when you're done, it moves on by itself. No tapping needed. Works best in Chrome, or on desktop."
      typedLabel="Do the typed version"
      typedHref="/start/refresh-resume"
      buildButtonLabel="End & build my changes →"
    />
  );
}
