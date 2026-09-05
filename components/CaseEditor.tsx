"use client";

// The verify-and-publish step for a drafted Living Case. Preview the case, fix
// the title/dek, drop in a verified opening video, then save a draft or publish.
// The AI never invents videos — this is where a real one is added.

import { useState } from "react";
import Link from "next/link";
import LivingCaseReader from "@/components/LivingCaseReader";
import type { CaseGenome } from "@/lib/cases/types";

function ytId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(url.trim()) ? url.trim() : null);
}

export default function CaseEditor({ spec }: { spec: CaseGenome; me?: string; orgName?: string | null }) {
  const [g, setG] = useState<CaseGenome>(spec);
  const [videoUrl, setVideoUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState<{ slug: string; published: boolean } | null>(null);

  function attachVideo() {
    const id = ytId(videoUrl);
    if (!id) { setErr("Paste a valid YouTube link."); return; }
    setErr("");
    setG({ ...g, openingVideo: { youtubeId: id, title: g.title } });
    setVideoUrl("");
  }

  async function save(publish: boolean) {
    setBusy(publish ? "publish" : "draft"); setErr("");
    try {
      const res = await fetch("/api/cases/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec: g, publish }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.slug) throw new Error(d.error || "save failed");
      setSaved({ slug: d.slug, published: publish });
    } catch (e: any) { setErr(e?.message || "Couldn't save."); }
    setBusy("");
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-line bg-white p-6 text-center shadow-sm">
          <div className="text-3xl">✓</div>
          <h1 className="mt-2 font-serif text-2xl text-ink">{saved.published ? "Published" : "Saved as draft"}</h1>
          <p className="mt-1 text-sm text-slate-500">{saved.published ? "Your class can run this living case by link." : "It's in Your modules as a draft. Publish when it's verified."}</p>
          <Link href={`/cases/${saved.slug}`} className="btn-primary mt-4 inline-block">Open the case →</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-3xl px-5">
        <div className="mb-3 rounded-xl border border-amber/40 bg-amber/5 px-4 py-2.5 text-sm text-slate2">
          <b className="text-ink">Draft — verify before you publish.</b> Check the facts, then add a real opening video and publish. The AI won't invent videos.
        </div>
        <div className="card space-y-3 p-4">
          <div><label className="lbl">Title</label><input className="field mt-1" value={g.title} onChange={(e) => setG({ ...g, title: e.target.value })} /></div>
          <div><label className="lbl">Opening line (dek)</label><textarea className="field mt-1 min-h-[70px]" value={g.dek} onChange={(e) => setG({ ...g, dek: e.target.value })} /></div>
          <div>
            <label className="lbl">Opening video <span className="font-normal text-slate-400">— paste a verified YouTube link</span></label>
            <div className="mt-1 flex gap-2">
              <input className="field flex-1" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
              <button onClick={attachVideo} className="btn-ghost">Attach</button>
            </div>
            {g.openingVideo && <p className="mt-1 text-xs text-sage">✓ video attached ({g.openingVideo.youtubeId}) — <button onClick={() => setG({ ...g, openingVideo: undefined })} className="underline">remove</button></p>}
          </div>
          {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          <div className="flex gap-2">
            <button onClick={() => save(false)} disabled={!!busy} className="btn-ghost flex-1">{busy === "draft" ? "Saving…" : "Save draft"}</button>
            <button onClick={() => save(true)} disabled={!!busy} className="btn-primary flex-1">{busy === "publish" ? "Publishing…" : "Publish"}</button>
          </div>
        </div>
        <div className="mt-4 text-center text-xs font-mono uppercase tracking-wide text-slate-400">Live preview ↓</div>
      </div>
      <div className="mt-2 border-t-4 border-sage/20">
        <LivingCaseReader genome={g} preview />
      </div>
    </div>
  );
}
