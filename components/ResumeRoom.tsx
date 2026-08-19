"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ResumeSource } from "@/lib/resume";
import ResumeIntake from "@/components/ResumeIntake";
import ResumeReport from "@/components/ResumeReport";
import ChatInterview from "@/components/ChatInterview";

export default function ResumeRoom({
  session,
  initialWorkspace,
  prefill,
  prefillFrom,
}: {
  session: any;
  initialWorkspace: any;
  prefill?: string;
  prefillFrom?: string;
}) {
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
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Refresh Your Résumé</span>
        </div>
        <ResumeIntake prefill={prefill} prefillFrom={prefillFrom} onStart={startInterview} />
      </main>
    );
  }

  return (
    <ChatInterview
      session={session}
      ws={ws}
      apiPath="/api/resume"
      extraBody={{ source }}
      renderReport={(r) => <ResumeReport report={r} />}
      reportHref={(c) => `/resume/${c}`}
      share={{ title: "Résumé changes", text: "Here are the changes to make to my résumé, from Superadditive:" }}
      reportPill="Your résumé changes"
      chatTitle="Résumé interview"
      buildLabel="Build my changes →"
      buildingLabel="Building…"
      bottomHint="Covered your main wins? Tap “Build my changes” up top."
    />
  );
}
