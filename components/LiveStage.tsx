"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PresenterFX from "@/components/PresenterFX";
import { Aurora } from "@/components/presenterParts";

// The Menti-style stage for the cohort live activities (benchmark, network):
// the same ambient aurora, a persistent join code + QR, fullscreen, and lux
// chrome, wrapping whatever live visualization the activity renders.
export default function LiveStage({
  eyebrow,
  title,
  subtitle,
  code,
  joinHost,
  qrSvg,
  doneHref,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  code: string;
  joinHost: string;
  qrSvg: string;
  doneHref: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    else stageRef.current?.requestFullscreen?.();
  }

  return (
    <div ref={stageRef} className="relative flex min-h-screen flex-col overflow-hidden bg-paper">
      <Aurora />

      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="min-w-0">
          {eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</div>}
          <h1 className="text-2xl font-bold leading-tight text-ink sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate2">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Persistent join code + QR */}
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-line bg-white/80 px-3 py-2 shadow-soft backdrop-blur">
            {qrSvg ? <div className="h-12 w-12 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} /> : null}
            <div className="leading-tight">
              <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{joinHost}</div>
              <div className="font-mono text-xl font-bold tracking-widest text-ink">{code}</div>
            </div>
          </div>
          {actions}
          <button onClick={toggleFull} className="btn-ghost text-sm" title="Fullscreen">{isFull ? "Exit full" : "⤢ Full"}</button>
          {!isFull && <Link href={doneHref} className="btn-ghost text-sm">Done</Link>}
        </div>
      </header>

      <div className="relative z-10 flex-1 px-6 pb-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </div>

      <PresenterFX />
    </div>
  );
}
