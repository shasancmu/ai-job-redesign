"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useCohortPing } from "@/components/useCohortLive";
import { PHASES } from "@/lib/exercise";
import SetupPanel from "@/components/phases/SetupPanel";
import InterviewPanel from "@/components/phases/InterviewPanel";
import RealJobPanel from "@/components/phases/RealJobPanel";
import BreakPanel from "@/components/phases/BreakPanel";
import RedesignPanel from "@/components/phases/RedesignPanel";
import SharePanel from "@/components/phases/SharePanel";
import FinalPanel from "@/components/phases/FinalPanel";
import Timer from "@/components/Timer";
import PairWaiting from "@/components/PairWaiting";
import { useT } from "@/components/I18nProvider";

export type Session = any;
export type Workspace = any;
export type Profile = any;

export default function Room({
  me,
  initialSession,
  initialWorkspaces,
  initialProfiles,
}: {
  me: string;
  initialSession: Session;
  initialWorkspaces: Workspace[];
  initialProfiles: Profile[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const pingCohort = useCohortPing(initialSession.cohort);
  const t = useT();
  const [session, setSession] = useState<Session>(initialSession);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);

  const partnerId =
    session.host_id === me ? session.guest_id : session.host_id;

  const myWorkspace = useMemo(
    () => workspaces.find((w) => w.author_id === me),
    [workspaces, me]
  );
  // The design my partner is making of MY job (author = partner).
  const partnerWorkspace = useMemo(
    () => workspaces.find((w) => w.author_id === partnerId),
    [workspaces, partnerId]
  );
  const myProfile = useMemo(
    () => profiles.find((p) => p.id === me),
    [profiles, me]
  );
  const partnerProfile = useMemo(
    () => profiles.find((p) => p.id === partnerId),
    [profiles, partnerId]
  );

  const phase = PHASES[session.phase] ?? PHASES[0];

  // ---- Facilitator broadcast nudge -> toast --------------------------------
  const [nudge, setNudge] = useState<string | null>(null);
  const lastBroadcast = useRef<string | null>(initialSession.broadcast_at || null);
  const nudgeTimer = useRef<any>(null);
  useEffect(() => {
    if (session.broadcast_at && session.broadcast_at !== lastBroadcast.current) {
      lastBroadcast.current = session.broadcast_at;
      if (session.broadcast_msg) {
        setNudge(session.broadcast_msg);
        if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
        nudgeTimer.current = setTimeout(() => setNudge(null), 8000);
      }
    }
  }, [session.broadcast_at, session.broadcast_msg]);

  // ---- Realtime: keep session + workspaces in sync across both partners ----
  useEffect(() => {
    const channel = supabase
      .channel(`room-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          if (payload.new) setSession((s: Session) => ({ ...s, ...payload.new }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspaces",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const row = payload.new as Workspace;
          if (!row) return;
          setWorkspaces((ws) => {
            const idx = ws.findIndex((w) => w.id === row.id);
            if (idx === -1) return [...ws, row];
            // Don't clobber my own in-flight edits with an echo.
            if (row.author_id === me) return ws;
            const copy = [...ws];
            copy[idx] = { ...copy[idx], ...row };
            return copy;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, session.id, me]);

  // Refetch profiles when the partner appears (they joined after we loaded).
  useEffect(() => {
    if (partnerId && !partnerProfile) {
      supabase
        .from("profiles")
        .select("id, display_name, job_title, job_description")
        .eq("id", partnerId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setProfiles((p) => [...p.filter((x) => x.id !== data.id), data]);
        });
    }
  }, [partnerId, partnerProfile, supabase]);

  // Ensure a workspace exists for partner in local state once they join, so
  // the reveal has something to read even before they type.
  useEffect(() => {
    if (partnerId && !partnerWorkspace) {
      supabase
        .from("workspaces")
        .select("*")
        .eq("session_id", session.id)
        .then(({ data }) => {
          if (data) setWorkspaces(data);
        });
    }
  }, [partnerId, partnerWorkspace, supabase, session.id]);

  // ---- Autosave for MY workspace (debounced, merges patches) ---------------
  const pending = useRef<Record<string, any>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0 || !myWorkspace) return;
    await supabase
      .from("workspaces")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", myWorkspace.id);
  }, [supabase, myWorkspace]);

  const updateMine = useCallback(
    (patch: Record<string, any>) => {
      setWorkspaces((ws) =>
        ws.map((w) => (w.author_id === me ? { ...w, ...patch } : w))
      );
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 600);
    },
    [flush, me]
  );

  // Write feedback onto my PARTNER's design (the reveal I'm reacting to).
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackPending = useRef<Record<string, any>>({});
  const updatePartnerFeedback = useCallback(
    (fb: Record<string, any>) => {
      if (!partnerWorkspace) return;
      setWorkspaces((ws) =>
        ws.map((w) =>
          w.id === partnerWorkspace.id
            ? { ...w, feedback: { ...w.feedback, ...fb } }
            : w
        )
      );
      feedbackPending.current = { ...feedbackPending.current, ...fb };
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(async () => {
        const merged = {
          ...(partnerWorkspace.feedback || {}),
          ...feedbackPending.current,
        };
        feedbackPending.current = {};
        await supabase
          .from("workspaces")
          .update({ feedback: merged })
          .eq("id", partnerWorkspace.id);
      }, 600);
    },
    [partnerWorkspace, supabase]
  );

  // Update my profile (used in the Setup phase for my own job).
  const updateProfile = useCallback(
    async (patch: Record<string, any>) => {
      setProfiles((ps) =>
        ps.map((p) => (p.id === me ? { ...p, ...patch } : p))
      );
      await supabase.from("profiles").update(patch).eq("id", me);
    },
    [supabase, me]
  );

  // ---- Phase control (either partner can drive; both follow via realtime) --
  // fresh=true starts the step's timer now; fresh=false lands on a step whose
  // timer already reads done (used for reviewing a step you've been through).
  async function goToPhase(index: number, fresh = true) {
    const clamped = Math.max(0, Math.min(PHASES.length - 1, index));
    const status = clamped >= PHASES.length - 1 ? "done" : "active";
    const startedAt = fresh
      ? new Date().toISOString()
      : new Date(Date.now() - (PHASES[clamped].minutes * 60 + 1) * 1000).toISOString();
    setSession((s: Session) => ({ ...s, phase: clamped, phase_started_at: startedAt, status }));
    await supabase
      .from("sessions")
      .update({ phase: clamped, phase_started_at: startedAt, status })
      .eq("id", session.id);
    pingCohort(); // let the facilitator cockpit refetch instantly
  }

  async function resetTimer() {
    const now = new Date().toISOString();
    setSession((s: Session) => ({ ...s, phase_started_at: now }));
    await supabase
      .from("sessions")
      .update({ phase_started_at: now })
      .eq("id", session.id);
  }

  // Is the current step's timer finished? Gates forward progress.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  // A stable local start time as a fallback for when the DB's phase_started_at is
  // absent (phase 0 never gets one; a failed/rejected write can leave later ones
  // null too). Captured on the client and reset whenever the phase changes, so the
  // timer always runs and the forward gate always unlocks — no dependency on the
  // realtime write landing. When phase_started_at IS present, we prefer it (both
  // partners' clocks then match); otherwise each client paces off its own mount,
  // which is fine for a self-paced breakout.
  const [localStart, setLocalStart] = useState(() => Date.now());
  useEffect(() => { setLocalStart(Date.now()); }, [session.phase]);
  const startedMs = session.phase_started_at ? new Date(session.phase_started_at).getTime() : localStart;
  const remaining = Math.max(0, phase.minutes * 60 - Math.floor((nowTick - startedMs) / 1000));
  // Instructor-led breaks aren't timer-gated; every other step is.
  const timerDone = phase.mode === "break" ? true : remaining === 0;

  const partnerHere = !!partnerId;
  const waiting = !partnerHere;

  // Best-effort: once the partner arrives, try to stamp phase_started_at in the DB
  // so both clocks sync. This is an optimization, not a requirement — the localStart
  // fallback above already keeps the timer running if this write never lands.
  useEffect(() => {
    if (partnerHere && !session.phase_started_at && phase.mode !== "break") {
      goToPhase(session.phase ?? 0, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerHere, session.phase_started_at]);

  // ---- Waiting room --------------------------------------------------------
  if (waiting && session.host_id === me) {
    return <PairWaiting code={session.code} />;
  }

  const panelProps = {
    me,
    session,
    myWorkspace,
    partnerWorkspace,
    myProfile,
    partnerProfile,
    updateMine,
    updatePartnerFeedback,
    updateProfile,
    myRole: session.host_id === me ? "A" : "B",
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {nudge && (
        <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3">
          <div className="flex items-center gap-3 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg">
            <span className="text-base">📣</span>
            {nudge}
            <button
              onClick={() => setNudge(null)}
              className="ml-2 text-white/50 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            ← {t("room.exit")}
          </Link>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-sm font-semibold tracking-widest">
            {session.code}
          </span>
          <span className="hidden text-sm text-slate-500 sm:inline">
            with{" "}
            <span className="font-medium text-slate-700">
              {partnerProfile?.display_name || "your partner"}
            </span>
          </span>
        </div>
        <Timer
          startedAt={session.phase_started_at || new Date(localStart).toISOString()}
          minutes={phase.minutes}
          onReset={resetTimer}
        />
      </div>

      {/* Phase progress */}
      <div className="mb-6 flex items-center gap-1.5">
        {PHASES.map((p) => {
          const past = p.index < session.phase;
          const current = p.index === session.phase;
          return (
            <button
              key={p.key}
              onClick={() => past && goToPhase(p.index, false)}
              disabled={!past}
              title={past ? `Review: ${p.title}` : p.title}
              className={
                "h-1.5 flex-1 rounded-full transition " +
                (past
                  ? "bg-ink hover:opacity-70"
                  : current
                    ? "bg-ai"
                    : "bg-slate-200")
              }
            />
          );
        })}
      </div>

      {/* Phase header */}
      <div className="mb-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          {t("room.step", { n: session.phase + 1, total: PHASES.length })} · {phase.minutes} min
        </div>
        <h1 className="mt-1 text-2xl font-bold">{phase.title}</h1>
        <p className="mt-1 max-w-3xl text-slate-500">{phase.subtitle}</p>
      </div>

      {!partnerHere && (
        <div className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("room.waitingPartner", { code: session.code })}
        </div>
      )}

      {/* Phase panel */}
      <div className="pb-24">
        {phase.key === "setup" && <SetupPanel {...panelProps} />}
        {["interview1", "interview2", "deeper1", "deeper2"].includes(phase.key) && (
          <InterviewPanel {...panelProps} />
        )}
        {phase.key === "summary" && <RealJobPanel {...panelProps} />}
        {phase.key === "break" && <BreakPanel {...panelProps} />}
        {phase.key === "redesign" && <RedesignPanel {...panelProps} />}
        {phase.key === "share" && <SharePanel {...panelProps} />}
        {phase.key === "final" && <FinalPanel {...panelProps} />}
      </div>

      {/* Bottom nav */}
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => goToPhase(session.phase - 1, false)}
            disabled={session.phase === 0}
            className="btn-ghost"
          >
            {t("room.back")}
          </button>
          <div className="hidden text-sm text-slate-400 sm:block">
            {t(timerDone ? "room.timerUp" : "room.timerWait")}
          </div>
          {session.phase < PHASES.length - 1 ? (
            <button
              onClick={() => goToPhase(session.phase + 1, true)}
              disabled={!timerDone}
              className="btn-primary"
            >
              {t("room.next")} →
            </button>
          ) : (
            <Link href="/dashboard" className="btn-primary">
              {t("room.finish")}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

