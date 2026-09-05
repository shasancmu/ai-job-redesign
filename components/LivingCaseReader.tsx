"use client";

// Generic renderer for a CaseGenome — the reusable "living case" reader. Any
// case (hand-authored in lib/cases, or AI-generated at /cases/new) renders here.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { CaseGenome, CaseBeat, CaseExhibit } from "@/lib/cases/types";

/* ---------- light markdown: [label](url), *italic*, **bold** ---------- */
function rich(md: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(md))) {
    if (m.index > last) out.push(md.slice(last, m.index));
    if (m[1]) out.push(<a key={i++} href={m[2]} target="_blank" rel="noopener noreferrer" className="font-medium text-sky underline decoration-sky/30 underline-offset-2 hover:decoration-sky">{m[1]}</a>);
    else if (m[3]) out.push(<strong key={i++}>{m[3]}</strong>);
    else if (m[4]) out.push(<em key={i++}>{m[4]}</em>);
    last = re.lastIndex;
  }
  if (last < md.length) out.push(md.slice(last));
  return out;
}

function Video({ id, title }: { id: string; title: string }) {
  return (
    <figure className="my-6">
      <div className="relative w-full overflow-hidden rounded-xl border border-line bg-black" style={{ paddingBottom: "56.25%" }}>
        <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`} title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" />
      </div>
      <figcaption className="mt-2 text-xs text-slate-400">▶ {title} · YouTube</figcaption>
    </figure>
  );
}

function Deeper({ label, body }: { label: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-5 overflow-hidden rounded-xl border border-line bg-mist/40">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-mist">
        <span className={"grid h-6 w-6 flex-none place-items-center rounded-full bg-ink text-white transition-transform " + (open ? "rotate-45" : "")}>+</span>
        <span className="text-sm font-semibold text-ink">Go deeper — {label}</span>
        <span className="ml-auto font-mono text-[11px] uppercase tracking-wide text-slate-400">{open ? "close" : "expand"}</span>
      </button>
      {open && <div className="border-t border-line px-5 py-4 text-[15px] leading-relaxed text-slate2">{rich(body)}</div>}
    </div>
  );
}

function Exhibit({ ex }: { ex: CaseExhibit }) {
  const [hover, setHover] = useState<number>(Math.floor(ex.points.length / 2));
  const path = ex.points.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  const first = ex.points[0], last = ex.points[ex.points.length - 1];
  return (
    <div className="my-6 rounded-xl border border-line bg-white p-5">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-slate-400">Exhibit · {ex.title} {ex.caption && <span className="text-slate-300">({ex.caption})</span>}</div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-44 w-full">
        <defs><linearGradient id={`g-${ex.title}`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="var(--sage)" stopOpacity="0.15" /><stop offset="1" stopColor="var(--sage)" stopOpacity="0.5" /></linearGradient></defs>
        <path d={`${path} L ${last.x} 100 L ${first.x} 100 Z`} fill={`url(#g-${ex.title})`} />
        <path d={path} fill="none" stroke="var(--sage)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        {ex.points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hover === i ? 2.6 : 1.8} fill={hover === i ? "var(--ink)" : "var(--sage)"} vectorEffect="non-scaling-stroke" style={{ cursor: "pointer" }} onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ex.points.map((p, i) => (
          <button key={i} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}
            className={"rounded-full px-2.5 py-1 font-mono text-[11px] transition " + (hover === i ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>{p.label}</button>
        ))}
      </div>
      <p className="mt-2 text-sm text-slate2"><b className="text-ink">{ex.points[hover].label}</b> — {ex.points[hover].note}</p>
    </div>
  );
}

function TeachNote({ md }: { md: string }) {
  return (
    <div className="my-5 rounded-xl border border-clay/30 bg-clay/5 p-4">
      <div className="font-mono text-[11px] uppercase tracking-wide text-clay">✎ Teaching note</div>
      <p className="mt-1.5 text-[15px] leading-relaxed text-slate2">{rich(md)}</p>
    </div>
  );
}

function BeatBlock({ beat, teaching }: { beat: CaseBeat; teaching: boolean }) {
  return (
    <>
      <div className="mb-4 mt-14">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-sage-soft font-serif text-lg font-bold text-sage">{beat.n}</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-slate-400">{beat.kicker}</span>
        </div>
        <h2 className="mt-3 text-[26px] font-bold leading-tight tracking-tight text-ink">{beat.title}</h2>
      </div>
      <p className="text-[17px] leading-relaxed text-ink/90">{rich(beat.body)}</p>
      {beat.video && <Video id={beat.video.youtubeId} title={beat.video.title} />}
      {beat.exhibit && <Exhibit ex={beat.exhibit} />}
      {beat.deeper?.map((d, i) => <Deeper key={i} label={d.label} body={d.body} />)}
      {teaching && beat.teach && <TeachNote md={beat.teach} />}
    </>
  );
}

