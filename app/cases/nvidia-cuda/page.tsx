"use client";

// A prototype "living case" — an interactive, drill-down case study grounded in
// real public sources and real video. Self-contained (no auth, no DB): this is
// the smallest lovable version of the case reader, to feel the format.

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

/* ---------- small building blocks ---------- */

function Video({ id, title }: { id: string; title: string }) {
  return (
    <figure className="my-6">
      <div className="relative w-full overflow-hidden rounded-xl border border-line bg-black" style={{ paddingBottom: "56.25%" }}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
      <figcaption className="mt-2 text-xs text-slate-400">▶ {title} · YouTube</figcaption>
    </figure>
  );
}

function Src({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-sky underline decoration-sky/30 underline-offset-2 hover:decoration-sky">
      {children}
    </a>
  );
}

function Deeper({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-5 overflow-hidden rounded-xl border border-line bg-mist/40">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-mist"
        aria-expanded={open}
      >
        <span className={"grid h-6 w-6 flex-none place-items-center rounded-full bg-ink text-white transition-transform " + (open ? "rotate-45" : "")}>+</span>
        <span className="text-sm font-semibold text-ink">Go deeper — {label}</span>
        <span className="ml-auto font-mono text-[11px] uppercase tracking-wide text-slate-400">{open ? "close" : "expand"}</span>
      </button>
      {open && <div className="border-t border-line px-5 py-4 text-[15px] leading-relaxed text-slate2">{children}</div>}
    </div>
  );
}

function Beat({ n, kicker, title }: { n: string; kicker: string; title: string }) {
  return (
    <div className="mb-4 mt-14">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-sage-soft font-serif text-lg font-bold text-sage">{n}</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-slate-400">{kicker}</span>
      </div>
      <h2 className="mt-3 text-[26px] font-bold leading-tight tracking-tight text-ink">{title}</h2>
    </div>
  );
}

/* ---------- the arc exhibit (illustrative SVG) ---------- */
function ArcExhibit() {
  const pts = [
    { x: 6, y: 88, label: "1993", note: "Founded. Nearly dies, repeatedly." },
    { x: 20, y: 80, label: "1999", note: "Coins the “GPU.”" },
    { x: 36, y: 72, label: "2006", note: "CUDA. The bet." },
    { x: 52, y: 58, label: "2012", note: "AlexNet — on 2 GPUs." },
    { x: 68, y: 40, label: "2016", note: "Deep-learning boom." },
    { x: 82, y: 20, label: "2023", note: "Crosses $1T." },
    { x: 95, y: 6, label: "2024+", note: "Multi-trillion." },
  ];
  const path = pts.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  const [hover, setHover] = useState<number | null>(2);
  return (
    <div className="my-6 rounded-xl border border-line bg-white p-5">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-slate-400">Exhibit · the arc of the bet <span className="text-slate-300">(illustrative, not to scale)</span></div>
      <div className="relative">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-44 w-full">
          <defs>
            <linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="var(--sage)" stopOpacity="0.15" />
              <stop offset="1" stopColor="var(--sage)" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <path d={`${path} L 95 100 L 6 100 Z`} fill="url(#g)" />
          <path d={path} fill="none" stroke="var(--sage)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={hover === i ? 2.6 : 1.8} fill={hover === i ? "var(--ink)" : "var(--sage)"}
              vectorEffect="non-scaling-stroke" style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover(i)} />
          ))}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {pts.map((p, i) => (
          <button key={i} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}
            className={"rounded-full px-2.5 py-1 font-mono text-[11px] transition " + (hover === i ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>
            {p.label}
          </button>
        ))}
      </div>
      {hover != null && <p className="mt-2 text-sm text-slate2"><b className="text-ink">{pts[hover].label}</b> — {pts[hover].note}</p>}
    </div>
  );
}

/* ---------- commit-your-call gate ---------- */
const OPTIONS = [
  { k: "bet", label: "Bet the company", blurb: "Make every GPU CUDA-capable. Eat the margin hit. Evangelize developers for a market that doesn't exist yet." },
  { k: "hedge", label: "Hedge it", blurb: "Ship CUDA on a niche professional line only. Protect the gaming margins that pay the bills." },
  { k: "focus", label: "Stay focused", blurb: "Double down on graphics, where you're already winning. General-purpose GPU computing is a science project." },
];

