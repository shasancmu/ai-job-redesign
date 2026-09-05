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
  const [imgUrl, setImgUrl] = useState("");
  const [beatUrl, setBeatUrl] = useState<Record<string, string>>({});
  const [showBeats, setShowBeats] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState<{ slug: string; published: boolean } | null>(null);
  // Media candidates the studio found via web search (transient; not saved as-is).
  const suggest = (spec as any)._suggest as { videos?: { url: string; title: string }[]; images?: { url: string; title: string }[] } | undefined;

  function attachVideo(url = videoUrl) {
    const id = ytId(url);
    if (!id) { setErr("Paste a valid YouTube link."); return; }
    setErr("");
    setG({ ...g, openingVideo: { youtubeId: id, title: g.title } });
    setVideoUrl("");
  }
  function attachImage(url = imgUrl) {
    if (!/^https?:\/\//.test(url.trim())) { setErr("Paste a valid image URL."); return; }
    setErr("");
    setG({ ...g, heroImage: { url: url.trim(), alt: g.title } });
    setImgUrl("");
  }
  // Assign / clear an image on a specific beat.
  function setBeatImage(section: "situationBeats" | "revealBeats", i: number, url: string | null) {
    setG((prev) => {
      const beats = prev[section].map((b, k) => (k === i ? { ...b, image: url ? { url, alt: b.title } : undefined } : b));
      return { ...prev, [section]: beats };
    });
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
              <button onClick={() => attachVideo()} className="btn-ghost">Attach</button>
            </div>
            {g.openingVideo && <p className="mt-1 text-xs text-sage">✓ video attached ({g.openingVideo.youtubeId}) — <button onClick={() => setG({ ...g, openingVideo: undefined })} className="underline">remove</button></p>}
            {!!suggest?.videos?.length && (
              <div className="mt-2">
                <div className="text-[11px] font-mono uppercase tracking-wide text-slate-400">Found on the web — click to verify &amp; use</div>
                <div className="mt-1 space-y-1">
                  {suggest.videos.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <a href={v.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-sky underline">{v.title || v.url}</a>
                      <button onClick={() => attachVideo(v.url)} className="rounded-full bg-mist px-2 py-0.5 font-semibold text-ink hover:bg-slate-200">Use</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="lbl">Hero image <span className="font-normal text-slate-400">— paste a verified image URL</span></label>
            <div className="mt-1 flex gap-2">
              <input className="field flex-1" value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="https://…/photo.jpg" />
              <button onClick={() => attachImage()} className="btn-ghost">Attach</button>
            </div>
            {g.heroImage && <p className="mt-1 text-xs text-sage">✓ image attached — <button onClick={() => setG({ ...g, heroImage: undefined })} className="underline">remove</button></p>}
            {!!suggest?.images?.length && (
              <div className="mt-2">
                <div className="text-[11px] font-mono uppercase tracking-wide text-slate-400">Found on the web — click to verify &amp; use</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {suggest.images.map((im, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <button key={i} onClick={() => attachImage(im.url)} className="h-16 w-24 overflow-hidden rounded-lg border border-line hover:border-ink" title={im.title || im.url}>
                      <img src={im.url} alt={im.title || ""} className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-line bg-mist/30 p-3">
            <button onClick={() => setShowBeats((s) => !s)} className="flex w-full items-center justify-between text-left">
              <span className="lbl">Images per section <span className="font-normal text-slate-400">— optional</span></span>
              <span className="font-mono text-[11px] uppercase text-slate-400">{showBeats ? "hide" : "add"}</span>
            </button>
            {showBeats && (
              <div className="mt-2 space-y-3">
                {(["situationBeats", "revealBeats"] as const).flatMap((section) =>
                  g[section].map((b, i) => {
                    const key = `${section}-${i}`;
                    return (
                      <div key={key} className="rounded-lg border border-line bg-white p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="grid h-5 w-5 flex-none place-items-center rounded bg-sage-soft text-[11px] font-bold text-sage">{b.n}</span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{b.title}</span>
                          {b.image && <button onClick={() => setBeatImage(section, i, null)} className="text-[11px] text-sage underline">✓ remove</button>}
                        </div>
                        <div className="mt-1.5 flex gap-2">
                          <input className="field flex-1 py-1 text-xs" value={beatUrl[key] || ""} onChange={(e) => setBeatUrl((m) => ({ ...m, [key]: e.target.value }))} placeholder="image URL" />
                          <button onClick={() => { const u = (beatUrl[key] || "").trim(); if (/^https?:\/\//.test(u)) { setBeatImage(section, i, u); setBeatUrl((m) => ({ ...m, [key]: "" })); } }} className="btn-ghost px-2 py-1 text-xs">Set</button>
                        </div>
                        {!!suggest?.images?.length && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {suggest.images.slice(0, 6).map((im, k) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <button key={k} onClick={() => setBeatImage(section, i, im.url)} className="h-10 w-16 overflow-hidden rounded border border-line hover:border-ink" title="Use for this section">
                                <img src={im.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
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