/* ---------- commit gate ---------- */
function Commit({ genome, committed, onCommit }: { genome: CaseGenome; committed: { k: string; c: number } | null; onCommit: (k: string, c: number) => void }) {
  const [k, setK] = useState(committed?.k || "");
  const [c, setC] = useState(committed?.c ?? 60);
  if (committed) {
    const chosen = genome.commitOptions.find((o) => o.k === committed.k);
    return (
      <div className="my-6 rounded-2xl border border-sage/40 bg-sage-soft/50 p-5">
        <div className="font-mono text-[11px] uppercase tracking-wide text-sage">Your call is on record</div>
        <p className="mt-2 text-lg font-semibold text-ink">{chosen?.label} <span className="text-sm font-normal text-slate2">· {committed.c}% confident</span></p>
        <p className="mt-1 text-sm text-slate2">Now scroll on — the reveal is unlocked. In the full living case, the protagonist would spend the next ten minutes pressuring exactly this decision.</p>
      </div>
    );
  }
  return (
    <div className="my-6 rounded-2xl border-2 border-ink/10 bg-white p-5 shadow-sm">
      <div className="font-mono text-[11px] uppercase tracking-wide text-clay">◆ Make the call before you read on</div>
      <h3 className="mt-2 text-xl font-bold text-ink">{genome.commitPrompt}</h3>
      <p className="mt-1 text-sm text-slate2">No fence-sitting — go on record under real uncertainty, the way the job demands. This unlocks what actually happened.</p>
      <div className="mt-4 space-y-2">
        {genome.commitOptions.map((o) => (
          <button key={o.k} onClick={() => setK(o.k)} className={"block w-full rounded-xl border p-3 text-left transition " + (k === o.k ? "border-ink bg-mist" : "border-line hover:border-slate-300")}>
            <div className="font-semibold text-ink">{o.label}</div>
            <div className="mt-0.5 text-sm text-slate2">{o.blurb}</div>
          </button>
        ))}
      </div>
      <div className="mt-4">
        <label className="lbl flex items-center justify-between">Confidence <span className="font-mono text-sm text-ink">{c}%</span></label>
        <input type="range" min={50} max={100} value={c} onChange={(e) => setC(Number(e.target.value))} className="mt-1 w-full accent-sage" />
      </div>
      <button disabled={!k} onClick={() => onCommit(k, c)} className="btn-primary mt-4 w-full disabled:opacity-40">{k ? "Commit my call & reveal what happened" : "Pick an option first"}</button>
    </div>
  );
}