function Commit({ onCommit, committed }: { onCommit: (k: string, c: number) => void; committed: { k: string; c: number } | null }) {
  const [k, setK] = useState<string>(committed?.k || "");
  const [c, setC] = useState<number>(committed?.c ?? 60);
  if (committed) {
    const chosen = OPTIONS.find((o) => o.k === committed.k);
    return (
      <div className="my-6 rounded-2xl border border-sage/40 bg-sage-soft/50 p-5">
        <div className="font-mono text-[11px] uppercase tracking-wide text-sage">Your call is on record</div>
        <p className="mt-2 text-lg font-semibold text-ink">{chosen?.label} <span className="text-sm font-normal text-slate2">· {committed.c}% confident</span></p>
        <p className="mt-1 text-sm text-slate2">Now scroll on — the reveal is unlocked. In the full living case, an AI Jensen would spend the next ten minutes pressuring exactly this decision.</p>
      </div>
    );
  }
  return (
    <div className="my-6 rounded-2xl border-2 border-ink/10 bg-white p-5 shadow-sm">
      <div className="font-mono text-[11px] uppercase tracking-wide text-clay">◆ Make the call before you read on</div>
      <h3 className="mt-2 text-xl font-bold text-ink">It's 2006. You're Jensen. What do you do?</h3>
      <p className="mt-1 text-sm text-slate2">No fence-sitting — go on record under real uncertainty, the way the job demands. This unlocks what actually happened.</p>
      <div className="mt-4 space-y-2">
        {OPTIONS.map((o) => (
          <button key={o.k} onClick={() => setK(o.k)}
            className={"block w-full rounded-xl border p-3 text-left transition " + (k === o.k ? "border-ink bg-mist" : "border-line hover:border-slate-300")}>
            <div className="font-semibold text-ink">{o.label}</div>
            <div className="mt-0.5 text-sm text-slate2">{o.blurb}</div>
          </button>
        ))}
      </div>
      <div className="mt-4">
        <label className="lbl flex items-center justify-between">Confidence <span className="font-mono text-sm text-ink">{c}%</span></label>
        <input type="range" min={50} max={100} value={c} onChange={(e) => setC(Number(e.target.value))} className="mt-1 w-full accent-sage" />
      </div>
      <button disabled={!k} onClick={() => onCommit(k, c)} className="btn-primary mt-4 w-full disabled:opacity-40">
        {k ? "Commit my call & reveal what happened" : "Pick an option first"}
      </button>
    </div>
  );
}

