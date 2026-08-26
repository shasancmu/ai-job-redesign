"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { makePhotoCode } from "@/lib/photo";

type Run = { id: string; code: string; label: string; created_at: string };

export default function CapstoneRunManager({ me, initial }: { me: string; initial: Run[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [rows, setRows] = useState<Run[]>(initial);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    let code = "";
    for (let i = 0; i < 5; i++) {
      code = makePhotoCode();
      const { error } = await supabase.from("capstone_runs").insert({ code, host_id: me, label: label.trim() });
      if (!error) break;
      code = "";
    }
    setBusy(false);
    if (!code) return;
    router.push(`/facilitator/capstone/${code}`);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this class run? Team results stay but won't be grouped here.")) return;
    await supabase.from("capstone_runs").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="text-sm font-semibold text-ink">Start a class run</div>
        <p className="mt-1 text-xs text-slate-500">You get one run code to put on the screen. Every team captain enters it when they start their team, and they all appear on your live board.</p>
        <div className="mt-3 flex items-center gap-2">
          <input className="field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional), e.g. Section A, Tue 2pm" />
          <button onClick={start} disabled={busy} className="btn-primary shrink-0">{busy ? "Starting..." : "Start run"}</button>
        </div>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-slate-400">No class runs yet. Start one above.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border border-line bg-white p-3">
            <div>
              <span className="font-mono text-lg font-bold tracking-widest text-ink">{r.code}</span>
              {r.label && <span className="ml-3 text-sm text-slate-500">{r.label}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/facilitator/capstone/${r.code}`} className="btn-ghost text-sm">Open board →</Link>
              <button onClick={() => remove(r.id)} className="text-sm text-slate-400 hover:text-clay">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