function Interrogate({ qa, protagonist }: { qa: { q: string; a: string }[]; protagonist: string }) {
  const who = protagonist.split(",")[0];
  return (
    <div className="my-6 rounded-2xl border border-line bg-mist/40 p-5">
      <div className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Preview · in the living case, you interrogate the protagonist</div>
      <div className="mt-3 space-y-3">
        {qa.map((x, i) => (
          <div key={i} className="space-y-2">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-3.5 py-2 text-sm text-white">{x.q}</div>
            <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm text-slate2 shadow-sm"><b className="text-ink">AI {who} · </b>{x.a}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 opacity-60">
        <input disabled placeholder="Ask a harder question…" className="field flex-1" />
        <button disabled className="btn-ghost">Ask</button>
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">The protagonist concedes to a sharp question and spins a vague one — and never tells you if the bet works. (Live in the full module.)</p>
    </div>
  );
}

/* ---------- the reader ---------- */
export default function LivingCaseReader({ genome, preview }: { genome: CaseGenome; preview?: boolean }) {
  const [progress, setProgress] = useState(0);
  const [committed, setCommitted] = useState<{ k: string; c: number } | null>(null);
  const [teaching, setTeaching] = useState(false);
  const revealRef = useRef<HTMLDivElement>(null);
  const storeKey = useMemo(() => `case:${genome.slug}:call`, [genome.slug]);

  useEffect(() => {
    if (preview) return;
    try { const s = localStorage.getItem(storeKey); if (s) setCommitted(JSON.parse(s)); } catch {}
  }, [storeKey, preview]);
  useEffect(() => {
    const onScroll = () => { const h = document.documentElement; const max = h.scrollHeight - h.clientHeight; setProgress(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0); };
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const commit = (k: string, c: number) => {
    const v = { k, c }; setCommitted(v);
    if (!preview) { try { localStorage.setItem(storeKey, JSON.stringify(v)); } catch {} }
    setTimeout(() => revealRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="fixed inset-x-0 top-0 z-30 h-1 bg-transparent"><div className="h-full bg-sage transition-[width] duration-150" style={{ width: `${progress}%` }} /></div>
      <div className="sticky top-0 z-20 border-b border-line/70 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-2.5">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Superadditive</Link>
          <span className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Living Case{preview ? " · preview" : ""}</span>
          <button onClick={() => setTeaching((t) => !t)} className={"rounded-full px-3 py-1 text-xs font-semibold transition " + (teaching ? "bg-clay text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>{teaching ? "Teaching notes on" : "Teaching notes"}</button>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-5 pb-24">
        {genome.generated && (
          <div className="mt-6 rounded-xl border border-amber/40 bg-amber/5 p-3 text-sm text-slate2">
            <b className="text-ink">Draft — verify before you teach it.</b> This case was AI-generated from your prompt. Check every claim and swap in real, verified videos and sources before publishing to a cohort.
          </div>
        )}
        <header className="pt-12">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-clay">{genome.eyebrow}</div>
          <h1 className="mt-3 font-serif text-[clamp(2rem,6vw,3.1rem)] font-bold leading-[1.08] tracking-tight text-ink">{genome.title}</h1>
          <p className="mt-4 text-lg text-slate2">{rich(genome.dek)}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[12px] text-slate-400">
            <span>PROTAGONIST · {genome.protagonist}</span>
            <span>DECISION · {genome.decision}</span>
            <span>{genome.meta}</span>
          </div>
          {teaching && genome.teachingIntro && <TeachNote md={genome.teachingIntro} />}
        </header>

        {genome.heroImage?.url && (
          <figure className="my-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={genome.heroImage.url} alt={genome.heroImage.alt || genome.title} className="w-full rounded-xl border border-line object-cover" style={{ maxHeight: 420 }} loading="lazy" />
          </figure>
        )}
        {genome.openingVideo && <Video id={genome.openingVideo.youtubeId} title={genome.openingVideo.title} />}

        {genome.situationBeats.map((b, i) => <BeatBlock key={i} beat={b} teaching={teaching} />)}

        <Commit genome={genome} committed={committed} onCommit={commit} />

        <div ref={revealRef}>
          {!committed ? (
            <div className="my-10 rounded-2xl border border-dashed border-line bg-mist/40 p-8 text-center">
              <p className="font-serif text-xl font-bold text-ink">What actually happened is locked. 🔒</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate2">Make your call above to unlock the reveal. (No peeking — the whole point is to commit under uncertainty, like the job does.)</p>
            </div>
          ) : (
            <>
              {genome.revealBeats.map((b, i) => <BeatBlock key={i} beat={b} teaching={teaching} />)}
              {genome.interrogate && genome.interrogate.length > 0 && (
                <>
                  <div className="mb-4 mt-14">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-sage-soft font-serif text-lg font-bold text-sage">✦</span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-slate-400">the living case</span>
                    </div>
                    <h2 className="mt-3 text-[26px] font-bold leading-tight tracking-tight text-ink">Now imagine you could push the protagonist on it.</h2>
                  </div>
                  <p className="text-[17px] leading-relaxed text-ink/90">A document can only tell you what happened. The living version lets you <em>interrogate</em> the protagonist under a hidden truth, <em>query</em> the real data in a console, and watch your decision <em>play forward</em> — graded on judgment, not memory. A taste:</p>
                  <Interrogate qa={genome.interrogate} protagonist={genome.protagonist} />
                </>
              )}
              <div className="my-8 rounded-2xl bg-ink p-6 text-paper">
                <div className="font-mono text-[11px] uppercase tracking-wide" style={{ color: "var(--sage)" }}>What you just experienced</div>
                <p className="mt-2 text-lg font-semibold">A case you read <em>into</em>, not just through.</p>
                <p className="mt-1 text-sm" style={{ color: "#C9C6CE" }}>Real video, real sources, drill-downs where you wanted them, and a decision you had to own before the answer was revealed. That's the floor; the interrogation, the data console, and the consequence engine are the ceiling.</p>
              </div>
            </>
          )}
        </div>

        <section className="mt-14 border-t border-line pt-6">
          <div className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Sources</div>
          <ul className="mt-3 grid gap-1.5 text-sm text-slate2 sm:grid-cols-2">
            {genome.sources.map((s, i) => (
              <li key={i}>· <a href={s.href} target="_blank" rel="noopener noreferrer" className="font-medium text-sky underline decoration-sky/30 underline-offset-2 hover:decoration-sky">{s.label}</a></li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-slate-400">A “living case” · built for discussion{genome.generated ? " · AI-drafted, verify before teaching" : ""}.</p>
        </section>
      </article>
    </main>
  );
}