/* ---------- interrogate teaser ---------- */
function Interrogate() {
  const qa = [
    { q: "Gross margins are getting hit and CUDA has almost no revenue. Why should the board keep funding it?", a: "Because we're not selling chips, we're building an installed base of developers. Every GPU we ship is a computer we can program. The revenue follows the developers, and the developers follow the tools." },
    { q: "That's a story. What's the number that proves it isn't just a science project?", a: "Ask me a different way — what would have to be true for it to be a science project? No one building anything real on it. Go look at the university labs." },
  ];
  return (
    <div className="my-6 rounded-2xl border border-line bg-mist/40 p-5">
      <div className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Preview · in the living case, you interrogate the protagonist</div>
      <div className="mt-3 space-y-3">
        {qa.map((x, i) => (
          <div key={i} className="space-y-2">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-3.5 py-2 text-sm text-white">{x.q}</div>
            <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm text-slate2 shadow-sm"><b className="text-ink">AI Jensen · </b>{x.a}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 opacity-60">
        <input disabled placeholder="Ask a harder question…" className="field flex-1" />
        <button disabled className="btn-ghost">Ask</button>
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">He concedes to a sharp question and spins a vague one — and never tells you if the bet works. (Live in the full module.)</p>
    </div>
  );
}

/* ---------- page ---------- */
export default function NvidiaCudaCase() {
  const [progress, setProgress] = useState(0);
  const [committed, setCommitted] = useState<{ k: string; c: number } | null>(null);
  const [teaching, setTeaching] = useState(false);
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const s = localStorage.getItem("case:nvidia-cuda:call"); if (s) setCommitted(JSON.parse(s)); } catch {}
  }, []);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const commit = (k: string, c: number) => {
    const v = { k, c };
    setCommitted(v);
    try { localStorage.setItem("case:nvidia-cuda:call", JSON.stringify(v)); } catch {}
    setTimeout(() => revealRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };

  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* progress + toolbar */}
      <div className="fixed inset-x-0 top-0 z-30 h-1 bg-transparent">
        <div className="h-full bg-sage transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>
      <div className="sticky top-0 z-20 border-b border-line/70 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-2.5">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Superadditive</Link>
          <span className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Living Case · prototype</span>
          <button onClick={() => setTeaching((t) => !t)} className={"rounded-full px-3 py-1 text-xs font-semibold transition " + (teaching ? "bg-clay text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>
            {teaching ? "Teaching notes on" : "Teaching notes"}
          </button>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-5 pb-24">
        {/* hero */}
        <header className="pt-12">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-clay">Strategy · platform bets · timing</div>
          <h1 className="mt-3 font-serif text-[clamp(2rem,6vw,3.1rem)] font-bold leading-[1.08] tracking-tight text-ink">
            The bet on a market that didn't exist.
          </h1>
          <p className="mt-4 text-lg text-slate2">
            It's 2006. NVIDIA sells graphics chips to gamers and has nearly gone bankrupt more than once. Jensen Huang wants to spend the company's scarce R&D making its GPUs <em>programmable for general computing</em> — a market with almost no customers, no revenue, and a real cost to the margins that keep the lights on. Do you back him?
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[12px] text-slate-400">
            <span>PROTAGONIST · Jensen Huang, CEO</span>
            <span>DECISION · fund CUDA, or don't</span>
            <span>~10 min · 8 sources · 3 videos</span>
          </div>
          {teaching && <TeachNote>Teach this as a <b>real-options / platform-timing</b> case: the value isn't in 2006 cash flows, it's in the option CUDA creates on a future that hasn't arrived. Ask students to price optionality under deep uncertainty — and to notice that the "rational" DCF says no.</TeachNote>}
        </header>

        <Video id="pcuwZ8zk2ng" title="Jensen Huang tells the NVIDIA story (full interview)" />

        {/* Act 1 */}
        <Beat n="1" kicker="the situation · 2006" title="A gaming company that keeps almost dying." />
        <p className="text-[17px] leading-relaxed text-ink/90">
          NVIDIA invented the modern graphics chip — it coined the term “GPU” with the GeForce 256 in 1999 — and it lives and dies on the gaming cycle. Jensen has said for decades the company is always “<Src href="https://guyraz.substack.com/p/how-jensen-huang-built-the-most-valuable">thirty days from going out of business</Src>.” Its GPUs are, secretly, massively parallel processors: hundreds of little cores doing the same math at once to shade pixels. A handful of researchers have noticed you could use that horsepower for <em>non-graphics</em> math — but only by disguising their problem as a graphics operation in OpenGL. It's brutal, and almost no one does it.
        </p>
        <Deeper label="why a GPU is secretly a supercomputer">
          A CPU has a few powerful cores optimized for doing one complicated thing quickly. A GPU has thousands of simple cores optimized for doing the <em>same</em> simple thing to a lot of data at once — exactly the shape of rendering millions of pixels, and, it turns out, of multiplying the giant matrices underneath machine learning. In 2003, a Stanford project called <Src href="https://www.infoworld.com/article/2256401/what-is-cuda-parallel-programming-for-gpus.html">Brook</Src>, led by Ian Buck, first extended C with data-parallel constructs so you could program the GPU directly. Buck joined NVIDIA and led what became CUDA.
        </Deeper>

        {/* Act 2 */}
        <Beat n="2" kicker="the bet · CUDA" title="Make every chip a computer you can program." />
        <p className="text-[17px] leading-relaxed text-ink/90">
          The proposal on the table in 2006: launch <b>CUDA</b> — “Compute Unified Device Architecture” — and a new chip, the <Src href="https://developer.nvidia.com/blog/cuda-refresher-reviewing-the-origins-of-gpu-computing/">G80</Src>, whose 128 shader cores are unified into one programmable array. Ship it not just on a niche professional card but across the line, so that <em>every</em> NVIDIA GPU a developer can buy is also a parallel computer they can program in plain C. The catch: that programmability costs die area, costs margin, and serves a market — scientific and general-purpose GPU computing — that in 2006 is essentially research labs. Wall Street will ask why gaming-chip gross margins are subsidizing a customer base that doesn't exist yet.
        </p>
        <ArcExhibit />
        <Deeper label="the real cost of the bet">
          For years CUDA was a line item that added cost and returned little revenue. NVIDIA effectively taxed its profitable gaming business to build compilers, libraries, documentation, and a developer-education machine for an application nobody was buying at scale. The strategic wager wasn't “GPUs will sell” — it was “if we make the tools free and ubiquitous, developers will invent the demand.” That's a platform bet: spend now to own the standard later. Read <Src href="https://www.modular.com/blog/democratizing-compute-part-2-what-exactly-is-cuda">Modular's breakdown of what CUDA actually is</Src> for how deep that moat eventually became.
        </Deeper>
        {teaching && <TeachNote>Force the DCF here. On 2006 numbers, CUDA is negative NPV. The case is a clinic in why judgment beats the model when the whole value is optionality on a nonexistent market. Good students will reach for real-options language unprompted; great ones will ask what evidence would <em>update</em> the bet.</TeachNote>}

        {/* Act 3: commit gate */}
        <Beat n="3" kicker="your move" title="Commit, before you know." />
        <p className="text-[17px] leading-relaxed text-ink/90">
          You've seen what a Harvard case gives you here: an epilogue. This one makes you decide first. Go on record — then the reveal unlocks, and you'll read the rest knowing whether you'd have made the call that built one of the most valuable companies on earth.
        </p>
        <Commit onCommit={commit} committed={committed} />

        {/* Reveal (gated) */}
        <div ref={revealRef}>
          {!committed ? (
            <div className="my-10 rounded-2xl border border-dashed border-line bg-mist/40 p-8 text-center">
              <p className="font-serif text-xl font-bold text-ink">What actually happened is locked. 🔒</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate2">Make your call above to unlock the reveal. (No peeking — the whole point is to commit under uncertainty, like the job does.)</p>
            </div>
          ) : (
            <>
              <Beat n="4" kicker="the reveal · 2012" title="Two GPUs win an image contest, and the world tilts." />
              <p className="text-[17px] leading-relaxed text-ink/90">
                For six years CUDA looked like an expensive hobby. Then in 2012, three researchers — Alex Krizhevsky, Ilya Sutskever, and Geoffrey Hinton — trained a deep neural network called <b>AlexNet</b> on two consumer NVIDIA GPUs and demolished the field at the ImageNet contest. Deep learning was suddenly, undeniably real — and it ran on CUDA, because CUDA was the only mature way to program a GPU. Every AI lab that followed was, by default, an NVIDIA customer. The hobby became the franchise.
              </p>
              <Video id="lQHK61IDFH4" title="Jensen Huang, NVIDIA GTC keynote — CUDA and accelerated computing" />
              <p className="text-[17px] leading-relaxed text-ink/90">
                By 2016 the data-center business was NVIDIA's growth engine; by 2023 the company crossed a <Src href="https://www.generativevalue.com/p/nvidia-past-present-and-future">trillion dollars</Src> in market value, and then several trillion, as the AI boom made its chips the scarcest resource in technology. The 2006 decision to tax gaming margins for a market that didn't exist turned out to be the option that owned the next era of computing. Jensen tells the whole arc in his own words on <Src href="https://www.acquired.fm/episodes/jensen-huang">Acquired</Src> and, on the strategy of accelerated computing, with <Src href="https://stratechery.com/2026/an-interview-with-nvidia-ceo-jensen-huang-about-accelerated-computing/">Stratechery</Src>.
              </p>
              <Deeper label="the uncomfortable part — was it skill or luck?">
                The honest case doesn't let you off easy. NVIDIA did not know AlexNet was coming; the deep-learning explosion was not the specific bet. What Jensen bet on was that <em>parallel, programmable compute would find valuable uses if the tools were ubiquitous</em> — and then positioned to catch whatever emerged. That's the real teachable skill: not predicting the future, but building the option that pays off across many futures, and being patient (and solvent) enough to hold it. Ask yourself: would your 2006 call have survived six years of Wall Street asking why?
              </Deeper>
              {teaching && <TeachNote>The best discussion lives in the counterfactual: strip out AlexNet and the bet still looks wise <em>ex ante</em> if you frame it as buying optionality cheaply and holding it. Push students who say “great call” to separate the process from the outcome — that's the whole point.</TeachNote>}

              <Beat n="5" kicker="the living case" title="Now imagine you could have pushed him on it." />
              <p className="text-[17px] leading-relaxed text-ink/90">
                A document can only tell you what happened. The version of this case we're building lets you <em>interrogate</em> the protagonist under a hidden truth, <em>query</em> the real financials in a console, and watch your decision <em>play forward</em> against the market — graded on the quality of your judgment, not your memory. Here's a taste of the first part:
              </p>
              <Interrogate />
              <div className="my-8 rounded-2xl bg-ink p-6 text-paper">
                <div className="font-mono text-[11px] uppercase tracking-wide" style={{ color: "var(--sage)" }}>What you just experienced</div>
                <p className="mt-2 text-lg font-semibold">A case you read <em>into</em>, not just through.</p>
                <p className="mt-1 text-sm" style={{ color: "#C9C6CE" }}>Real video, real sources, drill-downs where you wanted them, and a decision you had to own before the answer was revealed. That's the floor. The interrogation, the data console, and the consequence engine are the ceiling.</p>
              </div>
            </>
          )}
        </div>

        {/* sources */}
        <section className="mt-14 border-t border-line pt-6">
          <div className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Sources</div>
          <ul className="mt-3 grid gap-1.5 text-sm text-slate2 sm:grid-cols-2">
            <li>· <Src href="https://developer.nvidia.com/blog/cuda-refresher-reviewing-the-origins-of-gpu-computing/">NVIDIA — Origins of GPU computing</Src></li>
            <li>· <Src href="https://www.infoworld.com/article/2256401/what-is-cuda-parallel-programming-for-gpus.html">InfoWorld — What is CUDA</Src></li>
            <li>· <Src href="https://www.acquired.fm/episodes/jensen-huang">Acquired — Jensen Huang</Src></li>
            <li>· <Src href="https://stratechery.com/2026/an-interview-with-nvidia-ceo-jensen-huang-about-accelerated-computing/">Stratechery — Accelerated computing interview</Src></li>
            <li>· <Src href="https://www.generativevalue.com/p/nvidia-past-present-and-future">Generative Value — NVIDIA past/present/future</Src></li>
            <li>· <Src href="https://guyraz.substack.com/p/how-jensen-huang-built-the-most-valuable">How I Built This — near collapse</Src></li>
            <li>· <Src href="https://www.modular.com/blog/democratizing-compute-part-2-what-exactly-is-cuda">Modular — What exactly is CUDA</Src></li>
            <li>· <Src href="https://www.jonpeddie.com/news/part-iii-the-evolution-to-ai-gpus/">Jon Peddie — Evolution to AI GPUs</Src></li>
          </ul>
          <p className="mt-5 text-xs text-slate-400">Prototype of the “living case” reader · built for discussion, not published as a teaching case · facts drawn from the public sources above.</p>
        </section>
      </article>
    </main>
  );
}

function TeachNote({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 rounded-xl border border-clay/30 bg-clay/5 p-4">
      <div className="font-mono text-[11px] uppercase tracking-wide text-clay">✎ Teaching note</div>
      <p className="mt-1.5 text-[15px] leading-relaxed text-slate2">{children}</p>
    </div>
  );
}
