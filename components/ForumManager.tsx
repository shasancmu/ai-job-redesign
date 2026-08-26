"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { makePhotoCode } from "@/lib/photo";

type Sess = { id: string; code: string; topic: string; status: string; created_at: string };

const CHIP: Record<string, string> = { open: "bg-sky-soft text-sky", closed: "bg-slate-100 text-slate-600" };

export default function ForumManager({ me, initial }: { me: string; initial: Sess[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [list, setList] = useState<Sess[]>(initial);
  const [topic, setTopic] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makePhotoCode();
      const { data, error } = await supabase
        .from("forum_sessions")
        .insert({ code, host_id: me, topic: topic.trim(), instructions: instructions.trim(), status: "open" })
        .select()
        .single();
      if (!error && data) {
        router.push(`/forum/${code}/present`);
        return;
      }
      if (error && !`${error.message}`.toLowerCase().includes("duplicate")) {
        setErr(error.message);
        setBusy(false);
        return;
      }
    }
    setErr("Couldn't create. Try again.");
    setBusy(false);
  }

  async function remove(id: string, code: string) {
    if (!window.confirm(`Delete chat ${code}? This removes it and every message.`)) return;
    const { error } = await supabase.from("forum_sessions").delete().eq("id", id);
    if (!error) setList((l) => l.filter((c) => c.id !== id));
    else window.alert(error.message);
  }

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="card p-6">
        <label className="lbl">The question on screen</label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={2}
          placeholder="e.g. What should we NEVER let AI decide? Argue for one thing."
          className="field mt-1"
        />
        <label className="lbl mt-4">How should the AI adjudicate? <span className="font-normal text-slate-400">· optional</span></label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
          placeholder="Tell the AI its job, e.g. 'Referee the debate, name the strongest argument on each side, then rule.' or 'Cluster the answers and call the room's consensus.'"
          className="field mt-1"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">The room joins by code, posts freely, and the AI reads the whole thread live on the shared screen.</p>
          <button className="btn-primary" disabled={busy}>{busy ? "Creating…" : "Create & present →"}</button>
        </div>
        {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      </form>

      <div>
        <h2 className="eyebrow mb-3">Your chats</h2>
        {list.length === 0 ? (
          <p className="rounded-xl bg-mist px-4 py-5 text-sm text-slate2">None yet. Create one above.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id} className="card flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold tracking-widest text-ink">{c.code}</span>
                    <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (CHIP[c.status] || "bg-slate-100 text-slate-600")}>{c.status}</span>
                  </div>
                  <div className="truncate text-sm text-slate2">{c.topic || "Untitled question"}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/forum/${c.code}/present`} className="btn-primary text-sm">Present</Link>
                  <button onClick={() => remove(c.id, c.code)} title="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">✕</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
