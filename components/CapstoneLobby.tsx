"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { makePhotoCode } from "@/lib/photo";

async function api(path: string, body: any) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

export default function CapstoneLobby({ userId, myName, cohort, orgName }: { userId: string; myName: string; cohort: string; orgName: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState<null | "create" | "join">(null);
  const [err, setErr] = useState("");

  // Start-a-team: class run code with live validation.
  const [runCode, setRunCode] = useState("");
  const [runStatus, setRunStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [runLabel, setRunLabel] = useState("");
  const checkSeq = useRef(0);

  useEffect(() => {
    const c = runCode.trim().toUpperCase();
    if (!c) { setRunStatus("idle"); setRunLabel(""); return; }
    setRunStatus("checking");
    const seq = ++checkSeq.current;
    const id = setTimeout(async () => {
      const { data } = await api("/api/capstone/run/check", { code: c });
      if (seq !== checkSeq.current) return; // superseded
      if (data.exists) { setRunStatus("valid"); setRunLabel(data.label || ""); }
      else { setRunStatus("invalid"); setRunLabel(""); }
    }, 400);
    return () => clearTimeout(id);
  }, [runCode]);

  async function createTeam() {
    if (runStatus === "invalid" || runStatus === "checking") return;
    setBusy("create"); setErr("");
    const run = runCode.trim().toUpperCase() || null;
    let code = "";
    for (let i = 0; i < 5; i++) {
      code = makePhotoCode();
      const { error } = await supabase.from("capstone_sessions").insert({ code, host_id: userId, cohort: cohort || null, run_code: run });
      if (!error) break;
      code = "";
    }
    if (!code) { setErr("Could not start a team. Try again."); setBusy(null); return; }
    router.push(`/capstone/${code}`);
  }

  // Join: validate the team code before navigating.
  const [joinCode, setJoinCode] = useState("");
  async function join() {
    const c = joinCode.trim().toUpperCase();
    if (!c) return;
    setBusy("join"); setErr("");
    const { ok, data } = await api("/api/capstone/state", { code: c });
    if (!ok) { setErr(data.error === "Code not found." ? "That team code doesn't exist. Check it and try again." : (data.error || "Could not find that team.")); setBusy(null); return; }
    router.push(`/capstone/${c}`);
  }

  const startDisabled = busy !== null || runStatus === "invalid" || runStatus === "checking";

  return (
    <div className="mt-6 space-y-4">
      {cohort ? (
        <div className="rounded-xl bg-mist px-4 py-3 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your cohort{orgName ? ` · ${orgName}` : ""}</div>
          <div className="mt-0.5 font-mono font-bold tracking-widest text-ink">{cohort}</div>
          <div className="mt-1 text-xs text-slate-500">Assigned from your sign-in.</div>
        </div>
      ) : (
        <div className="rounded-xl bg-mist px-4 py-3 text-xs text-slate-500">You are not in an organization, so this is a practice run and will not roll up to a cohort.</div>
      )}

      <div className="card p-5">
        <div className="text-sm font-semibold text-ink">Start a new team</div>
        <p className="mt-1 text-xs text-slate-500">You become the captain and drive the phases. You will get a team code to share with your three teammates.</p>

        <label className="lbl mt-3">Class run code</label>
        <input
          className={"field font-mono uppercase tracking-widest " + (runStatus === "invalid" ? "border-clay" : runStatus === "valid" ? "border-sage" : "")}
          value={runCode}
          onChange={(e) => setRunCode(e.target.value)}
          placeholder="FROM YOUR INSTRUCTOR'S SCREEN"
          maxLength={8}
          autoCapitalize="characters"
        />
        <div className="mt-1 min-h-[16px] text-[11px]">
          {runStatus === "checking" && <span className="text-slate-400">Checking...</span>}
          {runStatus === "valid" && <span className="text-sage">✓ Run found{runLabel ? `: ${runLabel}` : ""}. Your team will show on the instructor's board.</span>}
          {runStatus === "invalid" && <span className="text-clay">That run code isn't recognized. Retype it exactly as shown on the screen.</span>}
          {runStatus === "idle" && <span className="text-slate-400">No code? This becomes a practice run that won't appear on an instructor's board.</span>}
        </div>

        <button onClick={createTeam} disabled={startDisabled} className="btn-primary mt-3 w-full disabled:opacity-50">{busy === "create" ? "Starting..." : "Start a team"}</button>
      </div>

      <div className="card p-5">
        <div className="text-sm font-semibold text-ink">Join a teammate's team</div>
        <p className="mt-1 text-xs text-slate-500">Enter the team code your captain shared (not the class run code).</p>
        <form onSubmit={(e) => { e.preventDefault(); join(); }} className="mt-3 flex items-center gap-2">
          <input className="field font-mono uppercase tracking-widest" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="TEAM CODE" maxLength={8} autoCapitalize="characters" />
          <button className="btn-ghost shrink-0" disabled={busy !== null || !joinCode.trim()}>{busy === "join" ? "..." : "Join"}</button>
        </form>
      </div>

      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      <p className="text-center text-xs text-slate-400">Signed in as {myName || "you"}</p>
    </div>
  );
}
