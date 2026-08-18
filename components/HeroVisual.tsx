// A small, light network mark for "superadditive": a constellation of nodes in
// the brand palette, with glints of information shooting outward along the edges
// — a hub sharing signal through the network. Pure SVG + CSS (offset-path pulses),
// all light and thin; hidden below lg and frozen for prefers-reduced-motion.

const NODES = [
  { x: 150, y: 128, r: 5, c: "var(--sky)" }, // hub
  { x: 58, y: 64, r: 3.5, c: "var(--sage)" },
  { x: 246, y: 58, r: 3.5, c: "var(--amber)" },
  { x: 272, y: 150, r: 3, c: "var(--sage)" },
  { x: 206, y: 214, r: 3.5, c: "var(--sky)" },
  { x: 86, y: 206, r: 3, c: "var(--amber)" },
  { x: 36, y: 146, r: 3, c: "var(--clay)" },
];

const EDGES = [
  "M150 128 L58 64",
  "M150 128 L246 58",
  "M150 128 L272 150",
  "M150 128 L206 214",
  "M150 128 L86 206",
  "M150 128 L36 146",
  "M58 64 L246 58",
  "M206 214 L86 206",
  "M58 64 L36 146",
];

// Glints of "information" travelling the edges — mostly outward from the hub,
// staggered so signal ripples through the network.
const PULSES = [
  { d: "M150 128 L58 64", c: "var(--sage)", dur: 2.2, delay: 0 },
  { d: "M150 128 L272 150", c: "var(--sage)", dur: 2.4, delay: 0.6 },
  { d: "M150 128 L206 214", c: "var(--sky)", dur: 2.3, delay: 1.1 },
  { d: "M150 128 L36 146", c: "var(--clay)", dur: 2.5, delay: 0.3 },
  { d: "M150 128 L246 58", c: "var(--amber)", dur: 2.2, delay: 1.5 },
  { d: "M58 64 L246 58", c: "var(--amber)", dur: 2.7, delay: 0.9 },
  { d: "M206 214 L86 206", c: "var(--sky)", dur: 2.7, delay: 1.8 },
];

export default function HeroVisual() {
  return (
    <div className="hero-net" aria-hidden>
      <svg viewBox="0 0 300 260" className="h-full w-full" fill="none">
        {/* edges */}
        {EDGES.map((d, i) => (
          <path key={i} d={d} className="hn-edge" />
        ))}

        {/* nodes */}
        {NODES.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r} className="hn-node" style={{ color: n.c, animationDelay: `${(i % 5) * 0.6}s` }} fill="currentColor" />
        ))}

        {/* travelling glints of information */}
        {PULSES.map((p, i) => (
          <circle
            key={i}
            r={2.6}
            className="hn-pulse"
            style={{ color: p.c, offsetPath: `path("${p.d}")`, ["--dur" as any]: `${p.dur}s`, ["--delay" as any]: `${p.delay}s` }}
            fill="currentColor"
          />
        ))}

        <style>{`
          .hero-net {
            position: absolute; right: 0; top: 52%; transform: translateY(-50%);
            width: min(38vw, 470px); aspect-ratio: 300 / 260; pointer-events: none; z-index: 1;
          }
          .hn-edge { fill: none; stroke: var(--ink); stroke-opacity: .10; stroke-width: 1; }
          .hn-node { filter: drop-shadow(0 0 5px currentColor); animation: hn-node 4s ease-in-out infinite; }
          @keyframes hn-node { 0%,100% { opacity: .82; } 50% { opacity: 1; } }
          .hn-pulse {
            offset-rotate: 0deg; filter: drop-shadow(0 0 7px currentColor) drop-shadow(0 0 2px currentColor);
            animation: hn-flow var(--dur, 2.4s) ease-in-out infinite; animation-delay: var(--delay, 0s);
          }
          @keyframes hn-flow { 0% { offset-distance: 0%; opacity: 0; } 12% { opacity: 1; } 82% { opacity: 1; } 100% { offset-distance: 100%; opacity: 0; } }
          @media (prefers-reduced-motion: reduce) { .hn-pulse { display: none; } .hn-node { animation: none; } }
          @media (max-width: 1023px) { .hero-net { display: none; } }
        `}</style>
      </svg>
    </div>
  );
}
