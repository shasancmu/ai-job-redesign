"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cohortChannelName } from "@/components/useCohortLive";
import { UNTAGGED } from "@/lib/admin";
import { PHASES } from "@/lib/exercise";

const BREAK_INDEX = PHASES.findIndex((p) => p.mode === "break");

// Seconds a room is past its current step's time budget (0 if within budget, or
// if the step is untimed / a break). Used to flag rooms that may be stuck.
function overtimeSecs(room: { minutes: number | null; phase_started_at: string | null }, now: number): number {
  if (room.minutes == null || room.minutes <= 0 || !room.phase_started_at) return 0;
  const started = new Date(room.phase_started_at).getTime();
  const rem = room.minutes * 60 - Math.floor((now - started) / 1000);
  return rem < 0 ? -rem : 0;
}

type Room = {
  id: string;
  code: string;
  exercise: string;
  phase: number;
  totalPhases: number;
  stepTitle: string;
  minutes: number | null;
  status: string;
  phase_started_at: string | null;
  host: string | null;
  guest: string | null;
};

export default function Cockpit({
  cohort,
  stepLabels,
}: {
  cohort: string;
  stepLabels: string[];
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const label = cohort === UNTAGGED ? "(untagged)" : cohort;
  const supabase = useMemo(() => createClient(), []);

  const load = useCallback(async () => {
    const res = await fetch(
      `/facilitator/state?cohort=${encodeURIComponent(cohort)}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      setRooms(data.rooms || []);
      setLoaded(true);
    }
  }, [cohort]);

  // Coalesce a burst of participant pings into a single refetch.
  const loadTimer = useRef<any>(null);
  const scheduleLoad = useCallback(() => {
    if (loadTimer.current) return;
    loadTimer.current = setTimeout(() => { loadTimer.current = null; load(); }, 350);
  }, [load]);

  useEffect(() => {
    load();
    // Realtime pings (below) drive the fast path; this poll is just a safety net
    // in case a broadcast is missed, so it can be slow.
    const poll = setInterval(load, 12000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    // Refetch the instant any room in this cohort advances. Broadcast is not
    // RLS-gated, so it reaches us even though we can't read participant rows.
    const name = cohortChannelName(cohort);
    let ch: any = null;
    if (name) {
      ch = supabase
        .channel(name, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "progress" }, () => scheduleLoad())
        .subscribe();
    }
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      if (loadTimer.current) { clearTimeout(loadTimer.current); loadTimer.current = null; }
      if (ch) { try { supabase.removeChannel(ch); } catch { /* already gone */ } }
    };
  }, [load, scheduleLoad, supabase, cohort]);

  const flashTimer = useRef<any>(null);
  function showFlash(t: string) {
    setFlash(t);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 2500);
  }

  async function control(payload: any, note: string) {
    const res = await fetch("/facilitator/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cohort, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      showFlash(`${note} · ${data.updated ?? ""} rooms`);
      load();
    } else {
      showFlash(data.error || "Failed");
    }
  }

  const active = rooms.filter((r) => r.status === "active").length;
  const done = rooms.filter((r) => r.status === "done").length;
  const waiting = rooms.filter((r) => r.status === "waiting").length;
  // Rooms actively working but more than 30s past their step budget — the ones a
  // facilitator might want to check on or nudge forward.
  const runningLong = rooms.filter((r) => r.status === "active" && overtimeSecs(r, now) > 30).length;

  // distribution across steps
  const maxStep = Math.max(6, ...rooms.map((r) => r.totalPhases));
  const dist: number[] = Array.from({ length: maxStep }, () => 0);
  rooms.forEach((r) => {
    if (r.phase >= 0 && r.phase < dist.length) dist[r.phase]++;
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/facilitator?cohort=${encodeURIComponent(cohort)}`}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            ← {label}
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Live cockpit</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Stat n={rooms.length} label="rooms" />
          <Stat n={active} label="active" color="text-blue-600" />
          <Stat n={waiting} label="waiting" color="text-amber-600" />
          <Stat n={done} label="done" color="text-green-600" />
          {runningLong > 0 && <Stat n={runningLong} label="running long" color="text-amber-600" />}
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            live
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="card mb-5 p-4">
        {BREAK_INDEX >= 0 && (
          <button
            onClick={() =>
              control({ op: "goto", phase: BREAK_INDEX + 1 }, "Resumed all rooms from the break")
            }
            className="btn-primary mb-4 w-full sm:w-auto"
          >
            ▶ Resume all rooms from the break
          </button>
        )}
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Or move everyone to a step
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {stepLabels.map((t, i) => (
            <button
              key={i}
              onClick={() => control({ op: "goto", phase: i }, `Sent all to “${t}”`)}
              className="btn-ghost text-sm"
            >
              <span className="font-semibold text-ai">{i + 1}</span> {t}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[240px]">
            <label className="lbl">Send a nudge to all rooms</label>
            <input
              className="field"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="2 minutes left. Start wrapping up."
              onKeyDown={(e) => {
                if (e.key === "Enter" && msg.trim()) {
                  control({ op: "message", message: msg }, "Nudge sent");
                  setMsg("");
                }
              }}
            />
          </div>
          <button
            disabled={!msg.trim()}
            onClick={() => {
              control({ op: "message", message: msg }, "Nudge sent");
              setMsg("");
            }}
            className="btn-primary"
          >
            Send nudge
          </button>
        </div>
        {flash && (
          <div className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {flash}
          </div>
        )}
      </div>

      {/* Step distribution */}
      <div className="card mb-5 p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Where the room is
        </div>
        <div className="flex items-end gap-2" style={{ height: 90 }}>
          {dist.map((c, i) => {
            const max = Math.max(1, ...dist);
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-ai/80"
                  style={{ height: `${(c / max) * 70}px`, minHeight: c ? 4 : 0 }}
                  title={`${c} rooms`}
                />
                <div className="text-xs font-semibold text-slate-500">{c || ""}</div>
                <div className="text-[10px] text-slate-400">{i + 1}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Room grid */}
      {!loaded ? (
        <p className="text-slate-400">Loading rooms…</p>
      ) : rooms.length === 0 ? (
        <p className="text-slate-500">No rooms in this cohort yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => (
            <RoomCard key={r.id} room={r} now={now} />
          ))}
        </div>
      )}
    </main>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color?: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className={"text-lg font-bold " + (color || "text-slate-800")}>{n}</span>
      <span className="text-slate-400">{label}</span>
    </span>
  );
}

function RoomCard({ room, now }: { room: Room; now: number }) {
  let remaining: number | null = null;
  if (room.minutes != null && room.minutes > 0 && room.phase_started_at) {
    const started = new Date(room.phase_started_at).getTime();
    remaining = Math.max(0, room.minutes * 60 - Math.floor((now - started) / 1000));
  }
  const overBy = overtimeSecs(room, now);
  const runningLong = room.status === "active" && overBy > 30;
  const statusColor =
    room.status === "done"
      ? "bg-green-500"
      : room.status === "active"
        ? "bg-blue-500"
        : "bg-amber-500";
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className={"card p-4" + (runningLong ? " border-l-2 border-l-amber-400" : "")}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-bold tracking-widest">
          {room.code}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className={"h-2 w-2 rounded-full " + statusColor} />
          {room.status}
        </span>
      </div>
      <div className="mt-1 truncate text-sm text-slate-600">
        {room.host || "—"} <span className="text-slate-300">&amp;</span>{" "}
        {room.guest || <span className="text-amber-600">no partner</span>}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm">
          <span className="font-semibold text-ai">{room.phase + 1}</span>
          <span className="text-slate-400">/{room.totalPhases}</span>{" "}
          <span className="text-slate-700">{room.stepTitle}</span>
        </div>
        {remaining != null && (
          <span
            className={
              "font-mono text-sm font-semibold tabular-nums " +
              (overBy > 0 ? "text-amber-600" : "text-slate-500")
            }
            title={overBy > 0 ? "Past this step's time" : undefined}
          >
            {overBy > 0 ? `+${fmt(overBy)}` : fmt(remaining)}
          </span>
        )}
      </div>
      {runningLong && (
        <div className="mt-2 text-xs font-medium text-amber-600">Running long, may need a nudge</div>
      )}
    </div>
  );
}
