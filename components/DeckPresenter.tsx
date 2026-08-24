"use client";

import { useCallback, useEffect, useState } from "react";
import { activityPresentPath, type Slide } from "@/lib/deckTypes";

export default function DeckPresenter({ slides, exitHref = "/decks" }: { slides: Slide[]; exitHref?: string }) {
  const [i, setI] = useState(0);
  const n = slides.length;
  const next = useCallback(() => setI((c) => Math.min(n - 1, c + 1)), [n]);
  const prev = useCallback(() => setI((c) => Math.max(0, c - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const fullscreen = () => { const el = document.documentElement as any; if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.(); };

  const s = slides[i];
  const path = activityPresentPath(s);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {path ? (
          <iframe key={s.id} src={path} className="h-full w-full border-0" title="Live activity" />
        ) : (
          <StaticSlide slide={s} />
        )}
        {/* click zones for tap navigation */}
        {!path && <button aria-label="Previous" onClick={prev} className="absolute inset-y-0 left-0 w-1/4 cursor-w-resize" />}
        {!path && <button aria-label="Next" onClick={next} className="absolute inset-y-0 right-0 w-1/4 cursor-e-resize" />}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line bg-white/95 px-4 py-2">
        <a href={exitHref} className="text-sm text-slate2 hover:text-ink">Exit</a>
        <div className="flex items-center gap-4 text-slate-500">
          <button onClick={prev} disabled={i === 0} className="rounded px-2 py-1 text-lg disabled:opacity-30 hover:text-ink">←</button>
          <span className="text-sm tabular-nums">{i + 1} / {n}</span>
          <button onClick={next} disabled={i === n - 1} className="rounded px-2 py-1 text-lg disabled:opacity-30 hover:text-ink">→</button>
        </div>
        <button onClick={fullscreen} className="text-sm text-slate2 hover:text-ink" title="Fullscreen">⛶</button>
      </div>
    </div>
  );
}

function StaticSlide({ slide }: { slide: Slide }) {
  const wrap = "flex h-full w-full flex-col justify-center px-[8vw] py-[6vh]";
  switch (slide.type) {
    case "title":
      return <div className={wrap + " items-center text-center"}><h1 className="text-[clamp(2rem,7vw,5rem)] font-bold leading-tight text-ink">{slide.title}</h1>{slide.subtitle && <p className="mt-6 text-[clamp(1rem,2.5vw,1.8rem)] text-slate-500">{slide.subtitle}</p>}</div>;
    case "section":
      return <div className={wrap + " items-start"}><div className="h-2 w-24 rounded bg-sage" /><h1 className="mt-6 text-[clamp(2rem,6vw,4.5rem)] font-bold leading-tight text-ink">{slide.title}</h1></div>;
    case "bullets":
      return <div className={wrap + " items-start"}>{slide.title && <h2 className="mb-8 text-[clamp(1.5rem,4vw,3rem)] font-bold text-ink">{slide.title}</h2>}<ul className="space-y-5">{slide.bullets.filter(Boolean).map((b, k) => <li key={k} className="flex gap-4 text-[clamp(1.1rem,2.6vw,2rem)] text-slate-700"><span className="mt-[0.4em] h-2.5 w-2.5 flex-none rounded-full bg-sage" />{b}</li>)}</ul></div>;
    case "text":
      return <div className={wrap + " items-start"}>{slide.title && <h2 className="mb-6 text-[clamp(1.5rem,4vw,3rem)] font-bold text-ink">{slide.title}</h2>}<p className="max-w-[46ch] whitespace-pre-wrap text-[clamp(1.1rem,2.6vw,2rem)] leading-relaxed text-slate-700">{slide.body}</p></div>;
    case "quote":
      return <div className={wrap + " items-center text-center"}><p className="max-w-[24ch] text-[clamp(1.6rem,5vw,3.6rem)] font-semibold italic leading-tight text-ink">“{slide.quote}”</p>{slide.attribution && <p className="mt-6 text-[clamp(1rem,2.2vw,1.5rem)] text-slate-500">{slide.attribution}</p>}</div>;
    case "image":
      return <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-[4vh]">{slide.url ? <img src={slide.url} alt={slide.caption || ""} className="max-h-[82vh] max-w-full rounded-xl object-contain" /> : <div className="text-slate-300">No image</div>}{slide.caption && <p className="text-[clamp(0.9rem,1.8vw,1.3rem)] text-slate-500">{slide.caption}</p>}</div>;
    case "cards": {
      const cards = (slide.cards || []).filter((c) => c.heading || c.text);
      const cols = cards.length <= 2 ? cards.length : cards.length <= 4 ? 2 : 3;
      return (
        <div className={wrap}>
          {slide.title && <h2 className="mb-[4vh] text-[clamp(1.4rem,4vw,2.8rem)] font-bold text-ink">{slide.title}</h2>}
          <div className="grid gap-4 sm:gap-6" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {cards.map((c, k) => (
              <div key={k} className="rounded-2xl border border-line bg-mist/40 p-[clamp(0.8rem,2vw,1.6rem)]">
                {c.icon && <div className="text-[clamp(1.6rem,3.5vw,2.6rem)] leading-none">{c.icon}</div>}
                <div className="mt-3 text-[clamp(1rem,2.2vw,1.6rem)] font-bold text-ink">{c.heading}</div>
                {c.text && <div className="mt-1.5 text-[clamp(0.85rem,1.5vw,1.15rem)] leading-snug text-slate-600">{c.text}</div>}
              </div>
            ))}
          </div>
        </div>
      );
    }
    default:
      return <div className={wrap + " items-center justify-center text-slate-300"}>Slide</div>;
  }
}
