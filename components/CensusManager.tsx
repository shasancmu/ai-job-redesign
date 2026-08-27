"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { makePhotoCode } from "@/lib/photo";

type Campaign = { id: string; code: string; label: string; created_at: string };

export default function CensusManager({ me, initial }: { me: string; initial: Campaign[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [rows, setRows] = useState<Campaign[]>(initial);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    let code = "";
    for (let i = 0; i < 5; i++) {
      code = makePhotoCode();
      const { error } = await supabase.from("business_campaigns").insert({ code, owner_id: me, label: label.trim() });
      if (!error) break; code = "";
    }
    setBusy(false);
    if (!code) return;
    router.push(`/facilitator/census/${code}`);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this collection? The business records stay in your data.")) return;
    await supabase.from("business_campaigns").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="text-sm font-semibold text-ink">New collection</div>
        <p className="mt-1 text-xs text-slate-500">A collection gives you a share link and a dashboard. Every completed profile lands here.</p>
        <div className="mt-3 flex items-center gap-2">
          <input className="field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label, e.g. Durham pilot, Wave 1" />
          <button onClick={create} disabled={busy} className="btn-primary shrink-0">{busy ? "..." : "Create"}</button>
        </div>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-slate-400">No collections yet.</p>}
        {rows.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-line bg-white p-3">
            <div><span className="font-mono text-lg font-bold tracking-widest text-ink">{c.code}</span>{c.label && <span className="ml-3 text-sm text-slate-500">{c.label}</span>}</div>
            <div className="flex items-center gap-2">
              <Link href={`/facilitator/census/${c.code}`} className="btn-ghost text-sm">Dashboard →</Link>
              <button onClick={() => remove(c.id)} className="text-sm text-slate-400 hover:text-clay">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
