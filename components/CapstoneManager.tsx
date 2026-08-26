"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { makePhotoCode } from "@/lib/photo";

type Session = { id: string; code: string; status: string; created_at: string };

export default function CapstoneManager({ me, initial }: { me: string; initial: Session[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [rows, setRows] = useState<Session[]>(initial);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const code = makePhotoCode();
    const { data, error } = await supabase.from("capstone_sessions").insert({ code, host_id: me }).select().single();
    setBusy(false);
    if (error || !data) return;
    router.push(`/capstone/${code}`);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this team session?")) return;
    await supabase.from("capstone_sessions").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-5">
      <button onClick={create} disabled={busy} className="btn-primary">{busy ? "Creating..." : "Start a new team session"}</button>

      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-slate-400">No sessions yet. Start one, then share the code with your teams.</p>}
        {rows.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-line bg-white p-3">
            <div>
              <span className="font-mono text-lg font-bold tracking-widest text-ink">{s.code}</span>
              <span className="ml-3 text-xs text-slate-400">{s.status}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/capstone/${s.code}`} className="btn-ghost text-sm">Open →</Link>
              <button onClick={() => remove(s.id)} className="text-sm text-slate-400 hover:text-clay">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
