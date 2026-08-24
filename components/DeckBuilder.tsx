"use client";

import { useState } from "react";
import Link from "next/link";
import { ACTIVITY_TYPES, STATIC_TYPES, newSlide, slideLabel, validateDeck, type Slide, type SlideType } from "@/lib/deckTypes";

export default function DeckBuilder({ initial, editSlug }: { initial?: { title: string; slides: Slide[] }; editSlug?: string }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [slides, setSlides] = useState<Slide[]>(initial?.slides?.length ? initial.slides : [newSlide("title")]);
  const [sel, setSel] = useState(0);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  const cur = slides[Math.min(sel, slides.length - 1)];
  const errors = validateDeck(title, slides);
  const setCur = (patch: Partial<Slide>) => setSlides((ss) => ss.map((s, i) => (i === sel ? ({ ...s, ...patch } as Slide) : s)));

  function add(type: SlideType) { const s = newSlide(type); setSlides((ss) => { const n = [...ss]; n.splice(sel + 1, 0, s); return n; }); setSel(sel + 1); setAdding(false); setSavedSlug(null); }
  function del(i: number) { if (slides.length <= 1) return; setSlides((ss) => ss.filter((_, k) => k !== i)); setSel(Math.max(0, i - 1)); setSavedSlug(null); }
  function move(i: number, d: -1 | 1) { const j = i + d; if (j < 0 || j >= slides.length) return; setSlides((ss) => { const n = [...ss]; [n[i], n[j]] = [n[j], n[i]]; return n; }); setSel(j); }

  async function save(status: "draft" | "published") {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/decks/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, slides, status, editSlug }) });
      const d = await res.json();
      if (res.ok && d.slug) { setSavedSlug(d.slug); if (Array.isArray(d.slides)) setSlides(d.slides); }
      else setErr(d.error || "Couldn't save.");
    } catch { setErr("Couldn't save."); }
    setBusy(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      {/* Slide list */}
      <div className="space-y-2">
        <input className="field font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deck title" />
        <div className="space-y-1">
          {slides.map((s, i) => (
            <div key={s.id} className={"group flex items-center gap-2 rounded-lg border p-2 text-left transition " + (i === sel ? "border-ink bg-slate-50" : "border-line hover:border-slate-300")}>
              <button onClick={() => setSel(i)} className="flex min-w-0 flex-1 items-center gap-2">
                <span className="flex-none text-xs text-slate-400">{i + 1}</span>
                <span className="truncate text-xs text-slate-600">{slideLabel(s)}</span>
              </button>
              <div className="flex flex-none items-center opacity-0 transition group-hover:opacity-100">
                <button onClick={() => move(i, -1)} className="px-1 text-slate-300 hover:text-ink">↑</button>
                <button onClick={() => move(i, 1)} className="px-1 text-slate-300 hover:text-ink">↓</button>
                <button onClick={() => del(i)} className="px-1 text-slate-300 hover:text-clay">✕</button>
              </div>
            </div>
          ))}
        </div>
        <div className="relative">
          <button onClick={() => setAdding((a) => !a)} className="w-full rounded-lg border border-dashed border-line py-2 text-sm font-semibold text-ai hover:bg-mist">+ Add slide</button>
          {adding && (
            <div className="absolute z-10 mt-1 w-full rounded-xl border border-line bg-white p-2 shadow-lift">
              <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Slides</div>
              {STATIC_TYPES.map((t) => <button key={t.type} onClick={() => add(t.type)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-mist"><span>{t.icon}</span>{t.label}</button>)}
              <div className="mt-1 border-t border-line px-1 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Live activities</div>
              {ACTIVITY_TYPES.map((t) => <button key={t.type} onClick={() => add(t.type)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-mist"><span>{t.icon}</span>{t.label}</button>)}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div>
        <div className="card min-h-[320px] p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Slide {sel + 1} · {cur.type}</div>
          <SlideEditor slide={cur} set={setCur} />
        </div>

        {errors.length > 0 && <ul className="mt-3 space-y-1 text-sm text-clay">{errors.slice(0, 4).map((e, i) => <li key={i}>• {e}</li>)}</ul>}
        {err && <p className="mt-2 text-sm text-clay">{err}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={() => save("published")} disabled={busy || errors.length > 0} className="btn-primary text-sm disabled:opacity-40">{busy ? "Saving…" : editSlug ? "Save changes" : "Save"}</button>
          <button onClick={() => save("draft")} disabled={busy || errors.length > 0} className="btn-ghost text-sm disabled:opacity-40">Save draft</button>
          {savedSlug && <Link href={`/decks/${savedSlug}/present`} className="btn-primary text-sm" target="_blank">Present →</Link>}
          {savedSlug && <span className="text-xs text-slate-400">Saved. Live activities got their join codes.</span>}
        </div>
      </div>
    </div>
  );
}

function SlideEditor({ slide, set }: { slide: Slide; set: (p: Partial<Slide>) => void }) {
  switch (slide.type) {
    case "title":
      return (<div className="space-y-3"><L t="Title"><input className="field text-lg" value={slide.title} onChange={(e) => set({ title: e.target.value } as any)} placeholder="Presentation title" /></L><L t="Subtitle"><input className="field" value={slide.subtitle || ""} onChange={(e) => set({ subtitle: e.target.value } as any)} placeholder="Optional subtitle" /></L></div>);
    case "section":
      return (<L t="Section title"><input className="field text-lg" value={slide.title} onChange={(e) => set({ title: e.target.value } as any)} placeholder="Part 2: The plan" /></L>);
    case "bullets":
      return (<div className="space-y-3"><L t="Heading"><input className="field" value={slide.title} onChange={(e) => set({ title: e.target.value } as any)} placeholder="Heading" /></L><L t="Bullets"><BulletEditor bullets={slide.bullets} onChange={(b) => set({ bullets: b } as any)} /></L></div>);
    case "text":
      return (<div className="space-y-3"><L t="Heading (optional)"><input className="field" value={slide.title || ""} onChange={(e) => set({ title: e.target.value } as any)} /></L><L t="Text"><textarea className="field min-h-[140px]" value={slide.body} onChange={(e) => set({ body: e.target.value } as any)} /></L></div>);
    case "quote":
      return (<div className="space-y-3"><L t="Quote"><textarea className="field min-h-[100px] text-lg" value={slide.quote} onChange={(e) => set({ quote: e.target.value } as any)} placeholder="“…”" /></L><L t="Attribution"><input className="field" value={slide.attribution || ""} onChange={(e) => set({ attribution: e.target.value } as any)} placeholder="— Name" /></L></div>);
    case "image":
      return (<div className="space-y-3"><L t="Image URL"><input className="field" value={slide.url} onChange={(e) => set({ url: e.target.value } as any)} placeholder="https://…" /></L><L t="Caption"><input className="field" value={slide.caption || ""} onChange={(e) => set({ caption: e.target.value } as any)} /></L>{slide.url && <img src={slide.url} alt="" className="mt-2 max-h-48 rounded-lg border border-line object-contain" />}</div>);
    case "cloud":
      return (<div className="space-y-3"><div className="rounded-xl border border-line bg-mist p-3 text-sm text-slate-600">☁️ Live word cloud. When you present this slide, the room joins at <span className="font-mono">/cloud</span> with the code on screen, and their phrases appear live with an AI summary.</div><L t="Question to ask the room"><input className="field" value={slide.question} onChange={(e) => set({ question: e.target.value } as any)} placeholder="In one word, how does AI make you feel?" /></L></div>);
    case "photo":
      return (<div className="space-y-3"><div className="rounded-xl border border-line bg-mist p-3 text-sm text-slate-600">📷 Room photo + AI. The room adds photos to a prompt; AI reacts on the slide.</div><L t="Photo prompt"><input className="field" value={slide.prompt} onChange={(e) => set({ prompt: e.target.value } as any)} placeholder="Show us your workspace." /></L></div>);
  }
}

function BulletEditor({ bullets, onChange }: { bullets: string[]; onChange: (b: string[]) => void }) {
  return (
    <div className="space-y-2">
      {bullets.map((b, i) => (
        <div key={i} className="flex gap-2">
          <input className="field flex-1" value={b} onChange={(e) => { const n = [...bullets]; n[i] = e.target.value; onChange(n); }} placeholder={`Point ${i + 1}`} />
          <button onClick={() => onChange(bullets.filter((_, k) => k !== i))} className="btn-ghost px-2 text-slate-400">✕</button>
        </div>
      ))}
      <button onClick={() => onChange([...bullets, ""])} className="text-sm font-semibold text-ai hover:underline">+ Add bullet</button>
    </div>
  );
}
function L({ t, children }: { t: string; children: React.ReactNode }) { return <div><label className="lbl">{t}</label>{children}</div>; }
