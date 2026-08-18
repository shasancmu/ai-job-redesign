// A calm orbital system for the hero — glowing nodes in the brand palette
// tracing concentric orbits around a soft core, evoking "human + AI in orbit,
// worth more together." Pure SVG + CSS transforms: no JS, no libraries, and it
// stops for prefers-reduced-motion.
export default function HeroVisual() {
  return (
    <div className="hero-orbits" aria-hidden>
      <svg viewBox="-160 -160 320 320" className="h-full w-full">
        <defs>
          <radialGradient id="hv-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--sky)" stopOpacity="0.5" />
            <stop offset="42%" stopColor="var(--sage)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--sage)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* soft core glow */}
        <circle r="120" fill="url(#hv-core)" className="hv-breathe" />

        {/* orbit rings */}
        <circle r="60" className="hv-ring" />
        <circle r="102" className="hv-ring" strokeDasharray="1.5 7" />
        <circle r="146" className="hv-ring" />

        {/* center node */}
        <circle r="7" className="hv-node hv-pulse" style={{ color: "var(--ink)" }} fill="currentColor" />

        {/* orbiting nodes (each group rotates around the view-box centre) */}
        <g className="hv-spin hv-s1"><circle cx="60" cy="0" r="5" className="hv-node" style={{ color: "var(--sage)" }} fill="currentColor" /></g>
        <g className="hv-spin hv-s2"><circle cx="102" cy="0" r="6.5" className="hv-node" style={{ color: "var(--sky)" }} fill="currentColor" /></g>
        <g className="hv-spin hv-s2b"><circle cx="102" cy="0" r="3.5" className="hv-node" style={{ color: "var(--amber)" }} fill="currentColor" /></g>
        <g className="hv-spin hv-s3"><circle cx="146" cy="0" r="4.5" className="hv-node" style={{ color: "var(--clay)" }} fill="currentColor" /></g>
        <g className="hv-spin hv-s3b"><circle cx="146" cy="0" r="3" className="hv-node" style={{ color: "var(--sage)" }} fill="currentColor" /></g>

        <style>{`
          .hero-orbits {
            position: absolute; right: -3vw; top: 52%; transform: translateY(-50%);
            width: min(48vw, 580px); aspect-ratio: 1; pointer-events: none; z-index: 1;
          }
          .hv-ring { fill: none; stroke: var(--ink); stroke-opacity: .10; stroke-width: 1; }
          .hv-node { filter: drop-shadow(0 0 7px currentColor) drop-shadow(0 0 2px currentColor); }
          .hv-spin { transform-box: view-box; transform-origin: center; animation: hv-spin var(--dur, 30s) linear infinite; }
          .hv-s1  { --dur: 26s; }
          .hv-s2  { --dur: 34s; animation-direction: reverse; }
          .hv-s2b { --dur: 46s; }
          .hv-s3  { --dur: 40s; }
          .hv-s3b { --dur: 54s; animation-direction: reverse; }
          @keyframes hv-spin { to { transform: rotate(360deg); } }
          .hv-breathe { transform-box: view-box; transform-origin: center; animation: hv-breathe 8s ease-in-out infinite; }
          @keyframes hv-breathe { 0%,100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.06); opacity: 1; } }
          .hv-pulse { transform-box: view-box; transform-origin: center; animation: hv-pulse 3.4s ease-in-out infinite; }
          @keyframes hv-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.18); } }
          @media (prefers-reduced-motion: reduce) {
            .hv-spin, .hv-breathe, .hv-pulse { animation: none; }
          }
          @media (max-width: 1023px) { .hero-orbits { display: none; } }
        `}</style>
      </svg>
    </div>
  );
}
