"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type LP = { slug: string; name: string; emoji: string | null; prompt: string; subtitle: string | null };

async function post(body: any) {
  const res = await fetch("/api/studio/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json().then((d) => ({ ok: res.ok, ...d }));
}

export default function LivePromptManager({ initial }: { initial: LP[] }) {
  const [editing, setEditing] = useState<string | null>(null); // slug | "new" | null
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🌥️");
  const [prompt, setPrompt] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  function startNew() { setEditing("new"); setName(""); setEmoji("🌥️"); setPrompt(""); setSubtitle(""); setErr(null); }
  function startEdit(lp: LP) { setEditing(lp.slug); setName(lp.name); setEmoji(lp.emoji || "🌥️"); setPrompt(lp.prompt); setSubtitle(lp.subtitle || ""); setErr(null); }

  async function save() {
    setErr(null); setBusy(true);
    const r = await post({ slug: editing === "new" ? undefined : editing, name, emoji, prompt, subtitle });
    setBusy(false);
    if (!r.ok) { setErr(r.error || "Couldn't save."); return; }
    setEditing(null);
    router.refresh();
  }
  async function remove(slug: string) {
    if (!window.confirm("Delete this live prompt?")) return;
    await post({ action: "delete", slug });
    router.refresh();
  }

  return (
    <div>
      {editing ? (
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="mb-2 flex items-center gap-2">
            <input className="field w-16 text-center" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} />
            <input className="field flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name — e.g. One word for how AI changes your job" maxLength={160} />
          </div>
          <label className="lbl">The question the room answers</label>
          <textarea className="field mb-2 min-h-[70px]" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="What's the one skill you'd most want to build this year?" maxLength={1000} />
          <input className="field mb-3" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Optional subtitle shown on the projector" maxLength={200} />
          <div className="flex items-center gap-3">
            <button onClick={save} disabled={busy || !name.trim() || !prompt.trim()} className="btn-dark text-sm">{busy ? "Saving…" : "Save template"}</button>
            <button onClick={() => setEditing(null)} className="text-sm text-slate-400 hover:text-ink">Cancel</button>
            {err && <span className="text-sm text-clay">{err}</span>}
          </div>
          <p className="mt-2 text-xs text-slate-400">It becomes a Live module in your library — assign it to a cohort, and launch it from the cohort&apos;s Run-live cockpit.</p>
        </div>
      ) : (
        <button onClick={startNew} className="btn-primary text-sm">+ New live prompt</button>
      )}

      <div className="mt-5 space-y-2">
        {initial.length === 0 && !editing && <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-slate-400">No live prompts yet. Author one and it joins your module library as a Live template.</div>}
        {initial.map((lp) => (
          <div key={lp.slug} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 text-sm">
            <span className="text-xl">{lp.emoji || "🌥️"}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-ink">{lp.name} <span className="ml-1 rounded-full bg-sage/10 px-1.5 py-0.5 text-[10px] font-semibold text-sage align-middle">Live</span></div>
              <div className="truncate text-xs text-slate-400">{lp.prompt}</div>
            </div>
            <Link href={`/lp/${lp.slug}`} className="shrink-0 text-xs font-semibold text-sage hover:underline">Present →</Link>
            <button onClick={() => startEdit(lp)} className="shrink-0 text-xs font-semibold text-slate2 hover:text-ink">Edit</button>
            <button onClick={() => remove(lp.slug)} className="shrink-0 text-xs text-slate-400 hover:text-clay">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
