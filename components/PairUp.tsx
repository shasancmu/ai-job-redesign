"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function PairUp({
  userId,
  moduleName,
  exercise,
  cohort,
}: {
  userId: string;
  moduleName: string;
  exercise: string;
  cohort: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"choose" | "join">("choose");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setErr(null);
    setBusy(true);
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeCode();
      const { data, error } = await supabase
        .from("sessions")
        .insert({ code, host_id: userId, status: "waiting", cohort: cohort || null, exercise })
        .select()
        .single();
      if (!error && data) {
        if (exercise === "workflow") {
          await supabase.from("workflow_docs").upsert({ session_id: data.id }, { onConflict: "session_id" });
        } else {
          await supabase
            .from("workspaces")
            .upsert({ session_id: data.id, author_id: userId }, { onConflict: "session_id,author_id" });
        }
        router.push(`/room/${code}`);
        return;
      }
      if (error && !`${error.message}`.toLowerCase().includes("duplicate")) {
        setErr(error.message);
        setBusy(false);
        return;
      }
    }
    setErr("Couldn't create a team. Try again.");
    setBusy(false);
  }

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const code = joinCode.trim().toUpperCase();
    const { data: session } = await supabase
      .from("sessions")
      .select("id, host_id, guest_id")
      .eq("code", code)
      .maybeSingle();
    if (!session) {
      setErr("No team with that code.");
      setBusy(false);
      return;
    }
    // Let the room page handle the actual join (it adds you as guest).
    router.push(`/room/${code}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/dashboard" className="mb-6 text-sm text-slate2 hover:text-ink">
        ← Back
      </Link>
      <div className="eyebrow">Pair up</div>
      <h1 className="mt-2 text-2xl font-bold text-ink">{moduleName}</h1>
      <p className="mt-2 text-slate2">
        You&apos;ll do this with your breakout partner. <b className="text-ink">Only one of you</b>{" "}
        creates the team. The other joins.
      </p>

      {mode === "choose" ? (
        <div className="mt-6 space-y-3">
          <button onClick={create} disabled={busy} className="btn-primary w-full py-3">
            {busy ? "Creating…" : "Create the team"}
          </button>
          <button onClick={() => setMode("join")} className="btn-ghost w-full py-3">
            Join my partner&apos;s team
          </button>
        </div>
      ) : (
        <form onSubmit={join} className="mt-6 space-y-3">
          <label className="lbl">Enter your partner&apos;s code</label>
          <input
            className="field text-center font-mono text-2xl uppercase tracking-[0.4em]"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABCDE"
            maxLength={5}
            autoFocus
          />
          <button className="btn-primary w-full py-3" disabled={busy || joinCode.trim().length < 4}>
            {busy ? "Joining…" : "Join team"}
          </button>
          <button type="button" onClick={() => setMode("choose")} className="w-full text-sm text-slate2 hover:text-ink">
            ← Back
          </button>
        </form>
      )}

      {err && <p className="mt-4 text-sm text-clay">{err}</p>}
    </main>
  );
}
