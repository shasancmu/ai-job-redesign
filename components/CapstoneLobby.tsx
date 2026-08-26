"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { makePhotoCode } from "@/lib/photo";

export default function CapstoneLobby({ userId, myName, cohort, orgName }: { userId: string; myName: string; cohort: string; orgName: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [err, setErr] = useState("");

  async function createTeam() {
    setBusy(true); setErr("");
    let code = "";
    for (let i = 0; i < 5; i++) {
      code = makePhotoCode();
      const { error } = await supabase.from("capstone_sessions").insert({ code, host_id: userId, cohort: cohort || null });
      if (!error) break;
      code = "";
    }
    if (!code) { setErr("Could not start a team. Try again."); setBusy(false); return; }
    router.push(`/capstone/${code}`);
  }

  function join() {
    const c = joinCode.trim().toUpperCase();
    if (!c) return;
    router.push(`/capstone/${c}`);
  }

  return (
    <div className="mt-6 space-y-4">
      {cohort ? (
        <div className="rounded-xl bg-mist px-4 py-3 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your cohort{orgName ? ` · ${orgName}` : ""}</div>
          <div className="mt-0.5 font-mono font-bold tracking-widest text-ink">{cohort}</div>
          <div className="mt-1 text-xs text-slate-500">Assigned from your sign-in. Your team's run is recorded here.</div>
        </div>
      ) : (
        <div className="rounded-xl bg-mist px-4 py-3 text-xs text-slate-500">You are not in an organization, so this run will not roll up to a cohort. That is fine for a practice run.</div>
      )}

      <div className="card p-5">
        <div className="text-sm font-semibold text-ink">Start a new team</div>
        <p className="mt-1 text-xs text-slate-500">You become the captain and drive the phases. Share the team code that appears with your three teammates.</p>
        <button onClick={createTeam} disabled={busy} className="btn-primary mt-3 w-full">{busy ? "Starting..." : "Start a team"}</button>
      </div>

      <div className="card p-5">
        <div className="text-sm font-semibold text-ink">Join a teammate's team</div>
        <p className="mt-1 text-xs text-slate-500">Enter the team code your captain shared.</p>
        <form onSubmit={(e) => { e.preventDefault(); join(); }} className="mt-3 flex items-center gap-2">
          <input className="field font-mono uppercase tracking-widest" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="TEAM CODE" maxLength={8} />
          <button className="btn-ghost" disabled={!joinCode.trim()}>Join</button>
        </form>
      </div>

      {err && <p className="text-sm text-red-700">{err}</p>}
      <p className="text-center text-xs text-slate-400">Signed in as {myName || "you"}</p>
    </div>
  );
}
