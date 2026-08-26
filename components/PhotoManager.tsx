"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { makePhotoCode } from "@/lib/photo";

type Sess = { id: string; code: string; prompt: string; status: string; created_at: string };

const STATUS_CHIP: Record<string, string> = {
  open: "bg-sky-soft text-sky",
  revealed: "bg-sage-soft text-sage",
  closed: "bg-slate-100 text-slate-600",
};

export default function PhotoManager({ me, initial, showPhotos = false }: { me: string; initial: Sess[]; showPhotos?: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [list, setList] = useState<Sess[]>(initial);
  const [prompt, setPrompt] = useState("");
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
        .from("photo_sessions")
        .insert({ code, host_id: me, prompt: prompt.trim(), status: "open", show_photos: showPhotos })
        .select()
        .single();
      if (!error && data) {
        router.push(`/photo/${code}/present`);
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
    if (!window.confirm(`Delete photo activity ${code}? This removes it and all its descriptions.`)) return;
    const { error } = await supabase.from("photo_sessions").delete().eq("id", id);
    if (!error) setList((l) => l.filter((c) => c.id !== id));
    else window.alert(error.message);
  }

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="card p-6">
        <label className="lbl">Your prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          placeholder="e.g. Photograph one thing at your desk that only a human can do well. A snap of handwriting works too."
          className="field mt-1"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">Photos are analyzed by AI and never stored. You can edit the prompt on the presenter too.</p>
          <button className="btn-primary" disabled={busy}>{busy ? "Creating…" : "Create & present →"}</button>
        </div>
        {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      </form>

      <div>
        <h2 className="eyebrow mb-3">Your photo activities</h2>
        {list.length === 0 ? (
          <p className="rounded-xl bg-mist px-4 py-5 text-sm text-slate2">None yet. Create one above.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id} className="card flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold tracking-widest text-ink">{c.code}</span>
                    <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (STATUS_CHIP[c.status] || "bg-slate-100 text-slate-600")}>{c.status}</span>
                  </div>
                  <div className="truncate text-sm text-slate2">{c.prompt || "Untitled prompt"}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/photo/${c.code}/present`} className="btn-primary text-sm">Present</Link>
                  <button
                    onClick={() => remove(c.id, c.code)}
                    title="Delete"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
