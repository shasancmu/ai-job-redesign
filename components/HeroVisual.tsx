// A small, light hero mark for "superadditive": two thin luminous lines — one
// sage (human), one sky (AI) — flow in from the left and merge into a single
// brighter, warmer line that continues on, worth more than either alone. Soft
// glints of light travel the lines and combine at the junction. Pure SVG + CSS,
// no dark shapes; stops for prefers-reduced-motion.
const P_SKY = "M 6 64 C 74 64 108 104 150 120";
const P_SAGE = "M 6 176 C 74 176 108 136 150 120";
const P_OUT = "M 150 120 C 206 120 250 116 296 102";

export default function HeroVisual() {
  return (
    <div className="hero-lines" aria-hidden>
      <svg viewBox="0 0 300 240" className="h-full w-full" fill="none">
        <defs>
          <linearGradient id="hl-sky" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--sky)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--sky)" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="hl-sage" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--sage)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--sage)" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="hl-out" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--sky)" stopOpacity="0.9" />
            <stop offset="55%" stopColor="var(--sage)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--amber)" stopOpacity="0.95" />
          </linearGradient>
          <radialGradient id="hl-bloom" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--amber)" stopOpacity="0.5" />
            <stop offset="55%" stopColor="var(--amber)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--amber)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* soft bloom where they combine */}
        <circle cx="150" cy="120" r="46" fill="url(#hl-bloom)" className="hl-breathe" />

        {/* the lines */}
        <path d={P_SKY} className="hl-line hl-sky" stroke="url(#hl-sky)" />
        <path d={P_SAGE} className="hl-line hl-sage" stroke="url(#hl-sage)" />
        <path d={P_OUT} className="hl-line hl-out" stroke="url(#hl-out)" />

        {/* glints of light travelling the lines and combining */}
        <circle r="2.6" className="hl-glint" style={{ color: "var(--sky)", offsetPath: `path("${P_SKY}")` } as any} fill="currentColor" />
        <circle r="2.6" className="hl-glint" style={{ color: "var(--sage)", offsetPath: `path("${P_SAGE}")` } as any} fill="currentColor" />
        <circle r="3.2" className="hl-glint hl-glint-out" style={{ color: "var(--amber)", offsetPath: `path("${P_OUT}")` } as any} fill="currentColor" />

        <style>{`
          .hero-lines {
            position: absolute; right: 0; top: 52%; transform: translateY(-50%);
            width: min(36vw, 440px); aspect-ratio: 300 / 240; pointer-events: none; z-index: 1;
          }
          .hl-line { fill: none; stroke-width: 2; stroke-linecap: round; }
          .hl-sky  { filter: drop-shadow(0 0 5px rgba(78,121,201,.45)); }
          .hl-sage { filter: drop-shadow(0 0 5px rgba(63,122,82,.45)); }
          .hl-out  { stroke-width: 2.6; filter: drop-shadow(0 0 7px rgba(201,138,43,.5)); }

          .hl-glint { offset-rotate: 0deg; filter: drop-shadow(0 0 6px currentColor); animation: hl-flow 4.2s cubic-bezier(.5,0,.5,1) infinite; }
          .hl-glint-out { animation-duration: 3.4s; }
          @keyframes hl-flow { 0% { offset-distance: 0%; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { offset-distance: 100%; opacity: 0; } }

          .hl-breathe { transform-box: view-box; transform-origin: center; animation: hl-breathe 6s ease-in-out infinite; }
          @keyframes hl-breathe { 0%,100% { opacity: .7; transform: scale(.94); } 50% { opacity: 1; transform: scale(1.06); } }

          @media (prefers-reduced-motion: reduce) { .hl-glint { display: none; } .hl-breathe { animation: none; } }
          @media (max-width: 1023px) { .hero-lines { display: none; } }
        `}</style>
      </svg>
    </div>
  );
}
