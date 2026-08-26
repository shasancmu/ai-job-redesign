"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import PlanView from "@/components/PlanView";
import ShareReport from "@/components/ShareReport";

const SAGE = "#3F7A52";
const GOLD = "#CE8F2C";

// The gift a partner built for you, delivered as a wrapped present you unwrap.
export default function GiftReveal({
  code,
  giverName,
  recipientName,
  plan,
  textRedesign,
  realJob,
}: {
  code: string;
  giverName: string;
  recipientName: string | null;
  plan: any | null;
  textRedesign: string;
  realJob: string;
}) {
  const [opened, setOpened] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // A revisit skips straight to the opened gift.
  useEffect(() => {
    try {
      if (localStorage.getItem(`gift-opened-${code}`) === "1") setOpened(true);
    } catch {
      /* storage blocked: just show the wrap */
    }
  }, [code]);

  function unwrap() {
    setOpened(true);
    try {
      localStorage.setItem(`gift-opened-${code}`, "1");
    } catch {
      /* ignore */
    }
    burstConfetti(canvasRef.current);
  }

  return (
    <main className="min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50" />
      {!opened ? (
        <Wrapped giverName={giverName} onUnwrap={unwrap} />
      ) : (
        <Opened
          code={code}
          giverName={giverName}
          recipientName={recipientName}
          plan={plan}
          textRedesign={textRedesign}
          realJob={realJob}
        />
      )}
    </main>
  );
}

// ---- The wrapped present ---------------------------------------------------
function Wrapped({ giverName, onUnwrap }: { giverName: string; onUnwrap: () => void }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full opacity-50"
        style={{ background: "radial-gradient(circle at 50% 50%, rgba(206,143,44,.35), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-20 h-[360px] w-[360px] rounded-full opacity-40"
        style={{ background: "radial-gradient(circle at 50% 50%, rgba(63,122,82,.30), transparent 70%)" }}
      />

      <div className="eyebrow relative">A gift for you</div>
      <h1 className="display relative mt-3 max-w-xl text-3xl text-ink sm:text-4xl">
        {giverName} reimagined your role
      </h1>
      <p className="relative mt-3 max-w-md text-slate2">
        They spent this session redesigning your job around what only you can do, and what AI can take off your
        plate. Unwrap it.
      </p>

      <button
        onClick={onUnwrap}
        aria-label="Unwrap your gift"
        className="group relative mt-10 outline-none"
        style={{ animation: "giftFloat 3s ease-in-out infinite" }}
      >
        <GiftBox />
      </button>

      <button onClick={onUnwrap} className="btn-primary relative mt-8">
        Unwrap your gift
      </button>
    </div>
  );
}

// A CSS gift box: gold body, sage ribbons, a small bow.
function GiftBox() {
  return (
    <div className="relative mx-auto h-[150px] w-[170px] transition-transform duration-300 group-hover:-translate-y-1">
      {/* body */}
      <div
        className="absolute bottom-0 left-1/2 h-[112px] w-[150px] -translate-x-1/2 rounded-b-xl rounded-t-md shadow-lg"
        style={{ background: `linear-gradient(160deg, ${GOLD}, #b8791f)` }}
      />
      {/* lid */}
      <div
        className="absolute left-1/2 top-[26px] h-[34px] w-[166px] -translate-x-1/2 rounded-lg shadow-md"
        style={{ background: `linear-gradient(160deg, #d89a37, ${GOLD})` }}
      />
      {/* vertical ribbon */}
      <div className="absolute bottom-0 left-1/2 top-[26px] w-[26px] -translate-x-1/2" style={{ background: SAGE }} />
      {/* bow */}
      <div className="absolute left-1/2 top-[2px] -translate-x-1/2">
        <div className="flex items-center">
          <span
            className="block h-8 w-9 -rotate-12 rounded-full border-4"
            style={{ borderColor: SAGE, background: "transparent" }}
          />
          <span
            className="-ml-2 block h-8 w-9 rotate-12 rounded-full border-4"
            style={{ borderColor: SAGE, background: "transparent" }}
          />
        </div>
        <div className="mx-auto -mt-4 h-4 w-4 rounded-full" style={{ background: SAGE }} />
      </div>
    </div>
  );
}

// ---- The opened gift -------------------------------------------------------
function Opened({
  code,
  giverName,
  recipientName,
  plan,
  textRedesign,
  realJob,
}: {
  code: string;
  giverName: string;
  recipientName: string | null;
  plan: any | null;
  textRedesign: string;
  realJob: string;
}) {
  return (
    <div style={{ animation: "giftReveal .6s ease-out both" }}>
      {/* Gift header */}
      <section className="border-b border-line">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-2">
            <ShareReport code={code} title="A reimagined role" text="A reimagined role, designed for me on Superadditive:" />
            <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">
              ← Done
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pt-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-1.5 text-sm">
          <span aria-hidden>🎁</span>
          <span className="font-medium text-ink">
            {recipientName ? `For ${recipientName}, from ${giverName}` : `A gift from ${giverName}`}
          </span>
        </div>
      </section>

      {plan ? (
        <section className="mx-auto max-w-4xl px-6 py-8">
          <PlanView plan={plan} code={code} embedded />
        </section>
      ) : (
        <TextGift giverName={giverName} textRedesign={textRedesign} realJob={realJob} />
      )}
    </div>
  );
}

// Fallback when the giver wrote a redesign but didn't build the full plan.
function TextGift({ giverName, textRedesign, realJob }: { giverName: string; textRedesign: string; realJob: string }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <div className="card overflow-hidden p-0">
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${SAGE}, ${GOLD})` }} />
        <div className="p-6">
          <div className="eyebrow">Your reimagined role</div>
          {realJob && <p className="mt-3 text-sm italic text-slate2">The real value {giverName} saw: {realJob}</p>}
          <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed text-ink">{textRedesign}</p>
        </div>
      </div>
      <div className="mt-8 text-center text-sm text-slate2">
        <button onClick={() => window.print()} className="btn-ghost">
          ↧ Save as PDF / print
        </button>
      </div>
    </section>
  );
}

// ---- Confetti --------------------------------------------------------------
function burstConfetti(canvas: HTMLCanvasElement | null) {
  if (!canvas || typeof window === "undefined") return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);
  const colors = [SAGE, GOLD, "#ffffff", "#6BBA7E", "#E8B45E"];
  const parts = Array.from({ length: 150 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 90,
    y: H / 2 - 30,
    vx: (Math.random() - 0.5) * 11,
    vy: Math.random() * -9 - 4,
    g: 0.22 + Math.random() * 0.13,
    s: 5 + Math.random() * 6,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.32,
    color: colors[(Math.random() * colors.length) | 0],
  }));
  const start = performance.now();
  function frame(now: number) {
    const t = now - start;
    ctx!.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.rot += p.vr;
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.globalAlpha = Math.max(0, 1 - t / 1900);
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
      ctx!.restore();
    }
    if (t < 1900) requestAnimationFrame(frame);
    else ctx!.clearRect(0, 0, W, H);
  }
  requestAnimationFrame(frame);
}

const KEYFRAMES = `
@keyframes giftFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
@keyframes giftReveal { from { opacity: 0; transform: translateY(10px) scale(.98) } to { opacity: 1; transform: none } }
@media (prefers-reduced-motion: reduce) {
  [style*="giftFloat"], [style*="giftReveal"] { animation: none !important; }
}
`;
