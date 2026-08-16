"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MODULES, formatPrice } from "@/lib/modules";
import ModuleIcon from "@/components/ModuleIcon";

const ACCENT: Record<string, string> = {
  "reimagine-job": "bg-sage-soft text-sage",
  "reimagine-workflow": "bg-sky-soft text-sky",
  "solo-ai": "bg-amber-soft text-amber",
};

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function Catalog({
  userId,
  unlocked,
  initialCohort = "",
}: {
  userId: string;
  unlocked: Record<string, boolean>;
  initialCohort?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [cohort, setCohort] = useState(initialCohort);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function openModule(slug: string, exercise: string) {
    setErr(null);
    setBusy(slug);
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeCode();
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          code,
          host_id: userId,
          status: exercise === "solo" ? "active" : "waiting",
          cohort: cohort.trim() || null,
          exercise,
        })
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
        setBusy(null);
        return;
      }
    }
    setErr("Couldn't create a room — try again.");
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
    if (session.guest_id && session.guest_id !== userId && session.host_id !== userId) {
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
        setErr("Couldn't join — someone may have just taken the spot.");
        setBusy(null);
        return;
      }
      await supabase
        .from("workspaces")
        .upsert({ session_id: session.id, author_id: userId }, { onConflict: "session_id,author_id" });
    }
    router.push(`/room/${code}`);
  }

  return (
    <div>
      {/* Cohort tag (optional) */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="lbl">Cohort / event code (optional)</label>
          <input
            className="field font-mono uppercase"
            value={cohort}
            onChange={(e) => setCohort(e.target.value.toUpperCase())}
            placeholder="EXECED-XYZ-DATE"
          />
        </div>
        <form onSubmit={joinRoom} className="flex items-end gap-2">
          <div>
            <label className="lbl">Join a partner&apos;s room</label>
            <input
              className="field w-40 text-center font-mono uppercase tracking-[0.3em]"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABCDE"
              maxLength={5}
            />
          </div>
          <button className="btn-ghost" disabled={busy !== null || joinCode.trim().length < 4}>
            {busy === "join" ? "Joining…" : "Join"}
          </button>
        </form>
      </div>

      {err && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
      )}

      {/* Module cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => {
          const open = !!unlocked[m.slug];
          const chip = ACCENT[m.slug] || "bg-sage-soft text-sage";
          return (
            <div key={m.slug} className="card flex flex-col p-6 transition hover:shadow-lift">
              <div className={"flex h-11 w-11 items-center justify-center rounded-xl " + chip}>
                <ModuleIcon slug={m.slug} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-ink">{m.name}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate2">{m.tagline}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-ink/45">
                <span className="rounded-full border border-line px-2 py-0.5 text-ink/60">{m.mode}</span>
                <span>{m.minutes} min</span>
                {m.ai && <span className="rounded-full bg-amber-soft px-2 py-0.5 font-medium text-amber">AI</span>}
              </div>
              {open ? (
                <button
                  onClick={() => openModule(m.slug, m.exercise)}
                  disabled={busy !== null}
                  className="btn-primary mt-5"
                >
                  {busy === m.slug ? "Opening…" : m.exercise === "solo" ? "Start" : "Open a room"}
                </button>
              ) : (
                <Link href={`/paywall?module=${m.slug}`} className="btn-dark mt-5">
                  Unlock — {formatPrice(m.priceCents)}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
