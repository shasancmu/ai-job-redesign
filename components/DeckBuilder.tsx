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
      return (<div className="space-y-3"><L t="Image"><ImageUpload url={slide.url} onUrl={(u) => set({ url: u } as any)} /></L><L t="Caption"><input className="field" value={slide.caption || ""} onChange={(e) => set({ caption: e.target.value } as any)} /></L></div>);
    case "quiz":
      return <QuizSlideEditor slide={slide} set={set} />;
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
function ImageUpload({ url, onUrl }: { url: string; onUrl: (u: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); setErr(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/decks/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok && d.url) onUrl(d.url); else setErr(d.error || "Upload failed.");
    } catch { setErr("Upload failed."); }
    setBusy(false);
  }
  return (
    <div className="space-y-2">
      {url ? <img src={url} alt="" className="max-h-48 rounded-lg border border-line object-contain" /> : <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-line text-sm text-slate-400">No image yet</div>}
      <div className="flex items-center gap-2">
        <label className="btn-ghost cursor-pointer text-sm">{busy ? "Uploading…" : url ? "Replace" : "Upload image"}<input type="file" accept="image/*" onChange={pick} className="hidden" disabled={busy} /></label>
        <input className="field flex-1 text-xs" value={url} onChange={(e) => onUrl(e.target.value)} placeholder="…or paste an image URL" />
      </div>
      {err && <p className="text-xs text-clay">{err}</p>}
    </div>
  );
}

function QuizSlideEditor({ slide, set }: { slide: any; set: (p: any) => void }) {
  const qs = slide.questions || [];
  const setQ = (i: number, patch: any) => set({ questions: qs.map((q: any, k: number) => (k === i ? { ...q, ...patch } : q)) });
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-mist p-3 text-sm text-slate-600">🧠 Live quiz. The room answers on their phones (join at <span className="font-mono">/quiz</span>); scores reveal live against the room.</div>
      <div className="flex gap-3">
        <L t="Quiz title"><input className="field" value={slide.title || ""} onChange={(e) => set({ title: e.target.value })} placeholder="Quick check" /></L>
        <div className="w-32"><L t="Time (sec)"><input type="number" className="field" value={slide.timeLimitSec || 180} onChange={(e) => set({ timeLimitSec: Number(e.target.value) })} /></L></div>
      </div>
      <div className="space-y-3">
        {qs.map((q: any, i: number) => (
          <div key={i} className="rounded-xl border border-line p-3">
            <div className="flex gap-2">
              <input className="field flex-1" value={q.prompt} onChange={(e) => setQ(i, { prompt: e.target.value })} placeholder={`Question ${i + 1}`} />
              <button onClick={() => set({ questions: qs.filter((_: any, k: number) => k !== i) })} className="btn-ghost px-2 text-slate-400">✕</button>
            </div>
            <div className="mt-2 space-y-1.5">
              {(q.options || []).map((o: string, j: number) => (
                <label key={j} className="flex items-center gap-2">
                  <input type="radio" name={`ans-${i}`} checked={q.answer === j} onChange={() => setQ(i, { answer: j })} className="accent-[#3F7A52]" title="Mark correct" />
                  <input className="field flex-1 text-sm" value={o} onChange={(e) => setQ(i, { options: q.options.map((x: string, k: number) => (k === j ? e.target.value : x)) })} placeholder={`Option ${String.fromCharCode(65 + j)}`} />
                  {q.options.length > 2 && <button onClick={() => setQ(i, { options: q.options.filter((_: string, k: number) => k !== j), answer: Math.max(0, (q.answer || 0) - (j <= (q.answer || 0) ? 1 : 0)) })} className="px-1 text-slate-300 hover:text-clay">✕</button>}
                </label>
              ))}
              {(q.options || []).length < 5 && <button onClick={() => setQ(i, { options: [...q.options, ""] })} className="text-xs font-semibold text-ai hover:underline">+ Option</button>}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Select the radio for the correct answer.</p>
          </div>
        ))}
        <button onClick={() => set({ questions: [...qs, { prompt: "", options: ["", ""], answer: 0 }] })} className="text-sm font-semibold text-ai hover:underline">+ Add question</button>
      </div>
    </div>
  );
}

function L({ t, children }: { t: string; children: React.ReactNode }) { return <div><label className="lbl">{t}</label>{children}</div>; }
