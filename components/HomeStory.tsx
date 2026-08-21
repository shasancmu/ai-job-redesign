"use client";

import { useEffect, useRef, useState } from "react";

const ACCENT = "#3F7A52"; // sage

const STEPS = [
  {
    eyebrow: "Step 1",
    title: "Pick something you're actually working on",
    body: "Your job, a workflow, a career move, a strategy, a hard conversation, a negotiation. Every exercise starts from your real situation, not a case study.",
  },
  {
    eyebrow: "Step 2",
    title: "An AI runs it with you",
    body: "It interviews you, plays a partner or a tough counterpart, or coaches you — adapting to what you actually say, one focused step at a time. You do the thinking; it does the structure.",
  },
  {
    eyebrow: "Step 3",
    title: "You leave with something you keep",
    body: "Not a grade — a real artifact. A plan, a redesigned role, a map, a sharpened story, a debrief you can act on tomorrow. It's yours.",
  },
];

function Frame({ children, label = "superadditive.app" }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
      <div className="flex items-center gap-1.5 border-b border-line bg-mist px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="ml-2 rounded bg-white px-2 py-0.5 text-[10px] text-slate-400">{label}</span>
      </div>
      {children}
    </div>
  );
}

function PickVisual() {
  const cards = [
    { emoji: "🧭", tint: "bg-sage-soft" },
    { emoji: "🤝", tint: "bg-amber-soft" },
    { emoji: "🔭", tint: "bg-sky-soft" },
    { emoji: "🎙️", tint: "bg-clay-soft" },
  ];
  return (
    <Frame>
      <div className="p-5">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Choose an exercise</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {cards.map((c, i) => (
            <div key={i} className={"rounded-xl border border-line p-3 " + (i === 0 ? "ring-2 ring-sage" : "")}>
              <div className={"flex h-8 w-8 items-center justify-center rounded-lg text-lg " + c.tint}>{c.emoji}</div>
              <div className="mt-2 h-2.5 w-4/5 rounded bg-ink/80" />
              <div className="mt-1.5 h-2 w-full rounded bg-slate-200" />
              <div className="mt-1 h-2 w-2/3 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function ChatVisual() {
  return (
    <Frame>
      <div className="space-y-2.5 p-5">
        <div className="flex justify-start"><div className="max-w-[80%] rounded-2xl bg-slate-100 px-3.5 py-2 text-xs text-slate-700">Walk me through the last time this really worked. What did you do?</div></div>
        <div className="flex justify-end"><div className="max-w-[80%] rounded-2xl px-3.5 py-2 text-xs text-white" style={{ background: "#14283A" }}>Honestly, when I stopped doing the reporting myself and…</div></div>
        <div className="flex justify-start"><div className="max-w-[80%] rounded-2xl bg-slate-100 px-3.5 py-2 text-xs text-slate-700">Good — so what only you could judge there was…?</div></div>
        <div className="flex justify-end"><div className="rounded-2xl bg-slate-200 px-3.5 py-2 text-xs text-slate-400">…</div></div>
      </div>
    </Frame>
  );
}

function KeepVisual() {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
        <div className="p-5 text-white" style={{ background: ACCENT }}>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Your plan</div>
          <div className="mt-1.5 h-3.5 w-4/5 rounded bg-white/90" />
        </div>
        <div className="space-y-3 p-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: ACCENT }}>{i + 1}</span>
              <div className="flex-1">
                <div className="h-2.5 w-3/4 rounded bg-ink/80" />
                <div className="mt-1.5 h-2 w-full rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const VISUALS = [<PickVisual key="p" />, <ChatVisual key="c" />, <KeepVisual key="k" />];

export default function HomeStory() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i)); }),
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="hidden lg:block">
        <div className="sticky top-24 flex h-[80vh] items-center">
          <div className="relative h-[460px] w-full">
            {VISUALS.map((v, i) => (
              <div key={i} className={"absolute inset-0 flex items-center transition-all duration-500 " + (active === i ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0")}>
                <div className="w-full">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        {STEPS.map((s, i) => (
          <div key={i} data-i={i} ref={(el) => { refs.current[i] = el; }} className="flex min-h-[85vh] flex-col justify-center">
            <div className="mb-6 lg:hidden">{VISUALS[i]}</div>
            <div className={"transition-opacity duration-300 " + (active === i ? "opacity-100" : "lg:opacity-40")}>
              <div className="text-sm font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>{s.eyebrow}</div>
              <h3 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{s.title}</h3>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-slate2">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
