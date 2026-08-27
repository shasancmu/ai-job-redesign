"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REDESIGN_PREFIX } from "@/lib/mechanics/redesignStore";

function makeCode() { const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let o = ""; for (let i = 0; i < 5; i++) o += c[Math.floor(Math.random() * c.length)]; return o; }

export default function RedesignLobby({ me, slug, name, emoji }: { me: string; slug: string; name: string; emoji: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [join, setJoin] = useState("");
  const [err, setErr] = useState("");

  async function create() {
    setBusy(true); setErr("");
    for (let i = 0; i < 5; i++) {
      const code = makeCode();
      const { error } = await supabase.from("sessions").insert({ code, host_id: me, status: "waiting", exercise: `${REDESIGN_PREFIX}${slug}`, phase: 0 });
      if (!error) { router.push(`/rd/room/${code}`); return; }
      if (!`${error.message}`.toLowerCase().includes("duplicate")) { setErr(error.message); break; }
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
        <div className="text-3xl">{emoji}</div>
        <h1 className="mt-2 font-serif text-2xl text-ink">{name}</h1>
        <p className="mt-2 text-sm text-slate-500">Pair up: one of you starts a room and shares the code; the other joins it.</p>
        <button onClick={create} disabled={busy} className="btn-primary mt-5 w-full">{busy ? "Starting…" : "Start a room"}</button>
        <div className="my-4 text-xs text-slate-400">or</div>
        <div className="flex gap-2">
          <input className="field flex-1 text-center font-mono uppercase tracking-widest" value={join} onChange={(e) => setJoin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))} placeholder="CODE" />
          <button onClick={() => join.length >= 4 && router.push(`/rd/room/${join}`)} disabled={join.length < 4} className="btn-ghost disabled:opacity-50">Join</button>
        </div>
        {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
      </div>
    </div>
  );
}
