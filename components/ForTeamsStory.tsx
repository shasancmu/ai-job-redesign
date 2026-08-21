"use client";

import { useEffect, useRef, useState } from "react";

const ACCENT = "#4E79C9"; // stand-in brand color for the mockups

const STEPS = [
  {
    eyebrow: "Step 1",
    title: "We make it unmistakably yours",
    body: "Your logo, your colors, your own address — superadditive.app/your-org. Participants land in a private, branded space that feels like an extension of your program, not a third-party tool.",
  },
  {
    eyebrow: "Step 2",
    title: "You bring your people in",
    body: "Invite a cohort by email in seconds. Appoint instructors to run their own sections, keep everyone in your master group, and manage the whole community from one place — you only ever see your organization's people.",
  },
  {
    eyebrow: "Step 3",
    title: "They engage — and you see it roll up",
    body: "Participants work through AI-run exercises and each leaves with something concrete. You watch completion and insight roll up across the cohort, live, so your program stays alive long after the last session.",
  },
];

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
      <div className="flex items-center gap-1.5 border-b border-line bg-mist px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="ml-2 rounded bg-white px-2 py-0.5 text-[10px] text-slate-400">superadditive.app/your-org</span>
      </div>
      {children}
    </div>
  );
}

function BrandVisual() {
  return (
    <Frame>
      <div className="p-6" style={{ background: `linear-gradient(135deg, ${ACCENT}14, white)` }}>
        <div className="flex h-9 w-24 items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ background: ACCENT }}>YOUR LOGO</div>
        <div className="mt-6 h-5 w-4/5 rounded bg-ink/85" />
        <div className="mt-2 h-5 w-3/5 rounded bg-ink/85" />
        <div className="mt-4 h-3 w-11/12 rounded bg-slate-300" />
        <div className="mt-1.5 h-3 w-3/4 rounded bg-slate-300" />
        <div className="mt-6 flex gap-2">
          <div className="h-8 w-32 rounded-full" style={{ background: ACCENT }} />
          <div className="h-8 w-20 rounded-full border border-line bg-white" />
        </div>
      </div>
    </Frame>
  );
}

function PeopleVisual() {
  const rows = [
    { init: "SH", role: "Director", tone: "bg-ink text-white" },
    { init: "AL", role: "Instructor", tone: "bg-sky-soft text-sky" },
    { init: "JL", role: "Member", tone: "bg-mist text-slate2" },
    { init: "SR", role: "Member", tone: "bg-mist text-slate2" },
  ];
  return (
    <Frame>
      <div className="p-5">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Your people</div>
        <div className="mt-3 space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-lg border border-line p-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: ACCENT }}>{r.init}</span>
              <div className="flex-1">
                <div className="h-2.5 w-28 rounded bg-slate-300" />
                <div className="mt-1 h-2 w-20 rounded bg-slate-200" />
              </div>
              <span className={"rounded-full px-2 py-0.5 text-[9px] font-medium " + r.tone}>{r.role}</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function EngageVisual() {
  const bars = [72, 58, 84, 40, 66];
  return (
    <div className="mx-auto w-full max-w-md space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-line bg-white p-3 shadow-soft">
            <div className="h-7 w-7 rounded-lg bg-sage-soft" />
            <div className="mt-2 h-2.5 w-4/5 rounded bg-ink/80" />
            <div className="mt-1.5 h-2 w-full rounded bg-slate-200" />
            <div className="mt-1 h-2 w-2/3 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-line bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Cohort progress</div>
          <div className="text-[10px] text-slate-400">live</div>
        </div>
        <div className="mt-3 flex h-24 items-end gap-2">
          {bars.map((b, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${b}%`, background: `linear-gradient(to top, ${ACCENT}, ${ACCENT}99)` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const VISUALS = [<BrandVisual key="b" />, <PeopleVisual key="p" />, <EngageVisual key="e" />];

export default function ForTeamsStory() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // The step crossing the viewport's center line is the active one. A
    // zero-height root (top/bottom margins of -50%) makes that a clean, single
    // hit as you scroll, so the sticky visual swaps at the right moment.
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i)); }),
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* Sticky, morphing visual (desktop) */}
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

      {/* Scrolling steps */}
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
