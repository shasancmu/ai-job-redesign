"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function makeCode() {
  // Unambiguous characters only (no O/0/I/1).
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function RoomActions({
  userId,
  initialCohort = "",
}: {
  userId: string;
  displayName: string;
  savedTitle: string;
  savedDescription: string;
  initialCohort?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [joinCode, setJoinCode] = useState("");
  const [cohort, setCohort] = useState(initialCohort);
  const [exercise, setExercise] = useState<"job" | "workflow" | "solo">("job");
  const [busy, setBusy] = useState<"host" | "join" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function openRoom() {
    setErr(null);
    setBusy("host");
    // Retry a few times in case of a code collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeCode();
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          code,
          host_id: userId,
          // solo needs no partner, so it's active immediately
          status: exercise === "solo" ? "active" : "waiting",
          cohort: cohort.trim() || null,
          exercise,
        })
        .select()
        .single();
      if (!error && data) {
        if (exercise === "workflow") {
          await supabase
            .from("workflow_docs")
            .upsert({ session_id: data.id }, { onConflict: "session_id" });
        } else {
          await supabase.from("workspaces").upsert(
            { session_id: data.id, author_id: userId },
            { onConflict: "session_id,author_id" }
          );
        }
        router.push(`/room/${code}`);
        return;
      }
      if (error && !`${error.message}`.toLowerCase().includes("duplicate")) {
        setErr(error.message);
        setBusy(null);
        return;
      }
    }
    setErr("Couldn't create a room. Try again.");
    setBusy(null);
  }

  async function joinRoom(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy("join");
    const code = joinCode.trim().toUpperCase();
    const { data: session, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error || !session) {
      setErr("No room with that code.");
      setBusy(null);
      return;
    }
    if (
      session.guest_id &&
      session.guest_id !== userId &&
      session.host_id !== userId
    ) {
      setErr("That room is already full.");
      setBusy(null);
      return;
    }
    if (session.host_id !== userId && !session.guest_id) {
      const { error: upErr } = await supabase
        .from("sessions")
        .update({ guest_id: userId, status: "active" })
        .eq("id", session.id)
        .is("guest_id", null);
      if (upErr) {
        setErr("Couldn't join. Someone may have just taken the spot.");
        setBusy(null);
        return;
      }
      await supabase.from("workspaces").upsert(
        { session_id: session.id, author_id: userId },
        { onConflict: "session_id,author_id" }
      );
    }
    router.push(`/room/${code}`);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="card flex flex-col p-6">
        <h2 className="text-lg font-semibold">Open a room</h2>
        <p className="mt-1 text-sm text-slate-500">
          Get a code to share with your partner in the breakout room. You&apos;ll
          wait together on the intro screen.
        </p>
        <div className="mt-3">
          <label className="lbl">Exercise</label>
          <div className="space-y-2">
            {[
              { key: "job", title: "Reimagine your job", sub: "~30 min · paired with a partner" },
              { key: "workflow", title: "Reimagine a workflow", sub: "~30 min · shared canvas with a partner" },
              { key: "solo", title: "Solo with an AI partner", sub: "~18 min · no partner needed" },
            ].map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setExercise(o.key as "job" | "workflow" | "solo")}
                className={
                  "flex w-full items-center justify-between rounded-xl border-2 p-3 text-left transition " +
                  (exercise === o.key
                    ? "border-ink bg-slate-50"
                    : "border-slate-200 hover:border-slate-300")
                }
              >
                <div>
                  <div className="text-sm font-semibold">{o.title}</div>
                  <div className="text-xs text-slate-400">{o.sub}</div>
                </div>
                {o.key === "solo" && (
                  <span className="rounded-full bg-ai/10 px-2 py-0.5 text-xs font-medium text-ai">
                    AI
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex-1">
          <label className="lbl">Cohort / event code (optional)</label>
          <input
            className="field font-mono uppercase"
            value={cohort}
            onChange={(e) => setCohort(e.target.value.toUpperCase())}
            placeholder="EXECED-XYZ-DATE"
          />
          <p className="mt-1.5 text-xs text-slate-400">
            Use the code your facilitator gave you, so your responses are grouped
            with your session.
          </p>
        </div>
        <button
          onClick={openRoom}
          disabled={busy !== null}
          className="btn-primary mt-4"
        >
          {busy === "host" ? "Opening…" : "Open a room"}
        </button>
      </div>

      <div className="card flex flex-col p-6">
        <h2 className="text-lg font-semibold">Join a room</h2>
        <form onSubmit={joinRoom} className="mt-1 flex flex-1 flex-col">
          <p className="text-sm text-slate-500">
            Enter the code your partner shares with you.
          </p>
          <input
            className="field mt-3 text-center font-mono text-xl uppercase tracking-[0.4em]"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABCDE"
            maxLength={5}
          />
          <button
            className="btn-ghost mt-4"
            disabled={busy !== null || joinCode.trim().length < 4}
          >
            {busy === "join" ? "Joining…" : "Join room"}
          </button>
        </form>
      </div>

      {err && (
        <div className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}
    </div>
  );
}
