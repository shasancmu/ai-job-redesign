"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MYOPIA_DOMAINS, type MyopiaDomain } from "@/lib/myopia";
import MyopiaReport from "@/components/MyopiaReport";
import ChatInterview from "@/components/ChatInterview";
import { useT } from "@/components/I18nProvider";

export default function MyopiaRoom({ session, initialWorkspace, domain }: { session: any; initialWorkspace: any; domain: MyopiaDomain }) {
  const t = useT();
  const supabase = createClient();
  const d = MYOPIA_DOMAINS[domain];
  const [ws] = useState<any>({ canvas: {}, ...initialWorkspace });
  const [subject, setSubject] = useState<string>(ws.canvas?.subject || "");
  const [started, setStarted] = useState<boolean>(!!ws.canvas?.subject);
  const label = domain === "career" ? "Career" : "Business";

  async function begin() {
    if (subject.trim().length < 3) return;
    const canvas = { ...(ws.canvas || {}), subject: subject.trim() };
    ws.canvas = canvas;
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
    setStarted(true);
  }

  if (!started) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{domain === "career" ? "Your Career's Blind Spots" : "Your Business's Blind Spots"}</span>
        </div>
        <h1 className="text-2xl font-bold text-ink">What got you here won&apos;t always keep you here</h1>
        <p className="mt-2 text-slate2">
          Success quietly narrows what you pay attention to. An AI advisor interviews you about {d.subject}, then names the blind spots you can&apos;t see, distant places, distant times, and the bets you&apos;re not taking, and a plan to explore before you have to.
        </p>
        <label className="lbl mt-6 block">{d.intakeLabel}</label>
        <input className="field mt-1" placeholder={d.intakePlaceholder} value={subject} onChange={(e) => setSubject(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") begin(); }} />
        <button onClick={begin} disabled={subject.trim().length < 3} className="btn-primary mt-4 px-6 py-2.5 disabled:opacity-40">Start the interview →</button>
      </main>
    );
  }

  return (
    <ChatInterview
      session={session}
      ws={ws}
      apiPath="/api/myopia"
      extraBody={{ domain, subject }}
      helpKey={domain === "career" ? "myopia-career" : "myopia-business"}
      guideKey="myopia"
      renderReport={(r) => <MyopiaReport report={r} subjectWord={domain} />}
      reportHref={(c) => `/myopia/${c}`}
      share={{ title: `${label} blind spots`, text: `Here are the blind spots in ${d.subject}, from Superadditive:` }}
      reportPill="Your blind spots"
      chatTitle={`${label} blind spots`}
      buildLabel="See my blind spots →"
      buildingLabel="Diagnosing…"
      bottomHint="Covered the main areas? Tap “See my blind spots” up top."
    />
  );
}
